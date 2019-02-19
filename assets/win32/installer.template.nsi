!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "MUI2.nsh"
!include "WinMessages.nsh"
!include "WinVer.nsh"
!include "x64.nsh"

RequestExecutionLevel user
ManifestDPIAware true

!define APP_NAME "{{APP_NAME}}"
; !define APP_DESCRIPTION "{{APP_DESCRIPTION}}"
!define APP_DESCRIPTION "Strawbees CODE Desktop App allows you to create, save and upload code to your Quirkbot."
!define APP_VERSION "{{APP_VERSION}}"
!define APP_PUBLISHER "{{APP_PUBLISHER}}"
!define RELATIVE_BUILD_PATH "{{RELATIVE_BUILD_PATH}}"
!define APP_EXECUTABLE_NAME "{{APP_EXECUTABLE_NAME}}"
!define APP_URL_SCHEME "{{APP_URL_SCHEME}}"

Name "${APP_NAME} ${APP_VERSION}"
BrandingText "${APP_PUBLISHER}"

# set the icon
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"

# define the resulting installer's name:
OutFile "${RELATIVE_BUILD_PATH}\${APP_EXECUTABLE_NAME}-installer.exe"

# set the installation directory
InstallDir "$APPDATA\${APP_NAME}\"

Function killCode
	DetailPrint "Killing current instances of ${APP_EXECUTABLE_NAME}"
	# kill any instance of the app
	ExecWait 'taskkill /f /im "${APP_EXECUTABLE_NAME}.exe" /t'
	Sleep 4000
FunctionEnd

Function doFiles
	# copy the app files to the output path
	DetailPrint "Moving app files"
	File /r "${RELATIVE_BUILD_PATH}\app\*"
	# create the uninstaller
	DetailPrint "Creating uninstaller"
	WriteUninstaller "$INSTDIR\uninstall-${APP_EXECUTABLE_NAME}.exe"
FunctionEnd

Function un.doFiles
	# delete the installed files
	DetailPrint "Removing files"
	RMDir /r $INSTDIR
FunctionEnd

Function registerUninstaller
	# add uninstall information to Add/Remove Programs
	DetailPrint "Registering uninstall information"
	WriteRegStr   HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
		"DisplayName" "${APP_NAME}"
	WriteRegStr   HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
		"Publisher" "${APP_PUBLISHER}"
	WriteRegStr   HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
		"DisplayIcon" '"$INSTDIR\nwjs-assets\win32\icon.ico"'
	WriteRegStr   HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
		"DisplayVersion" "${APP_VERSION}"
	WriteRegStr   HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
		"UninstallString" '"$INSTDIR\uninstall-${APP_EXECUTABLE_NAME}.exe"'
	WriteRegStr   HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
		"QuietUninstallString" '"$INSTDIR\uninstall-${APP_EXECUTABLE_NAME}.exe"'
	${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
	IntFmt $0 "0x%08X" $0
	WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
		"EstimatedSize" "$0"
FunctionEnd

Function un.registerUninstaller
	# remove uninstall information from Add/Remove Programs
	DetailPrint "Unregistering uninstall information"
	DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
FunctionEnd

Function registerAppUrlScheme
	# register the app url scheme
	# (most instructions I've found tell the scheme should be installed to HKCR
	# that requires admin access. But apparently installing to
	# HKCU Software\Classes\ does the trick)
	DetailPrint "Register ${APP_URL_SCHEME} URI Handler"
	DeleteRegKey HKCU "Software\Classes\${APP_URL_SCHEME}"
	WriteRegStr HKCU "Software\Classes\${APP_URL_SCHEME}" "" ""
	WriteRegStr HKCU "Software\Classes\${APP_URL_SCHEME}" "URL Protocol" ""
	WriteRegStr HKCU "Software\Classes\${APP_URL_SCHEME}\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_NAME}.exe,0"
	WriteRegStr HKCU "Software\Classes\${APP_URL_SCHEME}\shell" "" ""
	WriteRegStr HKCU "Software\Classes\${APP_URL_SCHEME}\shell\open" "" ""
	WriteRegStr HKCU "Software\Classes\${APP_URL_SCHEME}\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_NAME}.exe" "%1"'
	WriteRegStr HKCU "Software\Classes\${APP_URL_SCHEME}\shell\open\ddeexec" "" ""
FunctionEnd

Function un.registerAppUrlScheme
	# deregister the app url scheme
	DetailPrint "Unegister ${APP_URL_SCHEME} URI Handler"
	DeleteRegKey HKCU "Software\Classes\${APP_URL_SCHEME}"
FunctionEnd

Function doShortcuts
	# create shortcuts in the start menu and on the desktop
	DetailPrint "Creating shortcuts"
	Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
	Delete "$SMPROGRAMS\${APP_NAME}\uninstall.lnk"
	Delete "$SMPROGRAMS\${APP_NAME}"
	Delete "$DESKTOP\${APP_NAME}.lnk"
	CreateDirectory "$SMPROGRAMS\${APP_NAME}"
	CreateShortCut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_NAME}.exe"
	CreateShortCut "$SMPROGRAMS\${APP_NAME}\uninstall.lnk" "$INSTDIR\uninstall-${APP_EXECUTABLE_NAME}.exe"
	CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_NAME}.exe"
