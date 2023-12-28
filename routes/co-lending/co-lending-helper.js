const { validationResult } = require("express-validator")
const s3Helper = require("../../util/s3helper")
const coLenderReqResSchema = require("../../models/co-lender-request-response-schema.js")

const errorCodes = new Map(
    [
        ['isEmpty', 'ERR_400'],
        ['txnAmount', 'ERR_401'],
        ['tnxReferenceDatetime', 'ERR_402'],
        ['utrDatetimeStamp', 'ERR_403'],
        ['loanIdNotValid', 'ERR_404'],
        ['duplicateUtrNumber','ERR_405']
    ]
)

const saveCoLenderReqResLogs = (data) =>{
    const key = `CO-LENDER-API/${data.co_lender_shortcode}/${data.api_name}/${data.request_type}/${Date.now()}.txt`;
    s3Helper.uploadFileToS3(data.raw_data,key)
        .then(s3obj => {
            data.raw_data = s3obj.Location
            coLenderReqResSchema.addOne(data)
        })
        .catch(() => {
            return
        })
}

const validateCoLenderRepaymentRequestBody = (req) => {
    const error = validationResult(req)
    const body = req.body
    if(!error.isEmpty()) throw {
        "code" : errorCodes.get('isEmpty'),
        "success" : false,
        "message" : error.errors[0]["msg"]
    }
    if (body?.txn_amount < 1) throw {
        "code" : errorCodes.get('txnAmount'),
        "success" : false,
        "message" : "txn_amount is not valid"
    }
    const today = new Date()
    if (today < new Date(body?.txn_reference_datetime)) throw {
        "code" : errorCodes.get('tnxReferenceDatetime'),
        "success" : false,
        "message" : "txn_reference_datetime is in future"
    }
    if (today < new Date(body?.utr_date_time_stamp)) throw {
        "code" : errorCodes.get('utrDatetimeStamp'),
        "success" : false,
        "message" : "utr_date_time_stamp is in future"
    }
}

const buildLedgerDetails = (loan, body, co_lender, company, product) => {
    return {
        loan_id : loan.loan_id,
        partner_loan_id : loan.partner_loan_id,
        payment_mode : body?.payment_mode,
        created_by : co_lender?.co_lender_name,
        txn_entry : "cr",
        txn_amount : Math.round(( body?.txn_amount * 1 + Number.EPSILON) * 100) / 100,
        txn_reference : body?.txn_reference ?? "",
        txn_reference_datetime : body?.txn_reference_datetime,
        label : "repayment",
        utr_number : body?.utr_number,
        utr_date_time_stamp : body?.utr_date_time_stamp,
        company_id : loan.company_id,
        company_name : company.name,
        product_id : loan.product_id,
        product_name : product.name,
        is_received : "Y",
        is_processed : "Y"
    }
}

const internalServerError = {
    "code" : "ERR_500",
    "success" : false,
    "message" : "Internal server error"
}

module.exports = {
    saveCoLenderReqResLogs,
    validateCoLenderRepaymentRequestBody,
    buildLedgerDetails,
    internalServerError,
    errorCodes
}