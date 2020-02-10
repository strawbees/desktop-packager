#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const packageCommand = require('./commands/package')

program
	.option('-s, --source <path>', 'bundled application folder')
	.option('-o, --output <path>', 'packaged app ouput folder')
	.option('-p, --platform <platform>', 'Specify the platform')
	.option('-a, --architecture <architecture>', 'Specify the architecture')
	.option('-n, --notarize', 'If should send app for notarization')

program.parse(process.argv)

const SOURCE = program.source || './dist/bundle'
const OUTPUT = program.output || './dist'
const PLATFORM = program.platform || process.platform
const ARCHITECTURE = program.architecture || process.arch
const NOTARIZE = program.notarize

const init = async () => {
	try {
		packageCommand(path.resolve(SOURCE), path.resolve(OUTPUT), PLATFORM, ARCHITECTURE, NOTARIZE)
	} catch (e) {
		process.exit(e.code)
	}
}
init()
