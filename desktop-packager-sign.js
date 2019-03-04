#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const sign = require('./commands/sign')

program
	.option('-f, --file <file>', 'file to sign')
	.option('-p, --platform <platform>', 'which platform to sign (win32 or darwin)')

program.parse(process.argv)

const FILE = program.file
const PLATFORM = program.platform || process.platform

sign(path.resolve(FILE), PLATFORM)
