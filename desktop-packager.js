#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const pkg = require('./package.json')


program
	.description('Packages NWJS application')
	.version(pkg.version, '-v, --version')
	.option('-s, --source <path>', 'application source code folder')
	.option('-o, --output <path>', 'build files ouput folder')
	.option('-p, --platform <platform>', 'Specify the platform')
	.option('-a, --architecture <architecture>', 'Specify the architecture')

program
	.command('bundle', 'bundles NWJS source code')
	.command('deploy', 'deploy packaged app')
	.command('package', 'packages bundled NWJS source code')
	.command('sign', 'sign binaries')
	.command('prepare-to-sign', 'bundles and packages the app', {isDefault: true})

program.parse(process.argv)
