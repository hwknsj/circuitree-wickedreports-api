/*
Connects CircuiTree API with Wicked Reports APIKey
for Prepared Marketing.

Uses Promises for asynchronous requests & faster results
with better error handling.

by Joel Hawkins, Creative Circle
*/

var request = require("request");
var rp = require("request-promise");

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

// First authenticate
options = {
    method: 'POST',
    url: 'https://api.mycircuitree.com/Authentication/Authenticate.json',
    headers: {
        'Content-Type': 'application/json'
    },
    body: circuiTree,
    json: true
};

// Send the POST request
rp(options).then(function(response) {
    // POST successful
    console.log(response);
    // Store ApiToken, CompanyAPIURL
    ApiToken = response.ApiToken;
    CompanyAPIURL = response.CompanyAPIURL;

    // Now create user token
    // all other options remain the same (e.g. method, headers, json)
    options.url = CompanyAPIURL + '/Authentication/CreateUserToken.json';
    options.body = {
        ApiToken: ApiToken
    };

    return rp(options).then(function(response) {
        console.log(response);
        // Receive UserToken
        var UserToken = response.UserToken;

        // Now authenticate user token
        options.url = CompanyAPIURL + '/Authentication/AuthenticateUserToken.json';
        options.body = {
            ApiToken: ApiToken,
            UserToken: UserToken
        };
        return rp(options).then(function(response) {
            console.log(response);

            // Now we can make get some data!
            // url depends on which service you want to use
            // (see https://api.mycircuitree.com/TBM/Services.aspx)

            // We need to run ExportQueries, build query below
            // Run the custom query ID '124' (Registration List – Detailed Email)
            //

            var requestURL = CompanyAPIURL + "/Exports/ExecuteQuery.json"
            var requestQuery = {
                ApiToken: ApiToken,
                ExportQueryID: "124",
                QueryParameters: [
                    {
                        'ParameterID': "7", // Event Year
                        'ParameterValue': "2004"
                    }
                ]
            };

            options.url = requestURL;
            options.body = requestQuery;

            console.log(options.body);
            return rp(options).then(function(response) {
                //console.log(JSON.parse(response.Results));

                var results = JSON.parse(response.Results);

                results.filter(function(item) {
                    return item.EnrollmentStatusName === "Active" || item.EnrollmentStatusName === "Pending";
                });

                //console.log(results);

                // var wrContacts = wrInsertContacts(results);

                // console.log(wrContacts);

                // Now we can pass this to Wicked Reports API!

                // wrInsertContacts returns 'rp.all'
                return wrInsertContacts(results).then(function() {
                    // all requests were successful
                    console.log("Success!");
                })
                .catch(function(err) {
                    console.error(err);
                    throw new Error(err);
                });

            }).catch(function(err) {
                console.error(err);
                // throw new Error(err);
            });
        }).catch(function(err) {
            // Error authenticating ApiToken/UserToken
            console.error(err);
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
            "SourceSystem": "CircuiTree",
            "SourceID": ct.entityid,
            "CreateDate": ct.EnrollmentDate,
            "Email": ct.EmailAddress,
            "FirstName": ct.EntityFirstName,
            "LastName": ct.EntityLastName,
            "City": ct.HomeCity,
            "State": ct.HomeState,
            "Country": "USA"
        };
    });

    // return arrays of max length 1000
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
            'apikey': 'F76AahJFyq7NC25jSjQ4mO2twEXddmhO'
        },
        body: '',
        json: true
    };

    for (var i; i < arrays.length; i++) {
        options.body = arrays[i];
        promises.push(rp(options));
    }

    return rp.all(promises);
}
