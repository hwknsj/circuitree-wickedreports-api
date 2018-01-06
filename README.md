# CircuiTree / Wicked Reports Data API <small> by [Joel Hawkins](https://joel.fm)</small>

This is a fairly simple Node.js package that automates the extraction of CRM data from [CircuiTree](https://circuitree.com/), cleans and properly formats it for [Wicked Reports](http://www.wickedreports.com/) which allows for better data analysis & marketing insight. This tool is operated via the terminal/command-line; however, cross-platform scripts are included to make it more accessible to users of any technical level.

## About the API

According to the official website,
> *[CircuiTree](https://circuitree.com/) is a complete camp management software designed by Kanakuk Kamps. Easily keep track of your finances, staff, guest groups and campers all in one convenient and easy to use dashboard.*

As great as that excerpt sounds, CircuiTree and the tools included are unlikely to provide any useful marketing insight. Likewise, CircuiTree's [API documentation](https://support.circuitree.com/knowledgebase/api-documentation/) is just as tragic. On the other hand, [Wicked Reports' API documentation](https://wickedreports.helpdocs.com/getting-started-with-wicked-reports/wicked-reports-api-documentation) is quite simple and straightforward. Since CircuiTree does not natively connect with Wicked Reports, hopefully this code repository will help relieve the excruciatingly difficult chore of attempting to connect these two platforms.

### Requirements
- [Node.js](https://nodejs.org) (and NPM (Node Package Manager), included in installation)
- [CircuiTree](https://circuitree.com/) database access
    - You will need to be able to access the backend data warehouse–a URL which is unique to each account–to find the appropriate `ExportQueryID`s and `ParameterID`s for your data
- [Wicked Reports](http://wickedreports.com/) dashboard access

## Installation

After Node.js has been installed, clone/unzip the repository to your local machine and fire up the terminal/command-line in the same directory. Then, simply run
```sh
npm install
```
to install package dependencies.

## Usage

As seen in `package.json`, there are a few different shortcut scripts one can use. Wicked Reports requires that *Products*, *Contacts*, and *Orders* be imported in a specific order.

The first step is to set up your CircuiTree and Wicked Reports credentials in the `config.js` file (see `config-example.js` for an example of the correct formatting). Once done, the first step is to import *Products* from CircuiTree to Wicked Reports.

Depending on how you (or your client) use(s) CircuiTree, you may have custom queries that provide different data. As such, you may need to edit `index.js` (in particular the `ExportQueryID`, `ParameterID`, and `ParameterValue` variables). However, this package uses three default queries:

1. **Event Availability**, `ExportQueryID = -397`
    - This is our Product list. Each 'Event', or camp session, is a product with a unique ID.
2. **Registration Accounting Summary**, `ExportQueryID = -195`
    - This export provides he information required for importing Contacts
3. **Registration List – Detailed Email**, `ExportQueryID = 124`
    - The data contained here will act as our 'Orders' database

The Wicked Reports documentation is clear that this data **must be imported in the proper order using the same `SourceSystem`**:

1. Import **Products** by POST to `/products`
    - According to the documentation: "be sure to pass Product Name information when using the API as well as including the Product in the OrderItems of the Orders."
    - *I assume that in this call, `SourceID` must match what we use as the `ProductID` in step 3 when we import Orders*
2. Import **Contacts** by POST to `/contacts`
3. Import **Orders** by POST to `/orders`
    - Here we include the `OrderItems` and `OrderPayments` in a single call. My assumption, again, is that `OrderItems` must contain `ProductID` which matches `SourceID` in step 1 where we first import **Products**. In other words, **Orders** inherit their `ProductName` based on a join between `Orders.OrderItems.ProductID => Products.SourceID`

### In Short...

Once installed and properly configured credentials, open a terminal/command-line in the relevant directory and use the following shortcut commands:

*To import products (i.e. Event names)*
```sh
npm start products
```

*To import **Contacts** *
```sh
npm start contacts YYYY
```
where 'YYYY' is the four-digit year. Use 'YYYY|YYYY|...|YYYY' to import multiple years.

*To import **Orders** *
```sh
npm start orders YYYY
```
where 'YYYY' is the four-digit year. Again, use 'YYYY|YYYY|...|YYYY' to import multiple years.

> **Note:** To make use of Wicked Reports test API, you can use `npm test` instead of `npm start` in any of the above commands. Read the official documentation for a better explanation of what this does.


### Examples

To import all the **Products**, **Contacts**, and **Orders** for the year 2017, perform the following commands:
```sh
npm start products
npm start contacts 2017
npm start orders 2017
```

To do the same for multiple years, simply separate the four-digit year with a pipe character, '|':
```sh
npm start products
npm start contacts '2016|2017'
npm start orders '2016|2017'
```

## Contact Me
If you have any questions, feel free to reach me at [hwknsj@gmail.com](mailto:hwknsj@gmail.com) or [joel@joel.fm](mailto:joel@joel.fm).

Also check out my websites:
- [joel.fm](https://joel.fm) (a web portfolio)
- [joelhawkins.info](https://joelhawkins.info) (contains more project information, resume, and more)
- [jpng.info](https://jpng.info) (my art website)

You can also find me on
- [LinkedIn @hwknsj](https://linkedin.com/in/hwknsj)
- [Behance @hwknsj](https://www.behance.net/hwknsj)
- [Instagram @joel.biz](https://instagram.com/joel.biz)
- [SoundCloud @joel.biz](https://soundcloud.com/joelbiz).
