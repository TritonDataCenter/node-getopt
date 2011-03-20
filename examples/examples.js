var mod_getopt = require('getopt')
var parser, option;

console.log("Example 1: simple short options");
parser = new mod_getopt.BasicParser(':la', ['-l', '-a', 'stuff']);
while ((option = parser.getopt()) !== undefined)
	console.log(option);

console.log("Example 2: invalid option specified");
parser = new mod_getopt.BasicParser(':la', ['-l', '-b', 'stuff']);
while ((option = parser.getopt()) !== undefined)
	console.log(option);

console.log("Example 3: long options");
parser = new mod_getopt.BasicParser(':lar(recurse)', ['-l', '--recurse', 'stuff']);
while ((option = parser.getopt()) !== undefined)
	console.log(option);

console.log("Example 4: options with arguments");
parser = new mod_getopt.BasicParser(':f:la', ['-l', '-f', 'filename', 'stuff']);
while ((option = parser.getopt()) !== undefined)
	console.log(option);

console.log("Example 5: options with missing arguments");
parser = new mod_getopt.BasicParser(':f:la', ['-l', '-f', '-a' ]);
while ((option = parser.getopt()) !== undefined)
	console.log(option);
