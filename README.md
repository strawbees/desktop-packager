# Strawbees Desktop App Packager

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

```
Usage: desktop-packager [options] [command]

Packages NWJS application.

Options:
  -v, --version    output the version number
  -h, --help       output usage information

Commands:
  bundle           bundles NWJS source code
  deploy           deploy packaged app
  package          packages bundled NWJS source code
  sign             sign binaries
  prepare          bundles and packages the app
  help [cmd]       display help for [cmd]
```

Run `desktop-packager help <command>` replacing `<command>` by one of the available commands to see what each command accepts as arguments.

### Example of usage:

If `desktop-packager` is included on a project as dependencies it will register the binaries with `strawbees-` prefix. To call the `prepare` command (which is a standalone binary) from the root of the main project would look like:

```bash
# Defaults to `--source` to `./src` and `--output` to `./dist`.
# Autodetects platform and architecture
./node_modules/.bin/strawbees-desktop-packager-prepare

# Specifying `--source`, `--output`
./node_modules/.bin/strawbees-desktop-packager-prepare --source ./myapp --output ./build
```

Another way to call it is to register a script on the project's `package.json`. In this case it's possible to call the binaries without the path and use the commands, for example:

```json
{
	"scripts": {
		"build": "strawbees-desktop-packager prepare",
		"other-build": "strawbees-desktop-packager prepare --source ./myapp --output ./build"
	}
}
```
