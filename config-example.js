/* ----------------------------------------
  Below is an example configuration of how
  one should set up their configuration file
  before attempting to export live data.
  Make sure to adjust and rename to 'config.js'
  ----------------------------------------- */

const config = {
    // testing environment
    test: {
        // CT login info is the same regardless
        // password may be subject to change
        circuiTree: {
            'SourceSystem': 'MyCircuiTreeTestSource',
            'APIKey': '99e734b0-16d5-4216-9369-76e188a92fc1',
            'Username': 'yourUsername',
            'Password': 'yourPassword',
            'CompanyCode': 'yourCompanyCode' // e.g. '12', a string int
        },
        wickedReports: {
            /* Official Wicked Reports test ApiKey.
              *Note that this is different from using
               the NODE_ENV='test' which will import
               data into a testing database on your
               Wicked Reports dashboard             */
            ApiKey: 'F76AahJFyq7NC25jSjQ4mO2twEXddmhO'
        }
    },
    // production environment
    production: {
        circuiTree: {
            'SourceSystem': 'MyCircuiTreeSourceSystem',
            'APIKey': '99e734b0-16d5-4216-9369-76e188a92fc1',
            'Username': 'yourUsername',
            'Password': 'yourPassword',
            'CompanyCode': 'yourCompanyCode' // e.g. '12', a string int
        },
        wickedReports: {
            ApiKey: 'F76AahJFyq7NC25jSjQ4mO2twEXddmhO'
        }
    }
};
module.exports = config;
