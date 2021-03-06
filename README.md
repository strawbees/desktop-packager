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
  -v, --version  output the version number
  -h, --help     output usage information

Commands:
  bundle         bundles NWJS source code
  cpdir          copy folders recursively
  package        packages bundled NWJS source code
  sign           sign binaries
  help [cmd]     display help for [cmd]
```

Run `desktop-packager help <command>` replacing `<command>` by one of the available commands to see what each command accepts as arguments.

Use the `NODE_ENV` environment variable to bundle for one of the available configurations: `dev`, `stage`, `production`. Bundle is the only command that is sensitive to `NODE_ENV`.

### Example of usage:

If `desktop-packager` is included on a project as dependencies it will register the binaries with `strawbees-` prefix. To build a packaged binary (installer, dmg or zip), first it's needed to bundle then package the application:

```bash
# Defaults to `--source` to `./src` and `--output` to `./dist`.
# Autodetects platform and architecture
./node_modules/.bin/strawbees-desktop-packager-bundle
./node_modules/.bin/strawbees-desktop-packager-package

# Bundling for production
NODE_ENV=production ./node/.bin/strawbees-desktop-packager

# Specifying `--source`, `--output`
./node_modules/.bin/strawbees-desktop-packager-bundle --source ./myapp --output ./build
./node_modules/.bin/strawbees-desktop-packager-package --source ./build/bundle --output ./build

```

Another way to call it is to register a script on the project's `package.json`. In this case it's possible to call the binaries without the path and use the commands, for example:

```json
{
	"scripts": {
		"bundle": "strawbees-desktop-packager-bundle",
		"package": "strawbees-desktop-packager-package",
		"build": "npm run bundle && npm run package",
		"other-bundle": "strawbees-desktop-packager-bundle --source ./myapp --output ./build",
		"other-package": "strawbees-desktop-packager-package --source ./build/bundle --output ./build",
		"other-build": "npm run other-bundle && npm run other-package"
	}
}
```

## File structure

The commands `bundle` and `package` will output directories of files on the given `output` path. We'll call this `output` folder the *distribution* folder. On the *distribution* folder you will find:

### `bundle`

Bundled `NWJS` source code. It should contain the correct `NWJS` version and the source code. It's possible to run the app on this folder before packaging for debugging.

For example, if you run the following command on a Windows machine (PowerShell) you will get a bundled app for stage environment inside the `.\build\bundle` folder:

```ps
$env:NODE_ENV='stage'
desktop-packager bundle --source .\myapp --output .\build
```

### `versions`

This is a folder for the "packaged" application. It will create a folder for the operations system, architecture and drop packaged application (dmg or installer), source code for updater and a `latest.json` manifest file with paths for the latest versions of packged app and source code.

For example, if you have a bundled app on `.\build` folder you can run (PowerShell on Windows x86):

```shell
desktop-packager package --source .\build\bundle --output .\build
```

This will create the following file structure:

```
build\versions\win32\x86\latest.json
build\versions\win32\x86\EXECUTABLE_NAME.exe
build\versions\win32\x86\EXECUTABLE_NAME-src.zip
```

## Code signing

### Windows 7

We use `SignTool` to sign both the driver's catalog file (`cat`) and installer. It says on the [documentation](https://docs.microsoft.com/en-us/dotnet/framework/tools/signtool-exe) that it comes with the Windows SDK but it seems to be a little bit tricker to do it on a fresh [Windows 7 VirtualBox image provided by Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/tools/vms/):

- [Install .NET Framework 4](https://www.microsoft.com/en-us/download/details.aspx?id=17851) (It has to be 4, 4.7 won't work)
- [Install Windows SDK](https://www.microsoft.com/en-us/download/details.aspx?id=8279)
- Add Windows SDK Tools binary folder to system `PATH`

Once `signtool` is available from the `CMD` or `PowerShell`:

- [Install and activate SafeNet driver and client](https://knowledge.digicert.com/solution/SO27164.html#attach)
- Connect USB token
- Run `desktop-packager sign -f "PATH TO FILE"` and behind the scenes it will select the current platform (assuming `Windows 7 x86`) and run the appropriate `signtool` command.

Alternatively you can use the DigiCert tool for signing apps (recommended).

### MacOS
#### Setting up certificates
First of all you must follow the instructions to download the necessary certifications and add to your keychain. Check the documentation for that on [Apple's Developer Account Help](https://help.apple.com/developer-account/#/deveedc0daa0).

You'll need to create a `macOS` certificate of type `Production: Developer ID` for `Developer ID Application`.

Once you selected it, follow the instructions to create a `CSR` file and upload it to the website.

```
To manually generate a Certificate, you need a Certificate Signing Request (CSR) file from your Mac. To create a CSR file, follow the instructions below to create one using Keychain Access.

Create a CSR file.
In the Applications folder on your Mac, open the Utilities folder and launch Keychain Access.

Within the Keychain Access drop down menu, select Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority.

In the Certificate Information window, enter the following information:
In the User Email Address field, enter your email address.
In the Common Name field, create a name for your private key (e.g., John Doe Dev Key).
The CA Email Address field should be left empty.
In the "Request is" group, select the "Saved to disk" option.
Click Continue within Keychain Access to complete the CSR generating process.
```

After that you should be able to download the `cert` files and by double clicking them you can add to your keychain.

#### Signing
On MacOS you can sign your apps and installers with the `codesign` command line that comes with `XCode`.

- Install XCode
- Generate (if needed) and download certificates on [Apple's Developer Dashboard](https://developer.apple.com/account/mac/certificate/)
- Add the downloaded certificates to your keychain (double click it)
- Find out your developer id: `$ security find-identity`
- Export your developer id as environment variable for your current session with `export APPLE_DEVELOPER_IDENTITY="your developer id here"`
- Run `desktop-packager sign -f "PATH TO FILE"` and behind the scenes it will select the current platform and run the appropriate `codesign` command.

Where `$APPLE_DEVELOPER_IDENTITY` is your developer id and `$APP` is the bundled `.app` path.

For example:

```shell
export APPLE_DEVELOPER_IDENTITY="4E9E4506CB7AF7AE8FAEB5DB219735484126D652"
desktop-packager sign -f "./dist/bundle/Strawbees CODE.app"
```

#### Notarizing
After the app has been signed, it should be submitted for notarization.

1. Package the application
2. Send it to apple's notarization service
3. Poll every minuted for the status of notarization
	- on reject we check the logs apple sends us
	- on success we staple the installer
