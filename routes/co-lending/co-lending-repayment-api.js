const jwt = require("../../util/jwt")
const { check } = require("express-validator")
const borrowerinfoCommon = require("../../models/borrowerinfo-common-schema")
const transactionLedger = require("../../models/loan-transaction-ledger-schema")
const companySchema = require("../../models/company-schema")
const productScheam = require("../../models/product-schema")
const {
    saveCoLenderReqResLogs,
    validateCoLenderRepaymentRequestBody,
    buildLedgerDetails,
    internalServerError,
    errorCodes } = require("./co-lending-helper")

module.exports = app => {
    app.post(
        "/api/co-lending/repayment",
        [
            check("loan_id")
                .notEmpty()
                .withMessage("loan_id field is required"),
            check("txn_amount")
                .notEmpty()
                .withMessage("txn_amount field is required"),
            check("txn_reference_datetime")
                .notEmpty()
                .withMessage("txn_reference_datetime field is required")
                .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])\ (0[0-9]|1[0-9]|2[0123])\:([012345][0-9])\:([012345][0-9])$)/)
                .withMessage("txn_reference_datetime is not in 'yyyy-MM-dd HH:mm:ss'"),
            check("utr_number")
                .notEmpty()
                .withMessage("utr_number field is required"),
            check("utr_date_time_stamp")
                .notEmpty()
                .withMessage("utr_date_time_stamp field is required")
                .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])\ (0[0-9]|1[0-9]|2[0123])\:([012345][0-9])\:([012345][0-9])$)/)
                .withMessage("utr_date_time_stamp is not in 'yyyy-MM-dd HH:mm:ss'"),
            check("payment_mode")
                .notEmpty()
                .withMessage("payment_mode field is required")
        ],
        [
            jwt.verifyCoLenderToken
        ],
        async(req,res) => {
            const { body, co_lender } = req
            const request_id = `CO-LENDER-REPAYMENT-${new Date().getTime()}`
            let reqResLog = {
                request_id,
                co_lender_id : co_lender.co_lender_id,
                co_lender_shortcode : co_lender.co_lender_shortcode,
                api_name : "co-lender-repayment",
                request_type : "request",
                status : true,
                raw_data : body
            }
            try { 
                saveCoLenderReqResLogs(Object.assign({},reqResLog))
                validateCoLenderRepaymentRequestBody(req)
                const loan = await borrowerinfoCommon.findByLoanIdAndCoLenderId({
                    co_lender_id : co_lender?.co_lender_id,
                    loan_id : body?.loan_id
                });
                if (!loan) throw {
                    "code" : errorCodes.get('loanIdNotValid'),
                    "success" : false,
                    "message" : "Loan id is not valid"
                }
                const duplicatUtrDetails = await transactionLedger.findRepaymentByLoanIdAndUtr(loan.loan_id, body?.utr_number.trim());
                if (duplicatUtrDetails) throw {
                    "code" : errorCodes.get('duplicateUtrNumber'),
                    "success" : false,
                    "message" : `Duplicate utr number '${duplicatUtrDetails.utr_number}' found for the loan id '${loan.loan_id}'`
                }
                const company = await companySchema.findByCompanyId(loan.company_id)
                if (!company) throw internalServerError
                const product = await productScheam.findByProductIds(loan.product_id)
                if (!product) throw internalServerError
                let ledger = buildLedgerDetails(loan, body, co_lender, company, product)
                ledger = transactionLedger.addNew(ledger)
                if (!ledger) throw internalServerError
                reqResLog.request_type = "response"
                reqResLog.status = true
                reqResLog.raw_data = {request_id}
                saveCoLenderReqResLogs(Object.assign({},reqResLog))
                return res.status(200).send({request_id})
            } catch(error) {
                reqResLog.request_type = "response"
                reqResLog.status = false
                reqResLog.raw_data = error
                saveCoLenderReqResLogs(Object.assign({},reqResLog))
                if ([...errorCodes.values()].includes(error.code)) return res.status(400).send(error)
                return res.status(500).send(error.message ? error : internalServerError)
            }
        }
    )
}
