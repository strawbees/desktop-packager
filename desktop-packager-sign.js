#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const sign = require('./commands/sign')

program
	.option('-f, --file <file>', 'file to sign')
	.option('-c, --config <file>', 'signing configuration file')

program.parse(process.argv)

const FILE = program.file
const CONFIG = program.config

sign(path.resolve(FILE), path.resolve(CONFIG))
