/* ----------------------------------------
  Below is an example configuration of how
  one should set up their configuration file
  before attempting to export live data.
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
            'CompanyCode': 'yourCompanyCode' // e.g. '12'
        },
        wicketReports: {
            // Official Wicked Reports test ApiKey
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
            'CompanyCode': 'yourCompanyCode' // e.g. '12'
        },
        wicketReports: {
            ApiKey: 'F76AahJFyq7NC25jSjQ4mO2twEXddmhO'
        }
    }
};
module.exports = config;
