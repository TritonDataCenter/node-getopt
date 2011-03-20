
node-getopt
==============

Overview
--------

node-getopt is a Node.js module providing an interface to the POSIX-defined
getopt() function, a general-purpose command line parser that follows Utility
Syntax Guidelines 3, 4, 5, 6, 7, 9, and 10 in the Base Definitions volume of
IEEE Std 1003.1-2001.  Using these guidelines encourages common conventions
among applications, including:

  o short option names (e.g., "-r")
  o options with arguments (e.g., "-f filename or -ffilename")
  o chaining short option names when options have no arguments (e.g., "-ra")

This implementation mirrors the Solaris getopt() implementation and supports
long option names (e.g., "--recurse").

Unlike more "modern" option parsers, the POSIX getopt() interface supports using
the same option multiple times (e.g., "-vvv", commonly used to indicate level of
verbosity).


Status
------

This module is still under development and has several known issues where it
diverges from the standard.


Platforms
---------

This module should work on all platforms that support node.js.  The module is
tested on MacOS X 10.6.5 and OpenSolaris based on Illumos build 147.


Installation
------------

As an npm package, node-getopt is installed in the usual way:

      % npm install getopt


API
---

### `new getopt.BasicParser(optstring, argv)`

Instantiates a new object for parsing the specified arguments using the
specified option string.  This interface is closest to the traditional getopt()
C function.  Callers first instantiate a BasicParser and then invoke the
getopt() method to iterate the options as they would in C.  This interface
allows the same option to be specified multiple times.

The option string consists of an optional leading ":" (see below) followed by a
sequence of option-specifiers.  Each option-specifier consists of a single
character denoting the short option name, optionally followed by a colon if the
option takes an argument and/or a sequence of strings in parentheses
representing long-option aliases for the option name.

Example option strings:
	':r'		Command takes one option with no args: -r
	':ra'		Command takes two option with no args: -r and -a
	':raf:'		Command takes two option with no args: -r and -a
			and a single option that takes an arg: -f
	':f:(file)'	Command takes a single option with an argument: -f
			-f can also be specified as --file

The presence of a leading colon in the option string determines the behavior
when an argument is not specified for an option which takes an argument.  See
getopt() below.  Additionally, if no colon is specified, then error messages are
printed to stderr when invalid options or options with missing arguments are
encountered.


### `parser.optind()`

Returns the next argv-argument to be parsed.  When options are specified as
separate "argv" arguments, this value is incremented with each option parsed.
When multiple options are specified in the same argv-argument, the returned
value is unspecified.  This matches the variable "OPTIND" from the POSIX
standard, but is read-only.  This is most useful after parsing has finished to
examine the non-option arguments.


### `parser.getopt()`

Returns the next argument specified in "argv" (the object's constructor
argument).  The returned value is either undefined or an object with at least
the following members:

	option		single-character option name

The following members may also be present:

	optarg		argument value, if any

	optopt		option character that caused the error, if any

This function scans "argv" from the beginning or where the previous invocation
left off (whichever is later) and returns an object describing the next
argument based on the following cases:

    o If the end of command line arguments is reached, an undefined value is
      returned.  The end of arguments is signified by a single '-' argument, a
      single '--' argument, an argument that's neither an option nor a previous
      option's argument, the end of argv, or an error.

    o If an unrecognized command line option is found (i.e. an option character
      not defined in "optstring"), the returned object's "option" member
      is just "?".  "optopt" is set to the unrecognized option letter.

    o If a known command line option is found and the option takes no arguments
      then the returned object's "option" member is the option's short name
      (i.e.  the single character specifier in "optstring").
      
    o If a known command line option is found and that option takes an argument
      and the argument is also found, then the returned object's "option"
      member is the option's short name and the "optarg" member contains the
      argument's value.

    o If a known command line option is found and that option takes an argument
      but the argument is not found, then the returned object's "option" member
      is "?" unless the first character of "optstring" was a colon, in which
      case the "option" member is set to ":".  Either way, the "optopt" member
      is set to the option character that caused the error.


Examples
--------

### Example 1. Simple short options

        var mod_getopt = require('getopt')
        var parser, option;
        
        parser = new mod_getopt.BasicParser(':la', ['-l', '-a', 'stuff']);
        while ((option = parser.getopt()) !== undefined)
                console.log(option);

### Example 2. Invalid option specified


        var mod_getopt = require('getopt')
        var parser, option;
        
        parser = new mod_getopt.BasicParser(':la', ['-l', '-b', 'stuff']);
        while ((option = parser.getopt()) !== undefined)
                console.log(option);

### Example 3: Long options
        var mod_getopt = require('getopt')
        var parser, option;
        
        parser = new mod_getopt.BasicParser(':lar(recurse)', ['-l', '--recurse', 'stuff']);
        while ((option = parser.getopt()) !== undefined)
                console.log(option);

### Example 4: Options with arguments
        var mod_getopt = require('getopt')
        var parser, option;
        
        parser = new mod_getopt.BasicParser(':f:la', ['-l', '-f', 'filename', 'stuff']);
        while ((option = parser.getopt()) !== undefined)
                console.log(option);

### Example 5: Options with missing arguments
        var mod_getopt = require('getopt')
        var parser, option;
        
        parser = new mod_getopt.BasicParser(':f:la', ['-l', '-f', '-a' ]);
        while ((option = parser.getopt()) !== undefined)
                console.log(option);
