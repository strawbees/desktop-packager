# Desktop App Packager

An npm module and command line tool to automate the building, packaging and deploying of [Strawbees](https://strawbees.com/) desktop apps. Those steps are:

- Bundle the [NWJS](https://nwjs.io/) source code using [`nwjs-builder`](https://github.com/evshiron/nwjs-builder)
- Package for Windows:
	- Download and run [Resource Hacker](http://www.angusj.com/resourcehacker/)
	- Create an installer using [NSIS](https://nsis.sourceforge.io/Main_Page):
		- Install drivers if Windows version is lesser than `8.1`
		- Require administrator rights when installing drivers
		- Register URL scheme
		- Register uninstaller
- Package for OSX:
	- Fix symbolic links
	- Create DMG
	- Register URL scheme (modify `Info.plist`)
- Output files on file structure compatible with "auto update" server
	- Place installer/dmg
	- Place bundled source code for auto update
	- Generate `latest.json`
- Deploy generated files to "auto update" server
- Sign binaries (TODO)

## Installing

Run `npm install --save @strawbees/desktop-packager` to install and save the app packager to your NWJS project or install it globally with `npm install -g @strawbees/desktop-packager`.

## Usage

On your NWJS project folder, identify what is the folder that contains the app (usually `src`) and make sure it has a `package.json` inside.

Assuming this folder is `src` on the root of your NWJS project, navigate to your NWJS project folder and run `desktop-packager package --source ./src --output ./dist`. This will identify your platform and run all the steps described above.

You can also run them separatedly. Check the API reference for more details.

## API Reference

TODO.
