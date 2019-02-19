#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const pkg = require('./package.json')

program
	.description(`Packages NWJS application.`)
	.version(pkg.version, '-v, --version')

program
	.command('bundle', 'bundles NWJS source code')
	.command('deploy', 'deploy packaged app')
	.command('package', 'packages bundled NWJS source code')
	.command('sign', 'sign binaries')
	.command('prepare-to-sign', 'bundles and packages the app')

program.parse(process.argv)
