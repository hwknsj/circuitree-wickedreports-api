/*
Connects CircuiTree API with Wicked Reports APIKey
for Prepared Marketing.

Uses Promises for asynchronous requests & faster results
with better error handling.

by Joel Hawkins, Creative Circle
*/

var promise = require("bluebird");
var request = promise.promisify(require("request"));
promise.promisifyAll(request);
var rp = require("request-promise");
promise.promisifyAll(rp);
var moment = require("moment");



// Declare some variables
var APIKey,
    Username,
    Password,
    CompanyCode,
    circuiTree,
    options,
    ApiToken,
    CompanyAPIURL;

// CircuiTree login info:
circuiTree = {
    'APIKey': 'ab0b374c-a2e0-4b5e-8d95-f3bc61aa37a7',
    'Username': 'tbm.wreports',
    'Password': 't26IWPcQQouN5q',
    'CompanyCode': '15'
};
// Set the year we want to fetch
// var eventYear = '2008';
var args = process.argv.slice(2);
var eventYear = args[0];

// Wicked Reports credentials:
var testApikey = 'F76AahJFyq7NC25jSjQ4mO2twEXddmhO',
    wrApikey = '8AhsXgT1QxwOyXqSzjcL8RVYTNF21Cx9';

// First authenticate
options = {
    method: 'POST',
    url: 'https://api.mycircuitree.com/Authentication/Authenticate.json',
    headers: {
        'content-type': 'application/json'
    },
    body: circuiTree,
    json: true
};

// Send the POST request
rp(options).then(function(response) {
    // POST successful
    // console.log(response);
    // Store ApiToken, CompanyAPIURL
    ApiToken = response.ApiToken;
    CompanyAPIURL = response.CompanyAPIURL;
    console.log(ApiToken, CompanyAPIURL);

    // Now we can make get some data!
    // url depends on which service you want to use
    // (see https://api.mycircuitree.com/TBM/Services.aspx)

    // We need to run ExportQueries, build query below
    // Run the custom query ID '124' (Registration List – Detailed Email)

    var requestURL = CompanyAPIURL + "/Exports/ExecuteQuery.json"
    var requestQuery = {
        ApiToken: ApiToken,
        ExportQueryID: "124",
        QueryParameters: [
            {
                'ParameterID': "7", // Event Year
                'ParameterValue': eventYear // use "2004|2005" to get multiple years
            }
        ]
    };

    options.url = requestURL;
    options.body = requestQuery;

    console.log(options.body);
    return rp(options).then(function(response) {

        var results = JSON.parse(response.Results);

        // select only Active and Pending RegistrationStatus
        results.filter(function(item) {
            return item.EnrollmentStatusName === "Active" || item.EnrollmentStatusName === "Pending";
        });

        // wrInsertContacts returns an array of promises
        return promise.all(wrInsertContacts(results)).then(function(response) {
            // all requests were successful
            console.log(response);
            console.log("Success!");
        }).catch(function(err) {
            throw new Error(err);
        });

    }).catch(function(err) {
        console.error(err);
        throw new Error(err);
    });
}).catch(function(err) {
    // POST failed
    throw new Error(err);
});

// input is CircuiTree query 124 results
function wrInsertContacts(results) {

    var wrContacts = results.map(function(ct) {
        return {
            "SourceSystem": "CircuiTree-Registration",
            "SourceID": ct.entityid,
            "CreateDate": moment(ct.EnrollmentDate).format("YYYY-MM-DD HH:mm:ss"),
            "Email": ct.EmailAddress
                ? ct.EmailAddress
                : '', // if EmailAddress is undefined, leave it blank
            "FirstName": ct.EntityFirstName,
            "LastName": ct.EntityLastName,
            "City": ct.HomeCity,
            "State": ct.HomeState,
            "Country": "USA"
        };
    });

    // splice into arrays of max length 1000
    // as per Wicked Reports limit
    var arrays = [],
        size = 1000;
    while (wrContacts.length > 0) {
        arrays.push(wrContacts.splice(0, size));
    }

    var promises = [];

    var options = {
        method: 'POST',
        url: "https://api.wickedreports.com/contacts",
        headers: {
            'Content-Type': 'application/json',
            'apikey': wrApikey
        },
        body: '',
        json: true
    };

    for (var i = 0; i < arrays.length; i++) {
        options.body = arrays[i];
        console.log(options.body[0]);
        promises.push(rp(options));
    }

    return promises;
}
