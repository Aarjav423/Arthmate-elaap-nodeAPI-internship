const httpStatus = require('http-status');

const {
    LoanRequestService,
    ComplianceService,
    LoanDocumentService,
    DocumentMappingService,
    BorrowerInfoCommonService
} = require('../../services');
const { SmartParserService } = require("../../services/SmartParser.service");
const { GenerateOvdService } = require("../../services/GenerateOvd.service");
const { BaseController } = require('../../common');
const S3Helper = require('../../../../util/s3helper')

class UploadXmlDocumentController extends BaseController {
    constructor(request, response, loanRequestService, complianceService, loanDocumentService, documentMappingService, borrowerInfoCommonService) {
        super(request, response);
        this.loanRequestService = loanRequestService;
        this.complianceService = complianceService;
        this.loanDocumentService = loanDocumentService;
        this.documentMappingService = documentMappingService;
        this.borrowerInfoCommonService = borrowerInfoCommonService;
    }

    async execute() {
        try {
            let pincode_regex = /^[1-9]{1}[0-9]{2}\s{0,1}[0-9]{3}$/;
            const loanAppId = this.request.body.loanAppId;
            const borrowerId = this.request.body?.borrowerId ? this.request.body.borrowerId : null;
            const code = this.request.body.code;
            const base64pdfencodedfile = this.request.body.base64file;
            const documentMappings = await this.documentMappingService.getAll();
            let documentMapping = {};
            for await (let ele of documentMappings) {
                documentMapping[ele.doc_code] = ele.doc_type;
            }
            let global_doc_stage;
            let borrower_info = await this.borrowerInfoCommonService.findOneWithKBI(borrowerId);
            let loan_app = await this.loanRequestService.findIfExists(loanAppId);
            let borrower_id = loan_app.borrower_id;
            if (!borrower_info) {
                global_doc_stage = 'pre_approval';
            } else {
                let raw_doc_stage = borrower_info.stage;
                if (raw_doc_stage == 0) {
                    global_doc_stage = 'pre_approval';
                } else if (raw_doc_stage == 1) {
                    global_doc_stage = 'post_approval';
                } else if (raw_doc_stage == 2) {
                    global_doc_stage = 'post_disbursal';
                }
            }
            let pan_resp_object = {
                pan_fname: '',
                pan_mname: '',
                pan_lname: '',
            };
            let aadhaar_resp_object = {
                aadhaar_fname: '',
                aadhaar_lname: '',
                aadhaar_mname: '',
                aadhaar_dob: '',
                aadhaar_pincode: '',
                parsed_aadhaar_number: '',
            };
            //get data from risk API
            let bufferObj;
            let decodedString;
            let isJson = true;
            try {
                bufferObj = Buffer.from(base64pdfencodedfile, 'base64');
                decodedString = bufferObj.toString('utf8');
                try {
                    decodedString = JSON.parse(decodedString);
                } catch (err) {
                    isJson = false;
                }
            } catch (err) {
                throw new Error(`Invalid document received, Unable to process`);
            }
            //create payload for smart parser
            const timestamp = Date.now();
            let uniqueKey = loanAppId + timestamp;
            let smartParserPayload = {
                request_id: uniqueKey,
                kyc_file:
                    isJson === false ? base64pdfencodedfile : decodedString,
            };
            const smart_parser_response =
                await SmartParserService(smartParserPayload);
            if (smart_parser_response.success == false) {
                throw new Error("Error while Fetching Data.");
            }
            //check if it is aadhaar or pan and check if minimum data points are present or not, if aadhaar create ovd
            if (code == "196" || code == "204" || code == "114") {  //code for aadhaar xml
                if (smart_parser_response.parser_resp.data.f_Name) {
                    aadhaar_resp_object.aadhaar_fname =
                        smart_parser_response?.parser_resp.data.f_Name;
                } else {
                    throw new Error("Invalid document received, First name is required.");
                }
                if (smart_parser_response.parser_resp.data.m_Name) {
                    aadhaar_resp_object.aadhaar_mname = smart_parser_response?.parser_resp.data.m_Name;
                }
                if (smart_parser_response.parser_resp.data.l_Name) {
                    aadhaar_resp_object.aadhaar_lname = smart_parser_response?.parser_resp.data.l_Name;
                } else {
                    throw new Error("Invalid document received, Last name is required.");
                }
                if (smart_parser_response?.parser_resp.data.Pin) {
                    aadhaar_resp_object.aadhaar_pincode = smart_parser_response?.parser_resp.data.Pin;
                } else {
                    throw new Error("Invalid document received. Pincode is required.");
                }
                if (smart_parser_response?.parser_resp.data.DOB) {
                    aadhaar_resp_object.aadhaar_dob = smart_parser_response?.parser_resp.data.DOB;
                } else {
                    throw new Error("Invalid document received. DOB is required.");
                }
                if (smart_parser_response?.parser_resp.data.ID) {
                    aadhaar_resp_object.parsed_aadhaar_number = smart_parser_response?.parser_resp.data.ID;
                } else {
                    throw new Error("Invalid document received. ID is Required.");
                }
                if (
                    aadhaar_resp_object.aadhaar_fname == undefined &&
                    aadhaar_resp_object.aadhaar_lname == undefined &&
                    aadhaar_resp_object.aadhaar_dob == undefined &&
                    aadhaar_resp_object.aadhaar_pincode == undefined &&
                    aadhaar_resp_object.parsed_aadhaar_number == undefined
                ) {
                    throw new Error(`Invalid document received, ${code}.`);
                }
                if (aadhaar_resp_object.aadhaar_fname == undefined) {
                    aadhaar_resp_object.aadhaar_fname = '';
                }
                if (aadhaar_resp_object.aadhaar_lname == undefined) {
                    aadhaar_resp_object.aadhaar_lname = '';
                }
                if (aadhaar_resp_object.aadhaar_dob == undefined) {
                    aadhaar_resp_object.aadhaar_dob = '';
                }
                if (aadhaar_resp_object.aadhaar_pincode == undefined) {
                    aadhaar_resp_object.aadhaar_pincode = '';
                }
                if (aadhaar_resp_object.parsed_aadhaar_number == undefined) {
                    aadhaar_resp_object.parsed_aadhaar_number = '';
                }
                if (
                    aadhaar_resp_object.aadhaar_pincode.length > 0 &&
                    pincode_regex.test(aadhaar_resp_object.aadhaar_pincode) == false
                ) {
                    throw new Error(`Invalid document received, ${code}.`);
                }
                let aadhaar_verified_flag = 'N';
                if (
                    aadhaar_resp_object.aadhaar_fname.length > 0 &&
                    aadhaar_resp_object.aadhaar_dob.length > 0 &&
                    aadhaar_resp_object.aadhaar_pincode.length > 0 &&
                    aadhaar_resp_object.parsed_aadhaar_number.length > 0
                ) {
                    aadhaar_verified_flag = 'Y';
                }
                //insert into collection started
                var db_flag = false;
                aadhaar_resp_object["loan_app_id"] = loanAppId;
                var raw_db_flag_resp;
                if (code === "114") {
                    try {
                        raw_db_flag_resp = await this.loanRequestService.updateXMLROW(aadhaar_resp_object);
                        db_flag = true;
                    } catch (err) {
                        throw new Error(`Invalid document received, ${code}.`);
                    }
                    let new_checklist_data = {
                        company_id: JSON.parse(JSON.stringify(this.request.product)).company_id,
                        product_id: JSON.parse(JSON.stringify(this.request.product))._id,
                        loan_app_id: loanAppId,
                        parsed_aadhaar_number: aadhaar_resp_object.parsed_aadhaar_number,
                        aadhaar_received: 'Y',
                        aadhaar_verified: aadhaar_verified_flag,
                        aadhaar_match: 'N',
                    };
                    var raw_checklist_db_resp = await this.complianceService.XMLFindAndUpdate(
                        loanAppId,
                        new_checklist_data,
                    );
                }

                //insert into s3 started
                var s3_flag = false;
                let uploadedFilePath;
                const key = `loandocument/${JSON.parse(JSON.stringify(this.request.company)).code
                    ? JSON.parse(JSON.stringify(this.request.company)).code
                    : 'BK'
                    }/${JSON.parse(JSON.stringify(this.request.product)).name.replace(
                        /\s/g,
                        '',
                    )}/${Date.now()}/${loanAppId}/${code}_${borrowerId}.txt`;
                try {
                    uploadedFilePath = await S3Helper.uploadFileToS3(
                        base64pdfencodedfile,
                        key,
                    );
                    s3_flag = true;
                } catch (err) {
                    throw {
                        success: false,
                        message: `Invalid document received, ${code}`,
                        error: err,
                    };
                }
                let loan_document_data = {
                    file_url: uploadedFilePath.Location,
                    file_type: documentMapping[code],
                };

                //updating db to loan_document_common
                let loan_document_common_resp;
                try {
                    loan_document_common_resp =
                        await this.loanDocumentService.findByIdAndCodeThenUpdate(
                            code,
                            loanAppId,
                            loan_document_data,
                        );
                } catch (err) {
                    throw new Error(`Invalid document received, ${code}.`);
                }

                let loan_document_common_resp2;
                if (loan_document_common_resp == null) {
                    //new row we have to add
                    try {
                        let new_row_data = {
                            company_id: raw_db_flag_resp.company_id,
                            loan_app_id: raw_db_flag_resp.loan_app_id,
                            partner_loan_app_id: raw_db_flag_resp.partner_loan_app_id,
                            borrower_id: raw_db_flag_resp.borrower_id,
                            doc_stage: global_doc_stage,
                            file_url: loan_document_data.file_url,
                            file_type: documentMapping[code],
                            code: code,
                        };
                        loan_document_common_resp2 =
                            await this.loanDocumentService.create(new_row_data);
                    } catch (e) {
                        throw new Error(`Invalid document received, ${code}.`);
                    }
                }

                if (db_flag == true && s3_flag == true) {
                    //lets create ovd
                    try {
                        if (aadhaar_verified_flag == 'Y') {
                            let ajx_inputs = {
                                image: smart_parser_response?.parser_resp?.data?.photo
                                    ? `data:image/png;base64,${smart_parser_response?.parser_resp?.data.photo}`
                                    : '',
                                mode: 'OfflinePaperlessKYC',
                                ref: '',
                                aadhaarId:
                                    smart_parser_response?.parser_resp?.data?.ID | '',
                                shareCode: '',
                                timestamp: new Date().toUTCString(),
                                name: smart_parser_response?.parser_resp?.data?.Name || '',
                                mobile: '',
                                dob: smart_parser_response?.parser_resp?.data?.DOB || '',
                                gender:
                                    smart_parser_response?.parser_resp?.data?.gender || '',
                                email: '',
                                co: smart_parser_response?.parser_resp?.data?.Father || '',
                                house:
                                    smart_parser_response?.parser_resp?.data?.house || '',
                                street:
                                    smart_parser_response?.parser_resp?.data?.street || '',
                                landmark:
                                    smart_parser_response?.parser_resp?.data?.landmark || '',
                                locality:
                                    smart_parser_response?.parser_resp?.data?.locality || '',
                                pincode:
                                    smart_parser_response?.parser_resp?.data?.pincode || '',
                                po: smart_parser_response?.parser_resp?.data?.po || '',
                                district:
                                    smart_parser_response?.parser_resp?.data?.district || '',
                                sub_district: '',
                                vtc: smart_parser_response?.parser_resp?.data?.vtc || '',
                                state:
                                    smart_parser_response?.parser_resp?.data?.state || '',
                            };
                            //call ovd service to genrate ovd
                            const ovd_response = await GenerateOvdService(ajx_inputs);
                            if (ovd_response.success == false) {
                                throw new Error(`Error while generating OVD.`);
                            }
                            let created_ovd_file = ovd_response.ovd_resp;
                            //uploading ovd to s3
                            const key2 = `loandocument/${JSON.parse(JSON.stringify(this.request.company)).code
                                ? JSON.parse(JSON.stringify(this.request.company)).code
                                : 'BK'
                                }/${JSON.parse(JSON.stringify(this.request.product)).name.replace(
                                    /\s/g,
                                    '',
                                )}/${Date.now()}/${loanAppId}/117${"_"+borrowerId}.txt`;
                            let upload_ovd_file;
                            try {
                                upload_ovd_file = await S3Helper.uploadFileToS3(
                                    created_ovd_file,
                                    key2,
                                );
                            } catch (err) {
                                throw new Error(`Invalid document received, ${code}.`);
                            }
                            let ovd_loan_document_data = {
                                file_url: upload_ovd_file.Location,
                                file_type: documentMapping['117'],
                            };
                            let loan_document_common_ovd_resp;
                            try {
                                loan_document_common_ovd_resp =
                                    await this.loanDocumentService.findByIdAndCodeThenUpdate(
                                        '117',
                                        loanAppId,
                                        ovd_loan_document_data,
                                    );
                            } catch (err) {
                                throw new Error(`Invalid document received, ${code}.`);
                            }

                            let loan_document_common_ovd_resp2;
                            if (loan_document_common_ovd_resp == null) {
                                //new row we have to add
                                try {
                                    let new_ovd_row_data = {
                                        company_id: raw_db_flag_resp.company_id,
                                        loan_app_id: raw_db_flag_resp.loan_app_id,
                                        partner_loan_app_id:
                                            raw_db_flag_resp.partner_loan_app_id,
                                        borrower_id: raw_db_flag_resp.borrower_id,
                                        doc_stage: global_doc_stage,
                                        file_url: ovd_loan_document_data.file_url,
                                        file_type: ovd_loan_document_data.file_type,
                                        code: '117',
                                    };
                                    loan_document_common_ovd_resp2 =
                                        await this.loanDocumentService.create(new_ovd_row_data);
                                } catch (e) {
                                    throw new Error(`Invalid document received, ${code}.`);
                                }
                            }
                        }
                    } catch (err) {
                        throw new Error(`OVD ERROR.`);
                    }
                    return { message: "Loan document uploaded successfully.", success: true };
                } else {
                    throw new Error(`Invalid document received, ${code}.`);
                }
            } else if (code == "195" || code == "203" || code == "116") { //code for pan xml
                try {
                    if (smart_parser_response.parser_resp.data.f_Name) {
                        pan_resp_object.pan_fname = smart_parser_response?.parser_resp.data.f_Name;
                    } else {
                        throw new Error("Invalid document received, First name is required.");
                    }
                    if (smart_parser_response.parser_resp.data.l_Name) {
                        pan_resp_object.pan_lname = smart_parser_response?.parser_resp.data.l_Name;
                    }
                    if (smart_parser_response.parser_resp.data.m_Name) {
                        pan_resp_object.pan_mname = smart_parser_response?.parser_resp.data.m_Name;
                    }

                    //now check if anything invalid or not
                    if (pan_resp_object.pan_fname == undefined) {
                        throw new Error(`Invalid document received, ${code}.`);
                    } //insert into collection started

                    var db_flag = false;
                    pan_resp_object["loan_app_id"] = loanAppId;
                    var raw_db_flag_resp;
                    if (code === "116") {

                        try {
                            raw_db_flag_resp =
                                await this.loanRequestService.updateXMLROW(pan_resp_object);
                            db_flag = true;
                        } catch (err) {
                            throw new Error(`Invalid document received, ${code}.`);
                        }
                        //insert into new checklist collection
                        let new_checklist_data = {
                            company_id: JSON.parse(JSON.stringify(this.request.product)).company_id,
                            product_id: JSON.parse(JSON.stringify(this.request.product))._id,
                            loan_app_id: loanAppId,
                            pan_received: 'Y',
                            pan_verified:
                                pan_resp_object.pan_fname != undefined &&
                                    pan_resp_object.pan_fname.length > 0
                                    ? 'Y'
                                    : 'N',
                            pan_match: 'N',
                        };
                        var raw_checklist_db_resp = await this.complianceService.XMLFindAndUpdate(
                            loanAppId,
                            new_checklist_data,
                        );
                    }
                    //insert into s3 started
                    var s3_flag = false;
                    let uploadedFilePath;
                    const key = `loandocument/${JSON.parse(JSON.stringify(this.request.company)).code
                        ? JSON.parse(JSON.stringify(this.request.company)).code
                        : 'BK'
                        }/${JSON.parse(JSON.stringify(this.request.product)).name.replace(
                            /\s/g,
                            '',
                        )}/${Date.now()}/${loanAppId}/${code+"_"+borrowerId}.txt`;
                    try {
                        uploadedFilePath = await S3Helper.uploadFileToS3(
                            base64pdfencodedfile,
                            key,
                        );
                        s3_flag = true;
                    } catch (err) {
                        throw new Error(`Invalid document received, ${code}.`);
                    }

                    //return
                    let loan_document_data = {
                        file_url: uploadedFilePath.Location,
                        file_type: documentMapping[code],
                    };

                    //updating db to loan_document_common
                    let loan_document_common_resp;
                    try {
                        loan_document_common_resp =
                            await this.loanDocumentService.findByIdAndCodeThenUpdate(
                                code,
                                loanAppId,
                                loan_document_data,
                            );
                    } catch (err) {
                        throw new Error(`Invalid document received, ${code}.`);
                    }

                    let loan_document_common_resp2;
                    if (loan_document_common_resp == null) {
                        //new row we have to add
                        try {
                            let new_row_data = {
                                company_id: raw_db_flag_resp.company_id,
                                loan_app_id: raw_db_flag_resp.loan_app_id,
                                partner_loan_app_id: raw_db_flag_resp.partner_loan_app_id,
                                borrower_id: raw_db_flag_resp.borrower_id,
                                doc_stage: global_doc_stage,
                                file_url: loan_document_data.file_url,
                                file_type: documentMapping[code],
                                code: code,
                            };
                            loan_document_common_resp2 =
                                await this.loanDocumentService.create(new_row_data);
                        } catch (e) {
                            throw new Error(`Invalid document received, ${code}.`);
                        }
                    }

                    if (db_flag == true && s3_flag == true) {
                        return { message: "Loan document uploaded successfully.", success: true };
                    } else {
                        throw new Error(`Invalid document received, ${code}.`);
                    }
                } catch (err) {
                    throw new Error(`Invalid document received, ${code}.`);
                }
            } else {
                throw new Error('Invalid document code');
            }
        } catch (error) {
            throw new Error(error);
        }
    }

    static create(request, response) {
        let uploadXmlDocumentController = new UploadXmlDocumentController(
            request,
            response,
            new LoanRequestService(),
            new ComplianceService(),
            new LoanDocumentService(),
            new DocumentMappingService(),
            new BorrowerInfoCommonService()
        );
        return uploadXmlDocumentController;
    }
}

module.exports = UploadXmlDocumentController;