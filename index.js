/* Connects CircuiTree API with Wicked Reports APIKey
for Prepared Marketing.

Uses Promises for asynchronous requests & faster results
with better error handling.

by Joel Hawkins, Creative Circle */

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
    ExportQueryID,
    options,
    sourceSystem,
    ApiToken,
    CompanyAPIURL,
    testMode;

/* ---------------------------------------------------
Set the type of object and the year we want to fetch
e.g. in command line type:
    npm start contacts 2018
    npm start orders 2017
    npm start products
    npm test
 ----------------------------------------------------- */
var args = process.argv.slice(2);
var exportType = args[0], // can be 'orders', 'contacts', or 'products'
    eventYear = args[1],
    // testMode tells Wicked Reports to store data in the 'test'
    // database which is accessible from the API testing menu
    testMode = process.env.NODE_ENV === 'test'
        ? 1
        : false;

// Set CircuiTree ExportQueryID
switch (exportType) {
    case "orders":
        ExportQueryID = -195; // -195 for Registration Accounting summary
        break;
    case "contacts":
        ExportQueryID = 124; // 124 for contacts
        break;
    case "products":
        ExportQueryID = -397; // -397 for Event Availability
        break;
    default:
        throw console.error("Incorrect syntax! Use 'npm start orders YYYY\n'");
}

/* -----------------------------------
   BRING YOUR OWN CONFIGURATION FILE
   ----------------------------------- */
// Fetches credentials for Wicked Reports and CircuiTree
// Run test environment by default
var env = process.env.NODE_ENV || 'test';
var config = require('./config')[env];

// CircuiTree login info:
let sourceSystem = config.circuiTree.SourceSystem;
let circuiTree = config.circuiTree;

// Wicked Reports credentials:
let wrApiKey = config.wicketReports.ApiKey;


/* -----------------------------------
    CircuiTree Request
   ----------------------------------- */

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

circuiTreeQuery(options);


/* ------------------------------------
    CircuiTree Request Function
   ----------------------------------- */

// Send the POST request
function circuiTreeQuery (options) {
    rp(options).then(function(response) {
        // POST successful
        // Store ApiToken, CompanyAPIURL
        ApiToken = response.ApiToken;
        CompanyAPIURL = response.CompanyAPIURL;

        /* Now we can make get some data!
           url depends on which service you want to use
           (see https://api.mycircuitree.com/TBM/Services.aspx) */

        /* We need to run ExportQueries, build query below
           Run the custom query ID '124' (Registration List – Detailed Email),
           Registration Accounting Summary '-195', or Event Availability '-397' */

        /* The setup below will be specific to the data you are attempting
           to export. For this use case, we added some additional parameters
           to capture only active registrations and active attendees        */

        var requestURL = CompanyAPIURL + "/Exports/ExecuteQuery.json",
            requestQuery = {
                ApiToken: ApiToken,
                ExportQueryID: ExportQueryID,
                QueryParameters: []
            };
        if (ExportQueryID === -397) { // Products
            requestQuery.QueryParameters = [
                {
                    'ParameterID': 230, // Attendee selection
                    'ParameterValue': 1 // "Yes"
                }
            ];
        } else { // Order or contacts - both ExportQueryIDs use same ParameterIDs
            requestQuery.QueryParameters = [
                {
                    'ParameterID': 7, // Event Year
                    'ParameterValue': eventYear // use "2004|2005" to get multiple years
                }, {
                    'ParameterID': 51, // Registration Status
                    'ParameterValue': 1 // "Active"
                }
            ];
        }

        options.url = requestURL;
        options.body = requestQuery;

        return rp(options).then(function(response) {

            var results = JSON.parse(response.Results);

            // wrInsertContacts returns an array of promises
            if (exportType === "contacts") {
                return promise.all(wrInsertContacts(results)).then(function(response) {
                    // all requests were successful
                    // console.log(JSON.stringify(response, null, 2));
                    console.log("Success!");
                }).catch(function(err) {
                    throw new Error(err);
                });
            }

            // wrInsertOrders returns an array of promises
            if (exportType === "orders") {
                return promise.all(wrInsertOrders(results)).then(function(response) {
                    // all requests were successful
                    // console.log(JSON.stringify(response, null, 2));
                    console.log("Success!");
                }).catch(function(err) {
                    throw new Error(err);
                });
            }

            // wrInsertProducts returns an array of promises
            if (exportType === "products") {
                return promise.all(wrInsertProducts(results)).then(function(response) {
                    // all requests were successful
                    // console.log(JSON.stringify(response, null, 2));
                    console.log("Success!");
                }).catch(function(err) {
                    // console.log(JSON.stringify(err, null, 2));
                    throw new Error(err);
                });
            } else /* if (exportType != "contacts" || exportType != "orders" || exportType != "products") */ {
                throw new Error("Please use the syntax: 'npm start orders 2016' or 'npm products' and try again.\n");
            }
        }).catch(function(err) {
            throw new Error(err);
        });
    }).catch(function(err) {
        // POST failed
        console.error(JSON.stringify(err, null, 2));
        throw new Error(err);
    });
}


