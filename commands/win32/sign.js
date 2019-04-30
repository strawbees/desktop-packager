const execute = require('../../utils/execute')

const runSignTool = async (file) => {
	return new Promise((resolve, reject) => {
		execute(async ({ exec }) => {
			try {
				await exec(`signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a ${file}`)
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
