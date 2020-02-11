# Use environment variables to control this script
# $APP - Your "Application.app" location
# $APPLE_DEVELOPER_IDENTITY - Apple registered Identity (Developer ID Application)
echo "# Signing app with:"
echo "APP=$APP"
echo "-------------------------------------------------------------------------"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

ITEMS=""

FRAMEWORKS_DIR="$APP/Contents"
if [ -d "$FRAMEWORKS_DIR" ] ; then
    # Find .framework, .app, .xpc, .dylib, .bundle and helpers
    FRAMEWORKS=$(find "${FRAMEWORKS_DIR}" -depth -type d -name "*.framework" -or -type d -name "*.app" -or -type d -name "*.xpc" -or -name "*.dylib" -or -name "*.bundle" -or -path "*/Helpers/*" | sed -e "s/\(.*\/\(.*\)\.framework\)$/\1\/Versions\/A\/\2/")
    # Find executables
    EXECUTABLES=$(find "${FRAMEWORKS_DIR}"  | xargs -I {} file "{}" | grep executable | awk -F':' '{print $1}')
    # Combine and make sure they are unique
    ITEMS="${BINARIES}${FRAMEWORKS}"
    ITEMS=$(echo "$ITEMS" | sort -u)
fi

echo "Found:"
echo "${ITEMS}"
echo "-------------------------------------------------------------------------"

# Change the Internal Field Separator (IFS) so that spaces in paths will not cause problems below.
SAVED_IFS=$IFS
IFS=$'\n'
# Loop through all items.
for ITEM in $ITEMS;
do
    echo "Signing '${ITEM}'"
    codesign --verbose --force --strict --options runtime --timestamp --sign "$APPLE_DEVELOPER_IDENTITY" --entitlements "${SCRIPT_DIR}/neededToRun.entitlements" "${ITEM}"
    RESULT=$?
    if [[ $RESULT != 0 ]] ; then
        echo "Failed to sign '${ITEM}'."
        #IFS=$SAVED_IFS
        #exit 1
    fi
done
# Restore $IFS.
IFS=$SAVED_IFS
codesign --verbose --force --strict --options runtime --timestamp --sign "$APPLE_DEVELOPER_IDENTITY" --entitlements "${SCRIPT_DIR}/neededToRun.entitlements" "$APP"
echo "-------------------------------------------------------------------------"
echo "Verifying signature:"
codesign -vvv -d "$APP"
