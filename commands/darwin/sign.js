const execute = require('../../utils/execute')

const runSignTool = async (app) => new Promise((resolve, reject) => {
	execute(async ({ exec }) => {
		try {
			await exec(`APP="${app}" sh ${__dirname}/../../assets/darwin/codesign.sh`)
			resolve()
		} catch (err) {
			reject(err)
		}
	})
})

module.exports = async (app) => {
	await runSignTool(app)
}
