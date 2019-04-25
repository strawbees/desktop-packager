const execute = require('../utils/execute')

const runSignTool = async (file) => {
	return new Promise((resolve, reject) => {
		execute(async ({ exec }) => {
			try {
				await exec(`echo "### signing app"`)
				await exec(`codesign --force --verify --verbose --sign "${process.env.IDENTITY}" "${file}"`)
				await exec(`echo "### verifying signature"`)
				await exec(`codesign -vvv -d "${file}"`)
				resolve()
			} catch (err) {
				reject(err)
			}
		})
	})
}

module.exports = async (file) => {
	await runSignTool(file)
}
