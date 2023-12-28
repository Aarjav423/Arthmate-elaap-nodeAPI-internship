const bodyParser = require('body-parser');
const { request } = require('http');
const ColenderProfile = require('../models/co-lender-profile-schema.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get('/api/co-lender-profile', async (req, res) => {
    try {
      const profileRes = await ColenderProfile.getAll();
      res.send(profileRes);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get('/api/co-lender-profile/:id', async (req, res) => {
    try {
      const profileRes = await ColenderProfile.findById(req.params.id);
      return res.send(profileRes);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post('/api/co-lender-profile', async (req, res) => {
    try {
      const profileData = req.body;
      const shortCode = await ColenderProfile.findByShortCode(
        profileData.co_lender_shortcode,
      );
      if (shortCode) {
        throw {
          message: 'co_lender_shortcode must be unique',
        };
      }
      const profileRes = await ColenderProfile.addOne(profileData);
      if (!profileRes) {
        throw {
          message: 'Error while adding co_lender profile detail to database',
        };
      }
      return res.send({
        message: 'Colender Profile Detail created successfully.',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.put('/api/co-lender-profile/:id', async (req, res) => {
    const colenderId = req.params.id;
    const userData = req.body;
    const userRes = {
      co_lender_id: userData.co_lender_id,
      co_lender_name: userData.co_lender_name,
      co_lending_share: userData.co_lending_share,
      co_lending_mode: userData.co_lending_mode,
      co_lender_shortcode: userData.co_lender_shortcode,
      is_rps_by_co_lender: userData.is_rps_by_co_lender,
      escrow_account_number: userData.escrow_account_number,
      escrow_account_beneficiary_name: userData.escrow_account_beneficiary_name,
      escrow_account_ifsc_code: userData.escrow_account_ifsc_code,
      escrow_repayment_account_number: userData.escrow_repayment_account_number,
      escrow_repayment_account_ifsc_code:
        userData.escrow_repayment_account_ifsc_code,
      foreclosure_share: userData.foreclosure_share,
      lpi_share: userData.lpi_share,
      status: userData.status,
    };
    // const productFetched = req.body.product;
    const productFetched = { product_types: req.body.product_types };

    const completeProduct = {
      ...userRes,
      ...productFetched,
    };
    try {
      const colenderUpdated = await ColenderProfile.updateOne(
        colenderId,
        completeProduct,
      );
      res.send({
        message: 'Colender Profile data updated successfully.',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get('/api/co-lender-profile-newcolenderid', async (req, res) => {
    try {
      const profileRes = await ColenderProfile.getNextColenderId();
      res.send(profileRes);
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};
