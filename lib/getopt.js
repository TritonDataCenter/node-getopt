/*
 * getopt.js: node.js implementation of POSIX getopt() (and then some)
 *
 * Copyright 2011 David Pacheco. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE. 
 */

/*
 * TODO:
 *	o In -rfoo, if "r" takes an arg, "foo" is supposed to be its value
 *	o All options precede operands, so we should stop when we see something
 *	  that's not an option
 *	o '-' vs. '--' as end-of-options?
 *	o validate non-alphanumerics?
 *	o implement silent vs. non-silent
 *	o need to export optind, or something that tells you where the end of
 *	  options were.  XXX Did I document this already?
 *	o -l -r, if -l takes an argument, -r is the value?  See 
 *	  http://pubs.opengroup.org/onlinepubs/009695399/functions/getopt.html
 *	  bullet point 1
 *	o return ':' for missing option-argument (or '?', based on silent)
 *	o opterr redundant with leading :
 *	o getopt test is very incomplete
 * See http://pubs.opengroup.org/onlinepubs/009695399/basedefs/xbd_chap12.html
 * See http://pubs.opengroup.org/onlinepubs/009695399/utilities/getopts.html
 */

var ASSERT = require('assert').ok;

function goError(msg)
{
	return (new Error('getopt: ' + msg));
};

/*
 * The BasicParser is our primary interface to the outside world.  The
 * documentation for this object and its public methods is contained in
 * the included README.md.
 */
function goBasicParser(optstring, argv, opterr)
{
	var ii;

	ASSERT(optstring || optstring === '', "optstring is required");
	ASSERT(optstring.constructor === String, "optstring must be a string");
	ASSERT(argv, "argv is required");
	ASSERT(argv.constructor === Array, "argv must be an array");

	this.gop_argv = new Array(argv.length);
	this.gop_opterr = opterr === true;
	this.gop_tokens = [];
	this.gop_options = {};
	this.gop_aliases = {};

	for (ii = 0; ii < argv.length; ii++) {
		ASSERT(argv[ii].constructor === String,
		    "argv must be string array");
		this.gop_argv[ii] = argv[ii];
	}

	this.parseOptstr(optstring);
	this.tokenizeArguments();
}

exports.BasicParser = goBasicParser;

/*
 * Parse the option string and update the following fields:
 *
 *	gop_silent	Whether to log errors to stderr.  Silent mode is
 *			indicated by a leading ':' in the option string.
 *
 *	gop_options	Maps valid single-letter-options to booleans indicating
 *			whether each option is required.
 *
 *	gop_aliases	Maps valid long options to the corresponding
 *			single-letter short option.
 */
goBasicParser.prototype.parseOptstr = function (optstr)
{
	var chr, cp, alias, arg, ii;

	ii = 0;
	if (optstr.length > 0 && optstr[0] == ':') {
		this.gop_silent = true;
		ii++;
	} else {
		this.gop_silent = false;
	}

	while (ii < optstr.length) {
		chr = optstr[ii];
		arg = false;

		if (ii + 1 < optstr.length && optstr[ii + 1] == ':') {
			arg = true;
			ii++;
		}

		this.gop_options[chr] = arg;

		while (ii + 1 < optstr.length && optstr[ii + 1] == '(') {
			ii++;
			cp = optstr.indexOf(')', ii + 1);
			if (cp == -1)
				throw (goError('invalid optstring: missing ' +
				    '")" to match "(" at char ' + ii));

			alias = optstr.substring(ii + 1, cp);
			this.gop_aliases[alias] = chr;
			ii = cp;
		}

		ii++;
	}
};

/*
 * For simplicity, we tokenize the argument list when the parser is first
 * constructed and then examine the tokens when the user asks for arguments.
 * This technically exposes a slightly different interface than traditional
 * getopt(), which exposed the parser's current location in the argument list as
 * an interface during argument processing.
 */
goBasicParser.prototype.tokenizeArguments = function ()
{
	var ii, jj;

	for (ii = 0; ii < this.gop_argv.length; ii++) {
		if (!this.tokenizeOneArg(this.gop_argv[ii]))
			break;
	}
};

goBasicParser.prototype.tokenizeOneArg = function (arg)
{
	var eq, ii;

	if (arg.length === 0 || arg[0] != '-') {
		/* either a value or an ignored argument */
		this.gop_tokens.push({ type: 'ign-value', value: arg });
		return (true);
	}

	if (arg.length == 1) {
		/* end of options */
		ASSERT(arg == '-');
		return (false);
	}

	if (arg[1] != '-') {
		/* short option form. */
		for (ii = 1; ii < arg.length; ii++)
			this.gop_tokens.push(
			    { type: 'short-option', value: arg[ii] });

		return (true);
	}

	/* long option form (e.g., --recurse) */
	arg = arg.substring(2);
	eq = arg.indexOf('=');

	if (eq == -1) {
		this.gop_tokens.push({ type: 'long-option', value: arg });
	} else {
		this.gop_tokens.push(
		    { type: 'long-option', value: arg.substring(0, eq) },
		    { type: 'value', value: arg.substring(eq + 1) }
		);
	}

	return (true);
};

/*
 * Returns the next option-argument.  See README.md for details.
 */
goBasicParser.prototype.getopt = function ()
{
	var token, optchr, hasarg;

	if (this.gop_tokens.length === 0)
		return (undefined);

	token = this.gop_tokens.shift();
	if (token['type'] == 'ign-value') {
		/*
		 * If we see a non-option argument that's not associated with a
		 * previous option argument, just skip it.
		 */
		return (this.getopt());
	}

	if (token['type'] == 'long-option') {
		if (!(token['value'] in this.gop_aliases))
			return ({ option: '?', optopt: token['value'] });

		optchr = this.gop_aliases[token['value']];
		ASSERT(optchr in this.gop_options);
	} else {
		ASSERT(token['type'] == 'short-option');
		optchr = token['value'];

		if (!(optchr in this.gop_options))
			return ({ option: '?', optopt: optchr });
	}

	hasarg = this.gop_options[optchr];
	if (!hasarg || this.gop_tokens.length === 0 ||
	    (this.gop_tokens[0]['type'] != 'value' &&
	    this.gop_tokens[0]['type'] != 'ign-value'))
		return ({ option: optchr });

	token = this.gop_tokens.shift();
	return ({ option: optchr, optarg: token['value'] });
};
