bodyParser = require('body-parser');
const RepaymentScheduleSchema = require('../models/repayment-schedule-dump-schema.js');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const ColenderRepaymentScheduleSchema = require('../models/co-lender-repayment-schedule-schema.js');
const LoanStateSchema = require('../models/loan-state-schema');
const s3helper = require('../util/s3helper.js');
const jwt = require('../util/jwt');
const { check, validationResult } = require('express-validator');
const thirdPartyHelper = require('../util/thirdPartyHelper');
const {
  failResponse,
  errorResponse,
  successResponse,
} = require('../utils/responses.js');
const RepaymentInstallment = require('../models/repayment-installment-schema');
const calculation = require('../util/calculation');
const repayment = require('../util/repayment');
const moment = require('moment');

module.exports = (app, connection) => {
  const getVal = (value) => {
    if (value?.$numberDecimal !== undefined) {
      return parseFloat(value.$numberDecimal.toString());
    } else if (typeof value === 'object') {
      return parseFloat(value.toString());
    }
    return value;
  };
  app.post(
    '/api/repayment_schedule/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      const colenderRepSchSwitch = req.body?.repayment_schedule_switch;
      try {
        const repaymentData = await RepaymentScheduleSchema.findByLoanId(
          req?.body?.loan_id,
        );
        if (repaymentData.length <= 0)
          return failResponse(req, res, {}, 'No record found for this loan_id');

        const scheduleData = new Promise((resolve, reject) => {
          try {
            let getJson = [];
            let counter = 0;
            repaymentData.map(async (item) => {
              if (item?.url !== '' && item?.url !== undefined) {
                const data = await s3helper.fetchJsonFromS3(
                  item.url.substring(item.url.indexOf(`${req?.body?.loan_id}`)),
                );
                if (
                  data?.repayment_schedule_json !== undefined &&
                  Array.isArray(data?.repayment_schedule_json)
                ) {
                  data?.repayment_schedule_json.forEach((entry) => {
                    getJson.push(entry);
                  });
                }
              }
              counter++;
              if (counter == repaymentData.length) {
                if (colenderRepSchSwitch) {
                  const colenderRepaymentInstallment =
                    await ColenderRepaymentScheduleSchema.findAllByLoanId(
                      req?.body?.loan_id,
                    );
                  let colenderRepaymentInstallments = [];
                  for (let ele of colenderRepaymentInstallment) {
                    if (
                      !process.env.NON_COLENDER_NAMES.includes(
                        ele.co_lender_shortcode,
                      )
                    ) {
                      colenderRepaymentInstallments.push(ele);
                    }
                  }
                  const _colenderInstallments = JSON.parse(
                    JSON.stringify(colenderRepaymentInstallments),
                  );

                  let colenderRepaymentInstallmentsJson = [];

                  if (_colenderInstallments) {
                    Array.from(_colenderInstallments).forEach((record) => {
                      colenderRepaymentInstallmentsJson.push({
                        ...record,
                        emi_amount: getVal(record.emi_amount),
                        prin: getVal(record.prin),
                        int_amount: getVal(record.int_amount),
                        principal_bal: getVal(record.principal_bal),
                        principal_outstanding: getVal(
                          record.principal_outstanding,
                        ),
                      });
                    });
                  }

                  if (colenderRepaymentInstallmentsJson.length > 0)
                    getJson = [
                      ...getJson,
                      ...colenderRepaymentInstallmentsJson,
                    ];
                  const rowCount = getJson.length;
                  const sortedJsonData = getJson.sort(
                    (a, b) => a.emi_no - b.emi_no,
                  );
                  resolve({
                    rows: sortedJsonData,
                    count: rowCount,
                  });
                } else {
                  const repaymentInstallments =
                    await RepaymentInstallment.findAllByLoanId(
                      req?.body?.loan_id,
                    );

                  const newJson = JSON.parse(
                    JSON.stringify(repaymentInstallments),
                  );

                  let repaymentInstallmentsJson = [];

                  if (newJson) {
                    Array.from(newJson).forEach((record) => {
                      repaymentInstallmentsJson.push({
                        ...record,
                        emi_amount: getVal(record.emi_amount),
                        prin: getVal(record.prin),
                        int_amount: getVal(record.int_amount),
                        principal_bal: getVal(record.principal_bal),
                        principal_outstanding: getVal(
                          record.principal_outstanding,
                        ),
                      });
                    });
                  }

                  if (repaymentInstallmentsJson.length > 0)
                    getJson = [...getJson, ...repaymentInstallmentsJson];
                  const rowCount = getJson.length;
                  const sortedJsonData = getJson.sort(
                    (a, b) => a.emi_no - b.emi_no,
                  );
                  resolve({
                    rows: sortedJsonData,
                    count: rowCount,
                  });
                }
              }
            });
          } catch (error) {
            reject(error);
          }
        })
          .then((response) => {
            return successResponse(req, res, response);
          })
          .catch((error) => {
            return failResponse(
              req,
              res,
              {},
              'Error while fetching data from s3',
            );
          });
      } catch (error) {
        return errorResponse(req, res, error);
      }
    },
  );

  app.post(
    '/api/repayment_schedule',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    [
      check('loan_id').notEmpty().withMessage('loan_id is required'),
      check('borrower_id').notEmpty().withMessage('borrower_id is required'),
      check('partner_loan_app_id')
        .notEmpty()
        .withMessage('Partner_loan_app_id is required'),
      check('partner_borrower_id')
        .notEmpty()
        .withMessage('partner_borrower_id is required'),
      check('repayment_schedule_json')
        .notEmpty()
        .withMessage('repayment_schedule_json is required'),
    ],
    async (req, res, next) => {
      try {
        // Validate data in payload
        const data = req.body;

        const file = req?.files && req?.files[0];
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };

        //Validate if loan exist against loan_id
        const loanExist = await BorrowerinfoCommon.findOneWithKLID(
          data.loan_id,
        );
        if (!loanExist)
          throw {
            success: false,
            message: 'loan_id does not exist in loan records',
          };

        const repayment_Installments_Data =
          await RepaymentInstallment.findProcessedByLoanId(req?.body?.loan_id);
        if (repayment_Installments_Data?.processed === 'Y') {
          throw {
            success: false,
            message:
              'Few of repayment Installments have been processed, updating of repayment installment is not allowed.',
          };
        }
        // Validate product type is not loc
        if (req.product.allow_loc) {
          throw {
            success: false,
            message:
              'Upload repayment schedule is not enabled for this product as product is of type LOC.',
          };
        }
        // Validate repayment_schedule type is partner
        if (req.product.repayment_schedule !== 'partner') {
          throw {
            success: false,
            message:
              'Upload repayment schedule is not enabled for this product as repayment_schedule is not partner.',
          };
        }

        //Due date is non-mandatory if repayment_type is Daily in loan
        // check the date format of the first installment due_date
        if (loanExist.repayment_type !== 'Daily') {
          if (
            !moment(
              req.body?.repayment_schedule_json[0]?.due_date,
              'DD-MM-YYYY',
              true,
            ).isValid()
          ) {
            throw {
              success: false,
              message: 'due_date format should be in dd-mm-yyyy',
            };
          }
        }

        // Validate company_id and product_id with token
        const validateCompanyProductWithLAID =
          await jwt.verifyLoanAppIdCompanyProduct(req, loanExist.loan_app_id);
        if (!validateCompanyProductWithLAID.success)
          throw validateCompanyProductWithLAID;

        //Check Repayment Schedule Already Exist
        const repayScheduleAlreadyExist =
          await RepaymentScheduleSchema.findOneByLoanId(data.loan_id);
        //Prepare data to store in repayment_schedule_dump schema
        let dataObj = {
          company_id: req.company._id,
          product_id: req.product._id,
          loan_id: data.loan_id,
          source: 'partner',
        };
        // Call to the LMS repayment schedule api
        const lmsRecordRepaymentSchedule =
          await thirdPartyHelper.LMSRepaymentScheduleApi(data, req, res);
        if (!lmsRecordRepaymentSchedule?.success) {
          throw {
            success: false,
            message: 'Error while adding repayment schedule',
          };
        }
        let recordRepaymentSchedule = {};
        // Record data in repayment_schedule_dump schema
        if (!repayScheduleAlreadyExist) {
          recordRepaymentSchedule =
            await RepaymentScheduleSchema.addNew(dataObj);
          if (!recordRepaymentSchedule)
            throw {
              success: false,
              message: 'Error while adding repayment schedule',
            };
        }
        //Prepare data to add in repaymwnt installment table
        const repaymentInstallmentData =
          await req?.body?.repayment_schedule_json.map((record) => {
            return {
              ...record,
              loan_id: data?.loan_id,
              repay_schedule_id: recordRepaymentSchedule._id
                ? recordRepaymentSchedule._id
                : repayScheduleAlreadyExist
                ? repayScheduleAlreadyExist._id
                : '',
              company_id: req?.company?._id,
              product_id: req.product?._id,
              due_date:
                loanExist.repayment_type !== 'Daily'
                  ? moment(record.due_date, 'DD-MM-YYYY').format('YYYY-MM-DD')
                  : '',
              prin: Math.round((record.prin * 1 + Number.EPSILON) * 100) / 100,
              emi_amount:
                Math.round((record.emi_amount * 1 + Number.EPSILON) * 100) /
                100,
              int_amount:
                Math.round((record.int_amount * 1 + Number.EPSILON) * 100) /
                100,
            };
          });
        if (repayScheduleAlreadyExist) {
          //Check if repayment_installments already exist by repay_schedule_id
          const repaymentInstallmentAlreadyExist =
            await RepaymentInstallment.findByRepayScheduleId(
              repayScheduleAlreadyExist._id,
            );
          // If already exist then delete existing record and add newly passed data
          if (repaymentInstallmentAlreadyExist) {
            const deleteRepaymentInstallment =
              await RepaymentInstallment.deleteByRepayScheduleId(
                repayScheduleAlreadyExist._id,
              );
            if (!deleteRepaymentInstallment)
              throw {
                success: false,
                message:
                  'Error while deleting previous repayment installment data.',
              };
          }
        }

        //Record loan state data
        const recordLoanState = await repayment.recordLoanState(
          req,
          data,
          repaymentInstallmentData,
        );
        if (!recordLoanState?.success) throw recordLoanState;

        //Record repayment installment data
        const addRepaymentInstallment = await RepaymentInstallment.addInBulk(
          repaymentInstallmentData,
        );
        if (!addRepaymentInstallment)
          throw {
            success: false,
            message: 'Error while adding repayment installment data',
          };
        return res.status(200).send({
          success: true,
          message: 'Repayment schedule recorded successfully',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/generate_repayment_schedule',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    [
      check('loan_id').notEmpty().withMessage('loan_id is required'),
      check('borrower_id').notEmpty().withMessage('borrower_id is required'),
      check('partner_loan_app_id')
        .notEmpty()
        .withMessage('partner_loan_app_id is required'),
      check('partner_borrower_id')
        .notEmpty()
        .withMessage('partner_borrower_id is required'),
      check('repayment_type')
        .notEmpty()
        .withMessage(
          'Please enter valid repayment_type i.e. daily/monthly/weekly/quarterly',
        ),
      check('int_type')
        .notEmpty()
        .withMessage('Please entre valid int_type i.e. flat/reducing.'),
      check('emi_count')
        .notEmpty()
        .withMessage('emi_count is required')
        .isNumeric()
        .withMessage('emi_count should be numeric'),
      check('sanction_amount')
        .notEmpty()
        .withMessage('sanction_amount is required')
        .isNumeric()
        .withMessage('sanction_amount should be numeric'),
      check('intr_rate')
        .notEmpty()
        .withMessage('intr_rate is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(A|P)$/)
        .withMessage('Please enter valid intr_rate e.g. 1A/1P'),
      check('first_inst_date')
        .notEmpty()
        .withMessage('first_inst_date is required.')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid first_inst_date in YYYY-MM-DD format'),
    ],
    async (req, res, next) => {
      try {
        //validate data in payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const data = req.body;
        //validate if loan is exist by provided loan id
        const loanExist = await BorrowerinfoCommon.findOneWithKLID(
          data.loan_id,
        );
        if (!loanExist) {
          throw {
            success: false,
            message: 'No records found against provided loan_id',
          };
        }
        //Validate for the repayment_schedult type it should be custom
        if (req.product.repayment_schedule !== 'custom') {
          throw {
            success: false,
            message:
              'repayment_schedule configured in product should be custom',
          };
        }
        //prepare data for generating repayment schdule
        const repaymentScheduleData = {
          repayment_type: data.repayment_type,
          int_type: data.int_type,
          emi_count: data.emi_count,
          sanction_amount: data.sanction_amount,
          intr_rate: String(data.intr_rate).replace(/[a-zA-Z]+/g, '') * 1,
          first_inst_date: data.first_inst_date,
        };

        //generate repayment schedule
        const repaymentSchedule = await calculation.generateRepaySch(
          repaymentScheduleData,
          req.product,
        );
        if (!repaymentSchedule.success) {
          throw repaymentSchedule;
        }
        //store generated repayment schedule
        if (repaymentSchedule) {
          const addRepaymentSchedule = await repayment.storeRepaymentSchedule(
            req,
            data,
            repaymentSchedule.repaymentScheduleGenerated,
            res,
          );
          if (!addRepaymentSchedule)
            throw {
              addRepaymentSchedule,
            };
          if (addRepaymentSchedule) {
            return res.status(200).send({
              message: 'Repayment schedule recorded successfully',
              repaymentSchedule,
            });
          }
        }
        throw {
          success: false,
          message: 'Something went wrong while recording repayment schedule',
        };
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.patch(
    '/api/repayment-schedules/:loan_id/dues/:emi_no/',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const { emi_no, loan_id } = req.params;
        if ((await BorrowerinfoCommon.findOneWithKLID(loan_id)).stage != 4)
          throw {
            success: false,
            message: `Due cannot be raised for Non Active loans`,
          };
        const query = {
          emi_no,
          loan_id,
          $or: [{ processed: { $exists: false } }, { processed: 'N' }],
        };
        const update = [
          {
            $set: {
              original_due_date: '$due_date',
              due_date: new Date(moment().format('YYYY-MM-DD')),
              updated_by: req.user?.email,
              updated_at: new Date(),
            },
          },
        ];

        const updatedInstallment = await RepaymentInstallment.updateDueDate(
          query,
          update,
        );

        if (!updatedInstallment)
          throw {
            success: false,
            message:
              'Installment not found against the provided loan id and emi no',
          };

        let data = { ...updatedInstallment._doc };
        data.emi_amount = parseFloat(updatedInstallment.emi_amount.toString());
        data.prin = parseFloat(updatedInstallment.prin.toString());
        data.int_amount = parseFloat(updatedInstallment.int_amount.toString());

        // Check if principal_bal exists and update data object if it's present
        if (updatedInstallment.hasOwnProperty('principal_bal')) {
          data.principal_bal = parseFloat(
            updatedInstallment.principal_bal.toString(),
          );
        }

        // Check if principal_outstanding exists and update data object if it's present
        if (updatedInstallment.hasOwnProperty('principal_outstanding')) {
          data.principal_outstanding = parseFloat(
            updatedInstallment.principal_outstanding.toString(),
          );
        }

        return res.status(200).send({
          success: true,
          message: `Due raised successfully for Instalment number '${emi_no}`,
          data: data,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};
