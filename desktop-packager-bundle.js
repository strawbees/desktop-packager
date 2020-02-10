#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const bundle = require('./commands/bundle')

program
	.option('-s, --source <path>', 'application source code folder')
	.option('-o, --output <path>', 'bundled files ouput folder')
	.option('-p, --platform <platform>', 'Specify the platform')
	.option('-a, --architecture <architecture>', 'Specify the architecture')

program.parse(process.argv)

const SOURCE = program.source || './src'
const OUTPUT = program.output || './dist'
const PLATFORM = program.platform || process.platform
const ARCHITECTURE = program.architecture || process.arch

const init = async () => {
	try {
		bundle(path.resolve(SOURCE), path.resolve(OUTPUT), PLATFORM, ARCHITECTURE)
	} catch (e) {
		process.exit(e.code)
	}
}
init()
