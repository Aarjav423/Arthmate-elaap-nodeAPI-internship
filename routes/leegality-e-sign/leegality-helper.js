bodyParser = require('body-parser');
const axios = require('axios');
const moment = require('moment');
const SingleDataTranslation = require('../../models/single_data_translation-schema.js');
const LoanRequest = require('../../models/loan-request-schema.js');
const excelFormulaHelper = require('../../util/excel-formula-helper.js');

const eSignPostUrl = process.env.SERVICE_MS_URL + process.env.LEEGALITY_CREATE_ESIGN_REQUEST_URL;
const authToken = process.env.SERVICE_MS_TOKEN;
const DOC_CODE_SL = process.env.SANCTION_LETTER_DOC_CODE;
const DOC_CODE_LBA = process.env.LBA_DOC_CODE;

const createEsignData = async (req) => {
    try {
        const borrower_name = [req.loanData.first_name, req.loanData.middle_name, req.loanData.last_name].filter(Boolean).join(' ');
        const borrower_res_address = [req.leadData.resi_addr_ln1, req.leadData.resi_addr_ln2, req.leadData.city, req.leadData.state, req.leadData.pincode].filter(Boolean).join(' ');
        const borrower_per_address = [req.leadData.per_addr_ln1, req.leadData.per_addr_ln2, req.leadData.per_city, req.leadData.per_state, req.leadData.per_pincode].filter(Boolean).join(' ');
        const insuranceCharges = req.loanData.insurance_amount ? parseFloat(String(req.loanData.insurance_amount)) : 0;
        const otherCharges = (req.loanData.application_fees ? parseFloat(String(req.loanData.application_fees)) : 0) + (req.loanData.conv_fees ? parseFloat(String(req.loanData.conv_fees)) : 0);
        const processingFees = req.loanData.processing_fees_amt ? parseFloat(String(req.loanData.processing_fees_amt)) : 0;
        const loanAmount = req.loanData.sanction_amount ? parseFloat(String(req.loanData.sanction_amount)) : 0;
        const loanIntCharged = req.loanState.int_os ? parseFloat(String(req.loanState.int_os)) : 0;
        const emiAmount = req.repaymentSchedule.length > 0 ? String(req.repaymentSchedule[0].emi_amount) : 0;
        const netDisbursalAmount = req.loanData.net_disbur_amt ? String(req.loanData.net_disbur_amt) : 0;

        const totalAmountToBePaidByBorrower = loanAmount + loanIntCharged + processingFees + insuranceCharges + otherCharges;
        const rate = excelFormulaHelper.RATE(req.leadData.loan_tenure*1, (emiAmount * -1), netDisbursalAmount*1) * 12 * 100;
        
        const tempData = {
            current_date: moment().format('DD/MM/YYYY'),
            borrower_name: borrower_name,
            borrower_res_address: borrower_res_address,
            borrower_per_address: borrower_per_address,
            borrower_pan: req.leadData.appl_pan,
            borrower_mobile_no: req.leadData.appl_phone,
            borrower_email: req.leadData.email_id,
            application_date: req.loanData.loan_app_date,
            borrower_details: [borrower_name, borrower_res_address, req.leadData.email_id, req.leadData.appl_phone].filter(Boolean).join(', '),
            loan_app_id: req.loanData.loan_app_id,
            loan_id: req.loanData.loan_id,
            co_borrower_name: req.leadData.coborrower.map((co_borrower, index) => {
                const coBorrowerName = [co_borrower.cb_fname, co_borrower.cb_mname, co_borrower.cb_lname].filter(Boolean).join(' ');
                return req.leadData.coborrower.length > 1 ? `${index + 1}. ${coBorrowerName}` : coBorrowerName;
            }).join(', '),
            co_borrower_address: req.leadData.coborrower.map((co_borrower, index) => {
                const coBorrowerAddress = [co_borrower.cb_resi_addr_ln1, co_borrower.cb_resi_addr_ln2, co_borrower.cb_city, co_borrower.cb_state, co_borrower.cb_pincode].filter(Boolean).join(' ');
                return req.leadData.coborrower.length > 1 ? `${index + 1}. ${coBorrowerAddress}` : coBorrowerAddress;
            }).join(', '),
            co_borrower_pan: req.leadData.coborrower.map((co_borrower, index) => {
                return req.leadData.coborrower.length > 1 ? `${index + 1}. ${co_borrower.cb_pan}` : co_borrower.cb_pan;
            }).join(', '),
            guarantor_name: req.leadData.guarantor.map((guarantor, index) => {
                const guarantorName = [guarantor.gua_fname, guarantor.gua_mname, guarantor.gua_lname].filter(Boolean).join(' ');
                return req.leadData.guarantor.length > 1 ? `${index + 1}. ${guarantorName}` : guarantorName;
            }).join(', '),
            guarantor_pan: req.leadData.guarantor.map((guarantor, index) => {
                return req.leadData.guarantor.length > 1 ? `${index + 1}. ${guarantor.gua_pan}` : guarantor.gua_pan;
            }).join(', '),
            guarantor_address: req.leadData.guarantor.map((guarantor, index) => {
                const guarantorAddress = [guarantor.gua_resi_addr_ln1, guarantor.gua_resi_addr_ln2, guarantor.gua_city, guarantor.gua_state, guarantor.gua_pincode].filter(Boolean).join(' ');
                return req.leadData.guarantor.length > 1 ? `${index + 1}. ${guarantorAddress}` : guarantorAddress;
            }).join(', '),
            loan_amount_in_figure: loanAmount,
            loan_amount_in_words: '',
            interest_rate: req.loanData.loan_int_rate,
            total_interest_charge: loanIntCharged,
            processing_fees_loan_amount_percentage: req.loanData.processing_fees_perc || 0,
            processing_fees_amount_in_figure: processingFees,
            insurance_charges: insuranceCharges,
            other_charges: otherCharges.toFixed(2),
            document_charges: 0,
            net_disbursed_amount: netDisbursalAmount,
            total_amount_to_be_paid_by_borrower: totalAmountToBePaidByBorrower.toFixed(2),
            annual_percentage_rate: rate.toFixed(2),
            tenor_of_loan_in_months: req.leadData.loan_tenure,
            tenor_of_loan_in_days: 0,
            number_of_instalments_of_repayments: req.leadData.loan_tenure,
            instalment_amount: emiAmount,
            repayment_type: req.loanData.repayment_type,//radio
            loan_type: req.product.product_type_name, //radio
            purpose_of_loan:req.leadData.purpose_of_loan, //radio
            full_name_of_partner: req.company.name,
            name_of_partners_app_web: req.company.name,
            borrower_bank_acc_num: req.loanData.borro_bank_acc_num,
            borrower_acc_holder_name: req.loanData.borro_bank_account_holder_name,
            borrower_acc_type: req.loanData.borro_bank_account_type,
            borrower_bank_name: req.loanData.borro_bank_name,
            borrower_ifsc_code: req.loanData.borro_bank_ifsc,
            bene_bank_acc_num: req.loanData.bene_bank_acc_num,
            bene_acc_holder_name: req.loanData.bene_bank_account_holder_name,
            bene_acc_type: req.loanData.bene_bank_account_type,
            bene_bank_name: req.loanData.bene_bank_name,
            bene_ifsc_code: req.loanData.bene_bank_ifsc,
            prepayment_option_and_charges: parseFloat(req.product.foreclosure_charge) || 0,
            penal_charges_in_case_of_delay_default: parseFloat(req.product.penal_interest) || 0,
            charges_for_bouncing_of_repayment_instruments: parseFloat(req.product.bounce_charges) || 0,
            days_from_disbursal_of_loan: parseInt(req.product.cancellation_period) || 0,
            agent_name: req.company.gro_name,
            agent_designation: req.company.gro_designation,
            agent_address: req.company.gro_address,
            agent_email_id: req.company.gro_email_id,
            agent_contact_number: req.company.gro_contact_number,
            sanction_letter_valid_period: 30,
            installment_start_date: moment(req.loanData.first_inst_date).format('DD'),
            interest_type: req.product.interest_rate_type,
            invitees: createInviteesList(req.leadData),
            repayment_schedule: createFlatRepaymentInstallmentsObj(req.repaymentSchedule),
        }
        return tempData;
    } catch (error) {
        console.log(error)
    }

}

