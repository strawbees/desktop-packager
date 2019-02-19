const fs = require('fs')
const archiver = require('archiver')

module.exports = async (src, dst, root) => new Promise((resolve, reject) => {
	const output = fs.createWriteStream(dst)
	const archive = archiver('zip')
	output.on('close', () => resolve())
	archive.on('error', (err) => reject(err))
	archive.pipe(output)
	archive.directory(src, root)
	archive.finalize()
})
