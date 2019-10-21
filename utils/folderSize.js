const fs = require('fs').promises
const path = require('path')
const asyncForEach = require('./asyncForEach')

/**
 * Recursively calculate size of all files inside a folder
 * @param {String} filePath - Path of folder to calculate (relative or absolute)
 * @return {Number} Total size in bytes
 */
const readSizeRecursive = async (filePath) => {
	const stats = await fs.stat(path.resolve(filePath))
	if (stats.isDirectory()) {
		let total = 0
		const list = await fs.readdir(filePath)
		await asyncForEach(list, async (dirItem) => {
			total += await readSizeRecursive(
				path.resolve(filePath, dirItem)
			)
		})
		return total
	}
	return stats.size
}

module.exports = readSizeRecursive
