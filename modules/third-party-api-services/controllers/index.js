const { reqresLog, s3Logging, errorLog } = require("./logging.controller");
const {
    checkNegativeAreaUsingAddress,
    checkNegativeAreaUsingLatitudeAndLongitude,
} = require('./geo-spoc.controller.js');
const { udyamRegistrationCheck } = require("./udyam.controller.js");
const {checkFaceMatch} = require("./face-match.controller");
const {companyDataPull} = require('./kz-company-data.controller');
const { crimeCheckAddReport, crimeCheckAddReportCallback, getCrimeCheckReport } = require("./crime-check.controller.js");
const { shareholdingParserCheck } = require("./shareholding-parser.controller.js")
const { gstParser } = require("./gst-parser.controller");
const { pdfAnalyser, getPdfAnalyser, pdfAnalyserWebhook } = require('./pdf-analyser.controller');
const { jsonAnalyser } = require('./json-analyser.controller');
const { bureauAnalyser } = require('./bureau-analyser.controller');
const {hitColenderSelectorApi}= require('./colender-selector.controller.js')
const {createESignRequest,getESignRequestStatus,getCallbackData ,getLeegaltityESignRequestStatus}= require('./legality-esign.controller.js')
const { scoreMeBsa, scoreMeBsaWebhook, scoreMeBsaReport, getScoreMeBsaReport, scoreMeBsaV2 } = require("./scoreme.controller");
const { passiveLivelinessCheck } = require("./passive-liveliness.controller.js");
const { experianHunterCheck, experianHunterCheckAction } = require('./experian-hunter-check.controller.js');
const { mcaDetailsPull } = require('./kz-mca-details.controller.js')

module.exports = {
    reqresLog,
    s3Logging,
    errorLog,
    checkNegativeAreaUsingAddress,
    checkNegativeAreaUsingLatitudeAndLongitude,
    udyamRegistrationCheck,
    checkFaceMatch,
    companyDataPull,
    crimeCheckAddReport,
    crimeCheckAddReportCallback,
    shareholdingParserCheck,
    getCrimeCheckReport,
    gstParser,
    pdfAnalyser,
    pdfAnalyserWebhook,
    getPdfAnalyser,
    jsonAnalyser,
    bureauAnalyser,
    hitColenderSelectorApi,
    createESignRequest,
    getESignRequestStatus,
    scoreMeBsa,
    scoreMeBsaWebhook,
    scoreMeBsaReport,
    passiveLivelinessCheck,
    getCallbackData,
    getLeegaltityESignRequestStatus,
    experianHunterCheck,
    getScoreMeBsaReport,
    mcaDetailsPull,
    experianHunterCheckAction,
    scoreMeBsaV2,
}