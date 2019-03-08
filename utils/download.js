const http = require('http')
const https = require('https')
const fs = require('fs')
// http.globalAgent = require("caw")(process.env.npm_config_proxy || process.env.http_proxy || process.env.HTTP_PROXY);

module.exports = async (url, path) => {
	const httpx = url.indexOf('https://') == 0 ? https : http
	await new Promise((resolve, reject) => {
		httpx.get(url, (response) => {
			// Check if response code is not "301: Moved Permanently"
			if (response.statusCode == 301) {
				return reject(new Error(`Response returned with status code ${response.statusCode}: ${response.statusMessage}`))
			}
			const file = fs.createWriteStream(path)
			response.pipe(file)
			file.on('finish', () => {
				file.close((err) => {
					if (err) {
						return reject(err)
					}
					return resolve()
				})
			})
		}).on('error', async (err) => {
			await fs.promises.unlink(path)
			reject(err)
		})
	})
}