/* ------------------------------------
    Wicked Reports functions
   ----------------------------------- */

// XXX: Insert Contacts
// input is CircuiTree query 124 results
function wrInsertContacts(results) {

    var wrContacts = results.map(function(ct) {
        return {
            "SourceSystem": sourceSystem, // TBMCircuiTree
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
        url: 'https://api.wickedreports.com/contacts',
        headers: {
            'Content-Type': 'application/json',
            'apikey': wrApiKey
        },
        timeout: 5000000,
        body: '',
        json: true
    };

    // determined by NODE_ENV
    if (testMode) {
        options.headers.test = 1;
    }

    for (var i = 0; i < arrays.length; i++) {
        options.body = arrays[i];
        console.log(options.body[0]);
        promises.push(rp(options));
    }

    return promises;
}

// XXX: Insert Products
// Update 6 Nov. 2017 - by Joel Hawkins to add products
// Map ProductID to ProductName in Wicked Reports where
// EventID => ProductID
// LocationName => ProductName
function wrInsertProducts(results) {

    var wrProducts = results.map(function(ct) {
        return {
            "SourceSystem": sourceSystem, // CircuiTree-Products
            "SourceID": ct.EventID, // varchar(500) REQUIRED// product id in the original system
            "ProductName": ct.LocationName, // varchar(500) REQUIRED//
            "ProductPrice": ct.EventDivisionPrice // decimal(18,2) REQUIRED//
        };
    });

    // splice into arrays of max length 1000
    // as per Wicked Reports limit
    var arrays = [],
        size = 1000;
    while (wrProducts.length > 0) {
        arrays.push(wrProducts.splice(0, size));
    }

    var promises = [];

    var options = {
        method: 'POST',
        url: 'https://api.wickedreports.com/products',
        headers: {
            'Content-Type': 'application/json',
            'apikey': wrApiKey
        },
        timeout: 5000000,
        body: '',
        json: true
    };

    // determined by NODE_ENV
    if (testMode) {
        options.headers.test = 1;
    }

    for (var i = 0; i < arrays.length; i++) {
        options.body = arrays[i];
        console.log(options.body[0]);
        promises.push(rp(options));
    }

    return promises;
}

// XXX: Insert Orders
// NEW 13 Sept. 2017 - by Joel Hawkins to get Orders
// input is CircuiTree query -195 results: orders
function wrInsertOrders(results) {

    var wrOrders = results.map(function(ct) {
        // orderTotal should be the sum of all charges, discounts, and Scholarships
        // This may be different than Payments

        /* The total amount paid should be totalPayments = Payments + GiftCardPayments
           ignore the ( variable ? variable : 0 ) things. This just means "does variable exist" ? value_if_true : value_if_false
           this way we don't get errors for having blank, null, or NaN ("Not a Number"), not all contacts have these values.  */
        var chargesTotal = (
            ct.Charges
            ? ct.Charges
            : 0) + (
            ct.Discounts
            ? ct.Discounts
            : 0) + (
            ct.Scholarships
            ? ct.Scholarships
            : 0) + (
            ct.ReservationCharges
            ? ct.ReservationCharges
            : 0) + (
            ct.MiscellaneousCharges
            ? ct.MiscellaneousCharges
            : 0) + (
            ct.GiftCardCharges
            ? ct.GiftCardCharges
            : 0);

        var orderTotal = ct.Payments
            ? ct.Payments
            : chargesTotal;
        return {
            "SourceSystem": sourceSystem, // Chosen SourceSystem set in config.js file
            "SourceID": ct.ItineraryID, // ItineraryID unique ID for the itinerary
            "CreateDate": moment(ct.EventBeginDate).format("YYYY-MM-DD HH:mm:ss"), // (format: "YYYY-MM-DD HH:MM:SS" UTC time)
            "ContactID": ct.entityid, // (unique number for that specific individual (camper)) or RegistrationID (unique for the specific individual (camper) registration to a specific event). Preference?
            "ContactEmail": ct.BillingEmailAddress
                ? ct.BillingEmailAddress
                : '', //BillingEmailAddress
            "OrderTotal": Math.abs(orderTotal), // Charges + ReservationCharges + GiftCardCharges + MiscellaneousCharges (sum of these charges, as shown in spreadsheet)
            "Country": "USA", // (assuming all patrons are from the USA)
            "City": ct.HomeCity, // HomeCity
            "State": ct.HomeState, // HomeState
            "SubscriptionID": ct.ItineraryEntityID, // ItineraryEntityID [must be UNIQUE] entityID of the individual who is the administrator of the Itinerary (usually the parent)
            "OrderItems": [
                {
                    //array of order items: for best results I'll make sure Charges, Discounts, Scholarships, ReservationCharges, and MiscellaneousCharges are separate array items
                    "OrderItemID": "Charges", // either one of [Charges, Discounts, Scholarships, ReservationCharges, MiscellaneousCharges] OR RegistrationID (unique for the specific individual (camper) registration to a specific event). Probably depends on what you think "ContactID" should be...
                    "ProductID": ct.EventID,
                    "ProductName": ct.EventFullName,
                    "Qty": ct.RegistrationQuantity, // (only makes sense, right?)
                    "PPU": Math.abs(ct.Charges)
                        ? Math.abs(ct.Charges)
                        : 0
                }, {
                    "OrderItemID": "Discounts",
                    "ProductID": ct.EventID,
                    "ProductName": ct.EventFullName,
                    "Qty": ct.RegistrationQuantity,
                    "PPU": Math.abs(ct.Discounts)
                        ? Math.abs(ct.Discounts)
                        : 0
                }, {
                    "OrderItemID": "ReservationCharges",
                    "ProductID": ct.EventID,
                    "ProductName": ct.EventFullName,
                    "Qty": ct.RegistrationQuantity,
                    "PPU": Math.abs(ct.ReservationCharges)
                        ? Math.abs(ct.ReservationCharges)
                        : 0
                }, {
                    "OrderItemID": "Scholarships",
                    "ProductID": ct.EventID,
                    "ProductName": ct.EventFullName,
                    "Qty": ct.RegistrationQuantity,
                    "PPU": Math.abs(ct.Scholarships)
                        ? Math.abs(ct.Scholarships)
                        : 0
                }, {
                    "OrderItemID": "MiscellaneousCharges",
                    "ProductID": ct.EventID,
                    "ProductName": ct.EventFullName,
                    "Qty": ct.RegistrationQuantity,
                    "PPU": Math.abs(ct.MiscellaneousCharges)
                        ? Math.abs(ct.MiscellaneousCharges)
                        : 0
                }, {
                    "OrderItemID": "GiftCardCharges",
                    "ProductID": ct.EventID,
                    "ProductName": ct.EventFullName,
                    "Qty": ct.RegistrationQuantity,
                    "PPU": Math.abs(ct.GiftCardCharges)
                        ? Math.abs(ct.GiftCardCharges)
                        : 0
                }
            ],
            "OrderPayments": [
                {
                    //array related to the order payment transactions
                    "PaymentDate": moment(ct.EventBeginDate).format("YYYY-MM-DD HH:mm:ss"), // (this field is required, but I'm not sure if this is accessible using this particular query) (format: "YYYY-MM-DD HH:MM:SS" UTC Time )
                    "Amount": Math.abs(ct.Payments)
                        ? Math.abs(ct.Payments)
                        : 0, // this will be the dollar amount of [Charges, Discounts, Scholarships, ReservationCharges, MiscellaneousCharges], same as PPU?
                    "Status": "APPROVED" // (constant)
                }, {
                    "PaymentDate": moment(ct.EventBeginDate).format("YYYY-MM-DD HH:mm:ss"),
                    "Amount": Math.abs(ct.GiftCardPayments)
                        ? Math.abs(ct.GiftCardPayments)
                        : 0,
                    "Status": "APPROVED"
                }
            ]
        };
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
            'apikey': wrApiKey
        },
        timeout: 5000000,
        body: '',
        json: true
    };

    // determined by NODE_ENV
    if (testMode) {
        options.headers.test = 1;
    }

    for (var i = 0; i < arrays.length; i++) {
        options.body = arrays[i];
        console.log(options.body[0]);
        promises.push(rp(options));
    }

    return promises;
}
