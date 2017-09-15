// NEW 13 Sept. 2017 - by Joel Hawkins to get Orders
// Need to do some math... we are going to
// input is CircuiTree query -195 results: order

// orderTotal should be the sum of all charges, discounts, and Scholarships
// This may be different than Payments

// The total amount paid should be totalPayments = Payments + GiftCardPayments
// ignore the ( variable ? variable : 0 ) things. This just means "does variable exist" ? value_if_true : value_if_false
// this way we don't get errors for having blank, null, or NaN ("Not a Number"), not all contacts have these values.
var orderTotal = (ct.Charges ? ct.Charges : 0)
    + (ct.Discounts ? ct.Discounts : 0)
    + (ct.Scholarships ? ct.Scholarships : 0)
    + (ct.ReservationCharges ? ct.ReservationCharges : 0)
    + (ct.MiscellaneousCharges ? ct.MiscellaneousCharges : 0)
    + (ct.GiftCardCharges ? ct.GiftCardCharges : 0);
return {
    "SourceSystem": "CircuiTree-Orders", // (constant)
    "SourceID": ct.ItineraryID, // ItineraryID unique ID for the itinerary
    "CreateDate": moment(ct.EventBeginDate).format("YYYY-MM-DD HH:mm:ss"), // (format: "YYYY-MM-DD HH:MM:SS" UTC time)
    "ContactID": ct.entityid, // (unique number for that specific individual (camper)) or RegistrationID (unique for the specific individual (camper) registration to a specific event). Preference?
    "ContactEmail": ct.BillingEmailAddress, //BillingEmailAddress
    "OrderTotal": (orderTotal
        ? orderTotal
     : 0), // Charges + ReservationCharges + GiftCardCharges + MiscellaneousCharges (sum of these charges, as shown in spreadsheet)
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
            "PPU": Math.abs(ct.MiscellaneousCharges)
                ? Math.abs(ct.MiscellaneousCharges)
             : 0
        }, {
            "OrderItemID": "GiftCardCharges",
            "Qty": ct.RegistrationQuantity,
            "PPU": Math.abs(ct.GiftCardCharges)
                ? Math.abs(ct.GiftCardCharges)
             : 0
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
