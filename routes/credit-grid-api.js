bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
//const CreditgridOld = require("../models/credit-grid-old-schema.js");
const CreditGrid = require('../models/credit-grid-schema.js');
const CreditGridRules = require('../models/credit-grid-rules-schema.js');

const jwt = require('../util/jwt');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get('/api/credit_grid_rules/:id', async (req, res, next) => {
    try {
      const creditGridResp = await CreditGrid.getAll(req.params.id);
      if (!creditGridResp.length)
        throw {
          message: 'No records found in credit grid against this product',
        };
      const gridRulesResp = await CreditGridRules.getAll(req.params.id);
      if (!gridRulesResp.length)
        throw {
          success: false,
          message:
            'No records found for credit grid rules against this product',
        };
      let resData = [];
      gridRulesResp.forEach((rule) => {
        creditGridResp.forEach((grid) => {
          if (rule.credit_grid_id === grid._id) {
            let resObj = {
              credit_grid_id: rule.credit_grid_id,
              product_id: rule.product_id,
              company_id: rule.company_id,
              title: grid.title,
              status: grid.status,
              key: rule.key,
              formula: rule.formula,
              value: rule.value,
            };
            resData.push(resObj);
          }
        });
      });
      return res.status(200).send({
        success: true,
        data: resData,
      });
    } catch (error) {
      return res.status(400).json(error);
    }
  });

  app.get('/api/credit_grid/:id', async (req, res, next) => {
    try {
      const creditGridResp = await CreditGrid.getAll(req.params.id);
      if (!creditGridResp.length)
        throw {
          message: 'No records found in credit grid against this product',
        };
      return res.status(200).send({
        success: true,
        data: creditGridResp,
      });
    } catch (error) {
      return res.status(400).json(error);
    }
  });

  app.post(
    '/api/credit_grid',
    [
      check('grid_rules')
        .isArray()
        .notEmpty()
        .withMessage('Atleast one credit grid rule is required'),
      check('title').notEmpty().withMessage('Title is required'),
    ],
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const data = req.body;
        const gridAlreadyExist = await CreditGrid.checkIfExistsByPID(
          req.product._id,
          data.title,
        );
        if (gridAlreadyExist)
          throw {
            message:
              'Credit grid is already defined for this product with this title',
          };
        const gridData = {
          product_id: req.product._id,
          company_id: req.company._id,
          lender_id: data.lender_id ? data.lender_id : '',
          title: data.title,
        };
        const addCreditGrid = await CreditGrid.addNew(gridData);
        if (!addCreditGrid)
          throw {
            message: 'Something went wrong while inserting credit grid data.',
          };
        if (addCreditGrid) {
          const rulesData = [];
          data.grid_rules.forEach((item) => {
            item.credit_grid_id = addCreditGrid._id;
            item.company_id = req.company._id;
            item.product_id = req.product._id;
            item.key = item.key;
            item.formula = item.formula;
            item.value = item.paramValue;
            rulesData.push(item);
          });
          const addGridRules = await CreditGridRules.addInBulk(rulesData);
          if (!addGridRules)
            throw {
              message:
                'Something went wrong while inserting credit grid rules.',
            };
          return res.status(200).send({
            success: true,
            message: `credit grid added successfully for ${req.product.name} `,
          });
        }
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );

  app.post(
    '/api/bureau_against_product',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const data = req.body;
        const msg = data.status == 'active' ? 'activated' : 'deactivated';
        const gridResp = await CreditGrid.getByGridId(data.credit_grid_id);
        if (gridResp.product_id !== req.product._id)
          throw {
            message: 'credit grid is not associated with selected product',
          };
        const activateBureau = await CreditGrid.updateGridStatus(
          data.status,
          req.product._id,
          data.credit_grid_id,
        );
        if (!activateBureau)
          throw {
            message: 'error while activating credit grid status',
          };
        const upateStatus = await CreditGrid.defineGrid(
          req.product._id,
          data.credit_grid_id,
        );
        return res.status(200).send({
          success: true,
          message: `Credit grid status ${msg} successfully.`,
        });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );

  app.post(
    '/api/process_credit_grid',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const activeCreditGrid = await CreditGrid.getActiveGrid(
          req.product._id,
        );
        if (!activeCreditGrid.length) {
          return res.send(activeCreditGrid);
          //throw { message: "credit grid is not active for this product" };
        }
        if (activeCreditGrid.length) {
          return res.send(activeCreditGrid);
        }
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );

  app.put(
    '/api/credit_grid_status/:id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const status = req.body;
        const updateStatusResp = await CreditGrid.updateStatus(
          status,
          req.product._id,
          req.params.id,
        );
        const msg = req.body.status == 'active' ? 'activated' : 'deactivated';
        if (updateStatusResp) {
          return res.status(200).send({
            success: true,
            message: `Credit grid status ${msg} successfully.`,
          });
        }
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );
};
