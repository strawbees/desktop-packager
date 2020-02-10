#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const sign = require('./commands/sign')

program
	.option('-s, --source <path>', 'bundled application folder')
	.option('-p, --platform <platform>', 'which platform to sign (win32 or darwin)')

program.parse(process.argv)

const SOURCE = program.source || './dist/bundle'
const PLATFORM = program.platform || process.platform

const init = async () => {
	try {
		sign(path.resolve(SOURCE), PLATFORM)
	} catch (e) {
		process.exit(e.code)
	}
}
init()
