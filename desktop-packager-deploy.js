#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const deploy = require('./commands/deploy')

program
	.option('-f, --folder <path>', 'folder to deploy recursively')
	.option('-c, --config <file>', 'deploy configuration file')

program.parse(process.argv)

const FOLDER = program.folder || './dist'
const CONFIG = program.config

deploy(path.resolve(FOLDER), path.resolve(CONFIG))