const createFlatRepaymentInstallmentsObj = (repaymentInstallments) => {
    let schedules = {};

    repaymentInstallments.forEach((record) => {
        const emiKey = `emi_no_${record.emi_no}`;
        const prinKey = `prin_amount_${record.emi_no}`;
        const intKey = `int_amount_${record.emi_no}`;
        const outStandingPrinKey = `os_prin_${record.emi_no}`;
        const installmentAmtKey = `emi_amount_${record.emi_no}`;

        schedules[emiKey] = record.emi_no;
        schedules[prinKey] = record.prin.toString();
        schedules[intKey] = record.int_amount.toString();
        schedules[outStandingPrinKey] = record.principal_outstanding.toString();
        schedules[installmentAmtKey] = record.emi_amount.toString();
    });

    return schedules;
}

const createInviteesList = (leadData) => {
    let invitees = []

    invitees.push({
        name: [leadData.first_name, leadData.middle_name, leadData.last_name].filter(Boolean).join(' '),
        email: leadData.email_id,
        phone: leadData.appl_phone
    });

    // Add co-applicants to invitees
    leadData.coborrower.forEach(coApplicant => {
        invitees.push({
            name: [coApplicant.cb_fname, coApplicant.cb_mname, coApplicant.cb_lname].filter(Boolean).join(' '),
            email: coApplicant.cb_email,
            phone: coApplicant.cb_mobile
        });
    });

    // Add guarantors to invitees
    leadData.guarantor.forEach(guarantor => {
        invitees.push({
            name: [guarantor.gua_fname, guarantor.gua_mname, guarantor.gua_lname].filter(Boolean).join(' '),
            email: guarantor.gua_email,
            phone: guarantor.gua_mobile
        });
    });

    return invitees;
}

