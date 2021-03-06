#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const cpdir = require('./utils/cpdir')

program
	.option('-s, --source <path>', 'folder to copy recursively')
	.option('-o, --output <path>', 'destination folder')

program.parse(process.argv)

const SOURCE = program.source
const OUTPUT = program.output

const copyDir = async () => {
	// await rimraf(path.resolve(OUTPUT))
	await cpdir(path.resolve(SOURCE), path.resolve(OUTPUT))
}

copyDir()

process.on('unhandledRejection', (error) => {
	console.log('Unhandled Rejection at:', error.stack)
	process.exit(error.code || 1)
})
