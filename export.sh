#!/bin/sh

echo "Hi, this script will let you automatically click to run the CircuiTree to Wicked Reports application!"
echo "Set the range of year(s) for which the 'Detailed email' CircuiTree list will be imported into Wicked Reports"
echo "You can entexsr '2017' or '2017|2018' form multiple years:"
year=
while [ -z $year ]
do
    echo -n 'Year? '
    read year
done
npm install ./
npm start -- $year
