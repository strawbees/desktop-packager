const plist = require('plist')
const path = require('path')
const fs = require('fs').promises
const execute = require('../utils/execute')

/**
 * Manually fix broken symbolic links created by NWJS on bundled app.
 * @param {String} dist - Absolute path of directory where app will be bundled
 *  and packaged.
 */
const fixSymbolicLinks = async (dist) => {
	// NWB transforms realtive symlinks into absolute ones, which totally breaks
	// the application when you run it from another machine. So for now, we will
	// just manually fix those symlinks
	execute(async ({ exec }) => {
		await exec(`
			cd "$(find ${dist} -name "nwjs Framework.framework")"
			rm "Versions/Current" && ln -s "./A" "./Versions/Current"
			rm "Helpers" && ln -s "./Versions/Current/Helpers"
			rm "Internet Plug-Ins" && ln -s "./Versions/Current/Internet Plug-Ins"
			rm "Libraries" && ln -s "./Versions/Current/Libraries"
			rm "nwjs Framework" && ln -s "./Versions/Current/nwjs Framework"
			rm "Resources" && ln -s "./Versions/Current/Resources"
			rm "XPCServices" && ln -s "./Versions/Current/XPCServices"
		`)
	})
}

/**
 * Returns the absolute path where the `package.json` should be on bundled app.
 * @param {String} dist - Absolute path of directory where app will be bundled
 *  and packaged.
 * @param {String} executableName - Name of executable, which for macos is the
 *  `executableName.app` folder where the app will be bundled.
 * @return {String}
 */
const getBundledPackagePath = (dist, executableName) => {
    return path.resolve(
      dist,
      'bundle',
      `${executableName}.app`,
      'Contents',
      'Resources',
      'app.nw',
      'package.json'
    )
}

module.exports = {
	fixSymbolicLinks,
  getBundledPackagePath
}
