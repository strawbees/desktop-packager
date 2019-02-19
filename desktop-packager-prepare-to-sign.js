#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const rimraf = require('./utils/rimraf')
const bundle = require('./commands/bundle')
const package = require('./commands/package')

program
	.option('-s, --source <path>', 'application source code folder')
	.option('-o, --output <path>', 'Build files ouput folder')
	.option('-p, --platform <platform>', 'Specify the platform')
	.option('-a, --architecture <architecture>', 'Specify the architecture')

program.parse(process.argv)

const SOURCE = program.source || path.resolve('./', 'src')
const OUTPUT = program.outout || path.resolve('./', 'dist')
const PLATFORM = program.platform || process.platform
const ARCHITECTURE = program.architecture || process.arch

const prepareToSign = async () => {
	await rimraf(path.resolve(OUTPUT, PLATFORM, ARCHITECTURE))
	await bundle(SOURCE, OUTPUT, PLATFORM, ARCHITECTURE)
	await package(SOURCE, OUTPUT, PLATFORM, ARCHITECTURE)
}

prepareToSign()