FunctionEnd

Function un.doShortcuts
	# delete the shortcuts
	DetailPrint "Removing shortcuts"
	RMDir /r "$SMPROGRAMS\${APP_NAME}"
	Delete "$DESKTOP\${APP_NAME}.lnk"
FunctionEnd

Function installDrivers
	# install the drivers
	DetailPrint "Installing drivers"
	${If} ${AtMostWin8.1}
		ExecWait '"$RELATIVE_BUILD_PATH\drivers\Quirkbot-Windows-Drivers-Installer.exe"' $1
	${Else}
		DetailPrint "Your Windows doesn't need drivers"
	${EndIf}
FunctionEnd

Function .onInit
	SetOutPath $INSTDIR
FunctionEnd

# default section start
Section "${APP_NAME}" AppCode
	Call killCode
	Call doFiles
	Call doShortcuts
	Call registerAppUrlScheme
SectionEnd

Section "- Register Uninstaller"
	Call registerUninstaller
SectionEnd

Section "Quirkbot Drivers" QuirkbotDrivers
	Call installDrivers
SectionEnd

# create a section to define what the uninstaller does
Section "Uninstall"
	Call un.registerUninstaller
	Call un.registerAppUrlScheme
	Call un.doShortcuts
	Call un.doFiles
SectionEnd

Function checkRequiredComponents
	${Unless} ${SectionIsSelected} ${AppCode}
		MessageBox MB_YESNO "Are you sure you want to continue without installing ${APP_NAME}?" \
			IDYES proceed1 IDNO stop1
		proceed1:
			Goto next1
		stop1:
			Abort
		next1:
	${EndIf}
	${Unless} ${SectionIsSelected} ${QuirkbotDrivers}
		MessageBox MB_YESNO "Are you sure you want to continue without installing drivers? This might cause problems to upload code to your Quirkbot." \
			IDYES proceed2 IDNO stop2
		proceed2:
			Goto next2
		stop2:
			Abort
		next2:
	${EndIf}
FunctionEnd

# app dialogs
!insertmacro MUI_PAGE_WELCOME

; Run checkRequiredComponents when leaving components page
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE checkRequiredComponents
!insertmacro MUI_PAGE_COMPONENTS

!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN_TEXT "Start ${APP_NAME}"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXECUTABLE_NAME}.exe"

!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
!insertmacro MUI_DESCRIPTION_TEXT ${AppCode} "${APP_DESCRIPTION}"
!insertmacro MUI_DESCRIPTION_TEXT ${QuirkbotDrivers} "Quirkbot Drivers are required to upload code to your Quirkbot. To install Quirkbot Drivers you must have Administrator rights on your computer."
!insertmacro MUI_FUNCTION_DESCRIPTION_END
