bodyParser = require('body-parser');
const CustomerSchema = require('../models/customer-schema');
const jwt = require('../util/jwt');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get(
    '/api/customer',
    [ 
      jwt.verifyToken,
      jwt.verifyUser,
    ],
    async (req,res) => {
      try {
        const page = req.query.page || '0';
        const str = req.query.str || '';

        const customers = await CustomerSchema.fetchCustomerListByFilter({
          page: Number(page),
          str,
          limit: 10
        });
        if(customers.count === 0 || customers.data.length === 0) {
          throw {
            message: "No Customers found"
          }
        }
        res.status(200).send(customers);
      } catch (error) {
        return res.status(400).send(error);
      }
    }
  )

  app.get(
    '/api/customer-profile/:custId',
    [
      jwt.verifyToken,
      jwt.verifyUser,
    ],
    async (req,res) => {
      try {
        const customerId = req.params.custId;

        const customerDetails = await CustomerSchema.fetchCustomerDetails(customerId);
        if(!customerDetails.length) {
          throw{
            message: "Customer Id doesn't exist"
          }
        }
        const customerLoanLineData = await CustomerSchema.fetchCustomerLoanLineDetails(customerId);
        
        let loanDetails = {
          total_exposure: 0,
          data: []
        };

        let lineDetails = {
          total_exposure: 0,
          data: []
        };

        if (customerLoanLineData[0]?.type == "Loan") {
          loanDetails.total_exposure = customerLoanLineData[0].total_exposure;
          loanDetails.data = customerLoanLineData[0].data;
        }
        else if (customerLoanLineData[1]?.type == "Loan") {
          loanDetails.total_exposure = customerLoanLineData[1].total_exposure;
          loanDetails.data = customerLoanLineData[1].data;
        }

        if (customerLoanLineData[0]?.type == "Line") {
          lineDetails.total_exposure = customerLoanLineData[0].total_exposure;
          lineDetails.data = customerLoanLineData[0].data;
        }
        else if (customerLoanLineData[1]?.type == "Line") {
          lineDetails.total_exposure = customerLoanLineData[1].total_exposure;
          lineDetails.data = customerLoanLineData[1].data;
        }

        const customerProfileDetails = {
          customerDetails: customerDetails[0],
          customerLoanDetails: loanDetails,
          customerLineDetails: lineDetails
        }
        
        res.status(200).send(customerProfileDetails);
      } catch (error) {
        return res.status(400).send(error);
      }
    }
  )
}
