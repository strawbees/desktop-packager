#!/usr/bin/env node
const program = require('commander')
const pkg = require('./package.json')

program
	.description('Packages NWJS application.')
	.version(pkg.version, '-v, --version')

program
	.command('bundle', 'bundles NWJS source code')
	.command('cpdir', 'copy folders recursively')
	.command('deploy', 'deploy packaged app')
	.command('package', 'packages bundled NWJS source code')
	.command('sign', 'sign binaries')

program.parse(process.argv)
