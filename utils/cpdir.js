// # MIT License
//
// ###Copyright (C) 2011 by Charlie McConnell
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

const fs = require('fs')
const path = require('path')

function ncp(source, dest, options, callback) {
	let cback = callback

	if (!callback) {
		cback = options
		options = {}
	}

	const basePath = process.cwd()
	const currentPath = path.resolve(basePath, source)
	const targetPath = path.resolve(basePath, dest)
	const { filter } = options
	const { rename } = options
	const { transform } = options
	const clobber = options.clobber !== false
	const { modified } = options
	const { dereference } = options
	let errs = null
	let started = 0
	let finished = 0
	let running = 0
	let limit = options.limit || ncp.limit || 16

	limit = (limit < 1) ? 1 : (limit > 512) ? 512 : limit

	startCopy(currentPath)

	function startCopy(src) {
		started++
		if (filter) {
			if (filter instanceof RegExp) {
				if (!filter.test(src)) {
					return cb(true)
				}
			} else if (typeof filter === 'function') {
				if (!filter(src)) {
					return cb(true)
				}
			}
		}
		return getStats(source)
	}

	function getStats(src) {
		const stat = dereference ? fs.stat : fs.lstat
		if (running >= limit) {
			return setImmediate(() => {
				getStats(src)
			})
		}
		running++
		stat(src, (err, stats) => {
			const item = {}
			if (err) {
				return onError(err)
			}

			// We need to get the mode from the stats object and preserve it.
			item.name = src
			item.mode = stats.mode
			item.mtime = stats.mtime // modified time
			item.atime = stats.atime // access time

			if (stats.isDirectory()) {
				return onDir(item)
			}
			if (stats.isFile()) {
				return onFile(item)
			}
			if (stats.isSymbolicLink()) {
				// Symlinks don't really need to know about the mode.
				return onLink(src)
			}
			return null
		})
		return null
	}

	function onFile(file) {
		let target = file.name.replace(currentPath, targetPath)
		if (rename) {
			target = rename(target)
		}
		isWritable(target, (writable) => {
			if (writable) {
				return copyFile(file, target)
			}
			if (clobber) {
				rmFile(target, () => {
					copyFile(file, target)
				})
			}
			if (modified) {
				const stat = dereference ? fs.stat : fs.lstat
				stat(target, (err, stats) => {
					// if souce modified time greater to target modified time copy file
					if (file.mtime.getTime() > stats.mtime.getTime()) {
						copyFile(file, target)
						return null
					}
					return cb()
				})
			} else {
				return cb()
			}
			return null
		})
	}

	function copyFile(file, target) {
		const readStream = fs.createReadStream(file.name)
		const writeStream = fs.createWriteStream(target, { mode : file.mode })

		readStream.on('error', onError)
		writeStream.on('error', onError)

		if (transform) {
			transform(readStream, writeStream, file)
		} else {
			writeStream.on('open', () => {
				readStream.pipe(writeStream)
			})
		}
		writeStream.once('finish', () => {
			if (modified) {
				// target file modified date sync.
				fs.utimesSync(target, file.atime, file.mtime)
				cb()
			} else cb()
		})
	}

	function rmFile(file, done) {
		fs.unlink(file, (err) => {
			if (err) {
				return onError(err)
			}
			return done()
		})
	}

	function onDir(dir) {
		const target = dir.name.replace(currentPath, targetPath)
		isWritable(target, (writable) => {
			if (writable) {
				return mkDir(dir, target)
			}
			copyDir(dir.name)
			return null
		})
	}

	function mkDir(dir, target) {
		fs.mkdir(target, dir.mode, (err) => {
			if (err) {
				return onError(err)
			}
			copyDir(dir.name)
			return null
		})
	}

	function copyDir(dir) {
		fs.readdir(dir, (err, items) => {
			if (err) {
				return onError(err)
			}
			items.forEach((item) => {
				startCopy(path.join(dir, item))
			})
			return cb()
		})
	}

	function onLink(link) {
		const target = link.replace(currentPath, targetPath)
		fs.readlink(link, (err, resolvedPath) => {
			if (err) {
				return onError(err)
			}
			checkLink(resolvedPath, target)
			return null
		})
	}

	function checkLink(resolvedPath, target) {
		if (dereference) {
			resolvedPath = path.resolve(basePath, resolvedPath)
		}
		isWritable(target, (writable) => {
			if (writable) {
				return makeLink(resolvedPath, target)
			}
			fs.readlink(target, (err, targetDest) => {
				if (err) {
					return onError(err)
				}
				if (dereference) {
					targetDest = path.resolve(basePath, targetDest)
				}
				if (targetDest === resolvedPath) {
					return cb()
				}
				return rmFile(target, () => {
					makeLink(resolvedPath, target)
				})
			})
			return null
		})
	}

	function makeLink(linkPath, target) {
		fs.symlink(linkPath, target, (err) => {
			if (err) {
				return onError(err)
			}
			return cb()
		})
	}

	function isWritable(filePath, done) {
		fs.lstat(filePath, (err) => {
			if (err) {
				if (err.code === 'ENOENT') return done(true)
				return done(false)
			}
			return done(false)
		})
	}

	function onError(err) {
		if (options.stopOnError) {
			return cback(err)
		}
		if (!errs && options.errs) {
			errs = fs.createWriteStream(options.errs)
		} else if (!errs) {
			errs = []
		}
		if (typeof errs.write === 'undefined') {
			errs.push(err)
		} else {
			errs.write(`${err.stack}\n\n`)
		}
		return cb()
	}

	function cb(skipped) {
		if (!skipped) running--
		finished++
		if ((started === finished) && (running === 0)) {
			if (cback !== undefined) {
				return errs ? cback(errs) : cback(null)
			}
		}
		return null
	}
}


module.exports = (src, dst) => new Promise(resolve => {
	ncp(src, dst, err => {
		if (err) {
			resolve(false)
			return
		}
		resolve(true)
	})
})
