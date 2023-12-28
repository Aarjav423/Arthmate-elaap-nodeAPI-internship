bodyParser = require('body-parser');
const jwt = require('../../util/jwt');
const borrowerHelper = require('../../util/borrower-helper.js');
const leegalityHelper = require('./leegality-helper.js')
const RepaymentInstallment = require('../../models/repayment-installment-schema.js');
const LoanState = require('../../models/loan-state-schema');

const DOC_CODE_SL = process.env.SANCTION_LETTER_DOC_CODE;
const DOC_CODE_LBA = process.env.LBA_DOC_CODE;

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    app.post(
        '/api/e-sign-request',
        checkRequiredFields,
        [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany,jwt.verifyProduct],
        borrowerHelper.isLoanExistByLoanAppId,
        borrowerHelper.fetchLeadData,
        getRepaymentScheduleList,
        getLoanState,
        async (req, res) => {
            try {
                const esData = await leegalityHelper.createEsignData(req, res);
                return await leegalityHelper.processDataAndCreateESignRequest(req, res, esData);
            }
            catch (error) {
                console.log(error);
                return res.status(400).json(error);
            }
        }
    )
}
const checkRequiredFields = (req, res, next) => {
    const missingFields = [];
    const requiredFields = ['loan_app_id', 'doc_code'];
    requiredFields.forEach(field => {
        if (!req.body[field]) {
            missingFields.push(field);
        }
    });
    const allowedDocCodes = [DOC_CODE_SL, DOC_CODE_LBA];
    try {
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing fields: ${missingFields.join(', ')}`,
            });
        }

        if (!allowedDocCodes.includes(req.body['doc_code'])) {
            return res.status(400).json({
                success: false,
                message: `Invalid doc_code. Allowed values are: ${allowedDocCodes.join(', ')}`,
            });
        }

        next();
    }
    catch (error) {
        return res.status(400).send(error);
    }
};

const getRepaymentScheduleList = async (req, res, next) => {
    req.repaymentSchedule = await RepaymentInstallment.findAllByLoanId(req.loanData.loan_id);
    next();
}

const getLoanState = async (req, res, next) => {
    req.loanState = await LoanState.findByLID(req.loanData.loan_id);
    next();
}