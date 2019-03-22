#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const package = require('./commands/package')

program
	.option('-s, --source <path>', 'bundled application folder')
	.option('-o, --output <path>', 'packaged app ouput folder')
	.option('-p, --platform <platform>', 'Specify the platform')
	.option('-a, --architecture <architecture>', 'Specify the architecture')

program.parse(process.argv)

const SOURCE = program.source || './dist/bundle'
const OUTPUT = program.output || './dist'
const PLATFORM = program.platform || process.platform
const ARCHITECTURE = program.architecture || process.arch

package(path.resolve(SOURCE), path.resolve(OUTPUT), PLATFORM, ARCHITECTURE)
