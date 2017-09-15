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
// Set the type of object and the year we want to fetch
// e.g. in command line type:
// npm start contacts 2018
// npm start orders 2017
var args = process.argv.slice(2);
var exportType = args[0],
    eventYear = args[1];
var ExportQueryID;
if (exportType === "orders") {
    ExportQueryID = -195; // -195 for Registration Accounting summary. Use 124 for contacts
} else if (exportType === "contacts") {
    ExportQueryID = 124;
}

// Wicked Reports credentials:
var testApikey = 'F76AahJFyq7NC25jSjQ4mO2twEXddmhO',
    wrApikey = '8AhsXgT1QxwOyXqSzjcL8RVYTNF21Cx9',
    wrApiKeyNew = '8AhsXgT1QxwOyXqSzjcL8RVYTNF21Cx9';

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
    // or Registration Accounting Summary '-195'

    var requestURL = CompanyAPIURL + "/Exports/ExecuteQuery.json"
    var requestQuery = {
        ApiToken: ApiToken,
        ExportQueryID: ExportQueryID, // using -195 for Registration Account Summary, 124 for contacts
        QueryParameters: [
            {
                'ParameterID': 7, // Event Year
                'ParameterValue': eventYear // use "2004|2005" to get multiple years
            }, {
                'ParameterID': 51, // Registration Status
                'ParameterValue': 1 // "Active"
            }
        ]
    };

    options.url = requestURL;
    options.body = requestQuery;

    console.log(options.body);
    return rp(options).then(function(response) {

        var results = JSON.parse(response.Results);

        // select only Active and Pending RegistrationStatus
        // results.filter(function(item) {
        //     return item.EnrollmentStatusName === "Active" || item.EnrollmentStatusName === "Pending";
        // });

        // return console.log(results);

        // wrInsertContacts returns an array of promises
        if (exportType === "contacts") {
            return promise.all(wrInsertContacts(results)).then(function(response) {
                // all requests were successful
                console.log(JSON.stringify(response,null,2));
                console.log("Success!");
            }).catch(function(err) {
                console.log(JSON.stringify(err,null,2));
                throw new Error(err);
            });
        }

        // wrInsertOrders returns an array of promises
        if (exportType === "orders") {
            return promise.all(wrInsertOrders(results)).then(function(response) {
                // all requests were successful
                console.log(JSON.stringify(response,null,2));
                console.log("Success!");
            }).catch(function(err) {
                console.log(JSON.stringify(err,null,2));
                throw new Error(err);
            });
        }

        else if (exportType != "contacts"
                || exportType != "orders"
                || exportType // doesn't exist, misspelled etc.) {
            console.log("Please use the syntax: 'npm start orders 2016' and try again.\n");
            break;
        }

    }).catch(function(err) {
        console.error(JSON.stringify(err,null,2));
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
            "SourceSystem": "CircuiTree-Registration", // CircuiTree-Registration
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
            'apikey': wrApikeyNew
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

// NEW 13 Sept. 2017 - by Joel Hawkins to get Orders
// Need to do some math... we are going to
// input is CircuiTree query -195 results: orders
function wrInsertOrders(results) {

    var wrOrders = results.map(function(ct) {
        // orderTotal should be the sum of all charges, discounts, and Scholarships
        // This may be different than Payments

        // The total amount paid should be totalPayments = Payments + GiftCardPayments
        // ignore the ( variable ? variable : 0 ) things. This just means "does variable exist" ? value_if_true : value_if_false
        // this way we don't get errors for having blank, null, or NaN ("Not a Number"), not all contacts have these values.
        var chargesTotal = (ct.Charges ? ct.Charges : 0)
            + (ct.Discounts ? ct.Discounts : 0)
            + (ct.Scholarships ? ct.Scholarships : 0)
            + (ct.ReservationCharges ? ct.ReservationCharges : 0)
            + (ct.MiscellaneousCharges ? ct.MiscellaneousCharges : 0)
            + (ct.GiftCardCharges ? ct.GiftCardCharges : 0);

        var orderTotal = ct.Payments ? ct.Payments : chargesTotal;
        return {
            "SourceSystem": "CircuiTree-Orders", // (constant)
            "SourceID": ct.ItineraryID, // ItineraryID unique ID for the itinerary
            "CreateDate": moment(ct.EventBeginDate).format("YYYY-MM-DD HH:mm:ss"), // (format: "YYYY-MM-DD HH:MM:SS" UTC time)
            "ContactID": ct.entityid, // (unique number for that specific individual (camper)) or RegistrationID (unique for the specific individual (camper) registration to a specific event). Preference?
            "ContactEmail": ct.BillingEmailAddress, //BillingEmailAddress
            "OrderTotal": Math.abs(orderTotal), // Charges + ReservationCharges + GiftCardCharges + MiscellaneousCharges (sum of these charges, as shown in spreadsheet)
            "Country": "USA", // (assuming all patrons are from the USA)
            "City": ct.HomeCity, // HomeCity
            "State": ct.HomeState, // HomeState
            "SubscriptionID": ct.ItineraryEntityID, // ItineraryEntityID [must be UNIQUE] entityID of the individual who is the administrator of the Itinerary (usually the parent)
            "OrderItems": [
                { //array of order items: for best results I'll make sure Charges, Discounts, Scholarships, ReservationCharges, and MiscellaneousCharges are separate array items
                    "OrderItemID": "Charges", // either one of [Charges, Discounts, Scholarships, ReservationCharges, MiscellaneousCharges] OR RegistrationID (unique for the specific individual (camper) registration to a specific event). Probably depends on what you think "ContactID" should be...
                    "Qty": ct.RegistrationQuantity, // (only makes sense, right?)
                    "PPU": Math.abs(ct.Charges) ? Math.abs(ct.Charges) : 0
                }, {
                    "OrderItemID": "Discounts",
                    "Qty": ct.RegistrationQuantity,
                    "PPU": Math.abs(ct.Discounts) ? Math.abs(ct.Discounts) : 0
                }, {
                    "OrderItemID": "ReservationCharges",
                    "Qty": ct.RegistrationQuantity,
                    "PPU": Math.abs(ct.ReservationCharges) ? Math.abs(ct.ReservationCharges) : 0
                }, {
                    "OrderItemID": "Scholarships",
                    "Qty": ct.RegistrationQuantity,
                    "PPU": Math.abs(ct.Scholarships) ? Math.abs(ct.Scholarships) : 0
                }, {
                    "OrderItemID": "MiscellaneousCharges",
                    "Qty": ct.RegistrationQuantity,
                    "PPU": Math.abs(ct.MiscellaneousCharges) ? Math.abs(ct.MiscellaneousCharges) : 0
                }, {
                    "OrderItemID": "GiftCardCharges",
                    "Qty": ct.RegistrationQuantity,
                    "PPU": Math.abs(ct.GiftCardCharges) ? Math.abs(ct.GiftCardCharges) : 0
                }
            ],
            "OrderPayments": [
                { //array related to the order payment transactions
                    "PaymentDate": moment(ct.EventBeginDate).format("YYYY-MM-DD HH:mm:ss"), // (this field is required, but I'm not sure if this is accessible using this particular query) (format: "YYYY-MM-DD HH:MM:SS" UTC Time )
                    "Amount": Math.abs(ct.Payments) ? Math.abs(ct.Payments) : 0, // this will be the dollar amount of [Charges, Discounts, Scholarships, ReservationCharges, MiscellaneousCharges], same as PPU?
                    "Status": "APPROVED" // (constant)
                }, {
                    "PaymentDate": moment(ct.EventBeginDate).format("YYYY-MM-DD HH:mm:ss"),
                    "Amount": Math.abs(ct.GiftCardPayments) ? Math.abs(ct.GiftCardPayments) : 0,
                    "Status": "APPROVED"
                }
            ]
        }
    });

    /* ------------------------------------
        Here is where the magic happens!
       ----------------------------------- */

    // splice into arrays of max length 1000
    // as per Wicked Reports limit
    var arrays = [],
        size = 1000;
    while (wrOrders.length > 0) {
        arrays.push(wrOrders.splice(0, size));
    }

    var promises = [];

    var options = {
        method: 'POST',
        url: "https://api.wickedreports.com/orders",
        headers: {
            'Content-Type': 'application/json',
            'apikey': wrApiKeyNew
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

// For testing

/*
var results = [{
    "RegistrationID": "123988",
    "entityid": "1146357",
    "EntityName": 'Blackwell, Chase',
    "EntityFirstName": 'Chase',
    "EntityLastName": 'Blackwell',
    "RegistrationQuantity": 1,
    "ItineraryID": 187620,
    "ItineraryEntityID": 1253771,
    "ItineraryEntityName": 'Catherine Harm Family',
    "HomeAddress1": '9745 Trophy Oaks Dr',
    "HomeCity": 'San Antonio',
    "HomeState": 'TX',
    "HomeZip": '78266',
    "HomePhone": '2108315688',
    "BillingEmailAddress": 'TBlackwell1@satx.rr.com',
    "EntityCommunicationMechanismID": 19235,
    "EventDivisionID": 1216,
    "DivisionName": 'Camp Travis Session 1 Male',
    "abbreviation": '2018 CT S1 7D M',
    "EventBeginDate": '2018-06-03T00:00:00',
    "EventID": 508,
    "EventName": 'Camp Travis Session 1',
    "EventFullName": '2018 Camp Travis Session 1 7 Days',
    "RegistrationStatus": 'Active',
    "Charges": 825,
    "Discounts": 0,
    "Scholarships": 0,
    "ReservationCharges": 0,
    "MiscellaneousCharges": 0,
    "Payments": -125,
    "RegistrationBalance": 700
}];
*/
