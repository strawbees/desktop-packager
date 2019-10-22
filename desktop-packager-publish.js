#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const publish = require('./commands/publish')

program
	.option('-s, --source <path>', 'Directory containing all platform versions of the app.')
	.option('-o, --output <path>', 'Path on S3 Bucket (Prefix).')
	.option('-p, --platform <platform>', 'Specify the platform.')
	.option('-a, --architecture <architecture>', 'Specify the architecture.')

program.parse(process.argv)

const PLATFORM = program.platform || process.platform
const ARCHITECTURE = program.architecture || process.arch
const SOURCE = program.source || path.join('dist', 'versions')
const OUTPUT = program.output || 'destop-packager'

publish(path.resolve(SOURCE), OUTPUT, PLATFORM, ARCHITECTURE)
