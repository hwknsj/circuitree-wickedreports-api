/*
Connects CircuiTree API with Wicked Reports APIKey
for Prepared Marketing.

Uses Promises for asynchronous requests & faster results
with better error handling.

by Joel Hawkins, Creative Circle
*/

var request = require("request");
var rp = require("request-promise");


// CircuiTree login info:
var circuiTree = {
    'APIKey': 'ab0b374c-a2e0-4b5e-8d95-f3bc61aa37a7',
    'Username': 'tbm.wreports',
    'Password': 't26IWPcQQouN5q',
    'CompanyCode': '15'
};

// First authenticate
var options = {
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
    var ApiToken = response.ApiToken;

    // Now create user token
    // all other options remain the same (e.g. method, headers, json)
    options.url = 'https://api.circuitree.com/TBM/Authentication/CreateUserToken.json';
    options.body = { ApiToken: ApiToken };
    return rp(options)
        .then(function(response) {
            console.log(response);
            var UserToken = response.UserToken;

            // Now authenticate user token
            options.url = 'https://api.circuitree.com/TBM/Authentication/AuthenticateUserToken.json';
            options.body = { ApiToken: ApiToken, UserToken: UserToken };
            return rp(options)
                .then(function(response) {
                    console.log(response);

                    // Now get some data!
                    // url depends on which service you want to use
                    // (see https://api.mycircuitree.com/TBM/Services.aspx)
                    // For example, we'll Get Guest Registrations
                    options.url = 'https://api.circuitree.com/TBM/Registration/GetGuestRegistrations.json';
                    options.body = { ApiToken: ApiToken, DaysToShowHistory: 2147483647, EntityID: 9223372036854775807 };
                    return rp(options)
                        .then(function(response) {
                            console.log(response);

                            // Now we can pass this to Wicked Reports API!
                        })
                        .catch(function(err) {
                            console.error(err);
                            // throw new Error(err);
                        });
                })
                .catch(function(err) {
                    console.error(err);
                    throw new Error(err);
                });
        })
        .catch(function(err) {
            console.error(err);
            throw new Error(err);
        });
}).catch(function(err) {
    // POST failed
    throw new Error(err);
});
