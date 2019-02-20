#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const rimraf = require('./utils/rimraf')
const cpdir = require('./utils/cpdir')

program
	.option('-s, --source <path>', 'folder to copy recursively')
	.option('-d, --dest <path>', 'destination')

program.parse(process.argv)

const SOURCE = program.source
const OUTPUT = program.outout

const copyDir = async () => {
	// await rimraf(path.resolve(OUTPUT))
	await cpdir(path.resolve(SOURCE), path.resolve(OUTPUT))
}

copyDir()
