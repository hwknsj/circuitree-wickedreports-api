REM Executes the CircuiTree list of 'Detailed Emails' export for the given year or year range.
@echo off

echo "Hi, this script will let you automatically click to run the CircuiTree to Wicked Reports application!"
echo "Set the range of year(s) for which the 'Detailed email' CircuiTree list will be imported into Wicked Reports"

set /p year= Use '2017' for a single year or '2016|2017'
npm install
npm start -- "%year"