const processDataAndCreateESignRequest = async (req, res, esData) => {
    const leegalityAttributesList = await SingleDataTranslation.getAllDataByType(process.env.LEEGALITY_ATTRIBUTES_TYPE + req.body.doc_code);

    const templateKey = process.env.ESIGN_TEMPLATE_TYPE + req.body.doc_code;

    const templateIdObject = await SingleDataTranslation.getValueByTypeAndKey(templateKey, req.product._id);
    const templateId = templateIdObject ? templateIdObject.value : defaultTemplateId(req.body.doc_code);

    const fields = getFieldsArray(leegalityAttributesList, esData);
    
    const esignPayload = {
        template_id: templateId,    
        fields: fields,
        invitees: esData.invitees,
        consent: "Y",
        loan_app_id: req.loanData.loan_app_id,
        consent_timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
    }

    // Configure the Leegality esign create request
    const config = {
        url: eSignPostUrl,
        method: 'POST',
        headers: {
            Authorization: `${authToken}`,
            'Content-Type': 'application/json',
        },
        data: JSON.parse(JSON.stringify(esignPayload))
    }
    // Hit create e-sign request POST api 
    const response = await axios.request(config);

    let { data } = response;
    if (!data || !data.success) {
        throw new Error(`leegality create e-sign request api failed`);
    }

    const updatedFields = {
        doc_stage: 0,
        request_id: data.request_id,
        doc_code: req.body.doc_code
    };
    // Check if signed_docs is null or undefined and initialize if needed
    req.leadData.signed_docs = req.leadData.signed_docs || [];

    const existingDocIndex = req.leadData.signed_docs.
        findIndex(doc => doc.doc_code === updatedFields.doc_code);

    if (existingDocIndex !== -1) {
        // If doc_code exists, replace the existing document
        req.leadData.signed_docs[existingDocIndex] = updatedFields;
    } else {
        // If doc_code doesn't exist, push the updatedFields
        req.leadData.signed_docs.push(updatedFields);
    }

    //update respective document flag and requestId in LoanRequest record
    await LoanRequest.updateSignedDocs(req.leadData);
    res.status(200).send({
        success: true,
        message: 'E-Sign request has been submitted successfully',
    });
}

// Function to create Esign fields based on leegality attributes
const getFieldsArray = (leegalityAttributesList, esignData) => {
    const fields = []

    leegalityAttributesList.forEach(record => {
        const data = record.value_obj;
        switch (data.type) {
            case 'radio':
                fields.push(
                    setRadioFields(esignData[data.source], data)
                );
                break;
            case 'repayment_schedule':
                fields.push(
                    setRepaymentObject(esignData.repayment_schedule, data)
                );
                break;
            default:
                fields.push(
                    setTextObject(esignData[data.source], data)
                );
        }
    });
    return fields;
};

const setTextObject = (data, SingleDataTranslationRecord) => {
    const { id, name, type, value_map, required } = SingleDataTranslationRecord;
    const mappedValue = value_map ? JSON.parse(value_map)[data] : data;

    return {
        id: id,
        name: name,
        type: type,
        value: mappedValue ? mappedValue : data,
        required: required
    }
}

const setRepaymentObject = (repaymentScheduleObj, SingleDataTranslationRecord) => {

    const { id, name, source, required } = SingleDataTranslationRecord;
    return {
        id: id,
        name: name,
        type: 'text',
        value: repaymentScheduleObj[source],
        required: required
    };
}

const setRadioFields = (data, SingleDataTranslationRecord) => {
    const { id, name, value, value_map, required } = SingleDataTranslationRecord;

    const valueArray = value ? value.split(',') : [];
    const isChecked = valueArray.includes(data);
   
    const mappedValue = value_map ? JSON.parse(value_map)[value] : value;

    return {
        id: id,
        name: name,
        type: 'radio',
        value: mappedValue ? mappedValue : value,
        checked: isChecked,
        required: required
    };
}

const defaultTemplateId = (docCode) => {
    if (docCode === DOC_CODE_SL) {
        return process.env.DEFAULT_SL_TEMPLATE_ID;
    } else if (docCode === DOC_CODE_LBA) {
        return process.env.DEFAULT_LBA_TEMPLATE_ID
    }
    return null;
}

module.exports = {
    createEsignData,
    processDataAndCreateESignRequest
}