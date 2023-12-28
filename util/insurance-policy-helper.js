const axios = require('axios');
const { getAge } = require('../utils/kyc-services.js');
const InsurancePricingSchema = require('../models/insurance-pricing-schema.js');
const PolicyPremiumRateSchema = require('../models/insurance-base-policy-premium-rate-schema.js');
const BorrowerInsuranceSchma = require('../models/borrower-insurance-details-schema.js');
const PincodeMasterDataSchema = require('../models/pincode-master-data-schema.js');
const IssuePolicyStagingSchema = require('../models/issue-policy-staging-schema.js');

const callInsurancePolicyIssueApi = async (req, res, next) => {
  try {
    const payload = req.body;

    const apiUrl = `${process.env.INSURANCE_POLICY_ISSUE_URL}/issuePolicy`;

    const apiConfig = {
      method: 'post',
      url: apiUrl,
      headers: {
        Authorization: `${process.env.INSURANCE_POLICY_ISSUE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    };
    req.responseData = await axios(apiConfig);
    next();
  } catch (error) {
    if (error?.response?.statusText) {
      return res
        .status(400)
        .send({ success: false, message: error?.response?.statusText });
    }
    return res.status(400).send(error);
  }
};

const validatePayload = (req, res, next) => {
  try {
    req.apiName = 'ISSUE-POLICY';
    req.vendor_name = 'GO-DIGIT';
    req.body.loan_id = req.body.products[0].policyDetails.loanAccountNumber;
    next();
  } catch (error) {
    console.log(error);
    return res.send(error);
  }
};

const validateGetPolicyDetailPayload = async (req, res, next) => {
  try {
    req.apiName = 'GET-POLICY';
    req.vendor_name = 'GO-DIGIT';
    // fetch data from borrower insurance details against partnerRefNo
    const policyExist = await BorrowerInsuranceSchma.findByExtRefNumber(
      req.params.partner_ref_no,
    );
    if (!policyExist)
      throw {
        success: false,
        message: 'No policy issues against partner_ref_no.',
      };
    req.body.loan_id = policyExist.loan_id;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const callGetPolicyDetailApi = async (req, res, next) => {
  try {
    const apiUrl = `${process.env.GET_POLICY_DETAIL_URL}/policyDetails?partnerRefNo=${req.params.partner_ref_no}`;
    const apiConfig = {
      method: 'get',
      url: apiUrl,
      headers: {
        Authorization: `${process.env.INSURANCE_POLICY_ISSUE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    };
    const policyDetailResp = await axios(apiConfig);
    req.responseData = policyDetailResp;
    next();
  } catch (error) {
    return res.staus(400).send(error);
  }
};

const validateGetPolicyPdfPayload = async (req, res, next) => {
  try {
    req.apiName = 'GET-POLICY-PDF';
    req.vendor_name = 'GO-DIGIT';
    const policyNumberExist = await BorrowerInsuranceSchma.findByPolicyNumber(
      req.params.policy_number,
    );
    if (!policyNumberExist)
      throw {
        success: false,
        message: 'No policy issues against policy_number.',
      };
    req.body.loan_id = policyNumberExist.loan_id;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const callGetPolicyPdfApi = async (req, res, next) => {
  try {
    const apiUrl = `${process.env.GET_POLICY_DETAIL_URL}/regeneratePolicyPDF?policyNumber=${req.params.policy_number}`;

    const apiConfig = {
      method: 'get',
      url: apiUrl,
      headers: {
        Authorization: `${process.env.INSURANCE_POLICY_ISSUE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    };
    const policyPDFResp = await axios(apiConfig);
    req.responseData = policyPDFResp;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const loanInsuranceValidations = async (req, res, data) => {
  try {
    let policyPremium = 0;
    let gstOnPolicyPremium = 0;
    let policyPremiumIncGST = 0;
    let basePolicyPremiumIncGST = 0;
    let basePolicyPremium = 0;
    let loanTenureInMonths = 0;
    let coBorrowerPremium = 0;
    let response = {};
    let insuranceFlag = req.product.insurance_charges;
    data.tenure_type = data.tenure_type
      ? data.tenure_type
      : req.product.loan_tenure_type;
    data.tenure = data.tenure ? data.tenure : req.product.loan_tenure;
    data.insurance_amount =
      Math.round((data.insurance_amount * 1 + Number.EPSILON) * 100) / 100;
    // Condition1: Check insurance flag in product"
    if (!insuranceFlag)
      throw {
        success: false,
        message: 'Exception: Insurance charge is not configured',
      };

    //Condition2: check entry in insurance pricing table by company_id and product_id
    const insurancePricingRecord = await InsurancePricingSchema.findByCIDPID(
      req.company._id,
      req.product._id,
    );
    // If Condition2 is false simply deduct insurance_amount from sanction_amount to get net_disbur_amt
    if (!insurancePricingRecord) {
      policyPremiumIncGST = data.insurance_amount;
      policyPremiumIncGST =
        Math.round((policyPremiumIncGST * 1 + Number.EPSILON) * 100) / 100;
    }
    // If Condition1 and Condition2 is true
    let loanTenureInDays;
    if (insuranceFlag && insurancePricingRecord) {
      if (!insurancePricingRecord.premium_multiplier)
        throw {
          success: false,
          message: 'premium_multiplier should be configured.',
        };
      const premiumMultiplier = insurancePricingRecord.premium_multiplier;
      // get tenure from the loan api convert it to the months
      if (data.tenure_type.toLowerCase() === 'month' && data.tenure) {
        loanTenureInMonths = data.tenure * 1;
      } else if (data.tenure_type.toLowerCase() === 'week' && data.tenure) {
        let loanTenureInDays = data.tenure * 1 * 7;
        loanTenureInMonths = Math.ceil(loanTenureInDays / 30) * 1;
      } else if (
        data.tenure_type.toLowerCase() === 'fortnight' &&
        data.tenure
      ) {
        loanTenureInMonths = Math.ceil(data.tenure * 0.4602739726);
      } else {
        let loanTenureInDays = data.tenure;
        loanTenureInMonths = Math.ceil(loanTenureInDays / 30) * 1;
      }
      if (req.insuranceStagingData) {
        req.insuranceStagingData.loanTenureInMonths = loanTenureInMonths;
      }

      // Calculate age of the borrower using dob from lead data
      if (!data.dob) throw { success: false, message: 'dob is required' };
      const borrowerAge = await getAge(new Date(data.dob).getFullYear());
      //Using age and tenure determine the policy premium using Base Policy Premium Rate Sheet
      const policyPremiumByAge =
        await PolicyPremiumRateSchema.findByAge(borrowerAge);
      if (!policyPremiumByAge)
        throw {
          success: false,
          message: 'Exception: Requested policy configuration not found',
        };
      const policyPremiumObj = JSON.parse(JSON.stringify(policyPremiumByAge));
      delete policyPremiumObj.max_age;
      delete policyPremiumObj.min_age;
      const keys = Object.keys(policyPremiumObj);
      let tenureArray = [];
      keys.forEach((key) => {
        if (loanTenureInMonths == key * 1 || loanTenureInMonths < key * 1) {
          tenureArray.push(key);
        }
      });
      if (!tenureArray.length)
        throw {
          success: false,
          message: 'Exception: Requested policy configuration not found',
        };
      const policyPremiumByTenure = policyPremiumByAge[`${tenureArray[0]}`];
      //Calculate policy premium
      policyPremium =
        ((data.sanction_amount * 1) / 1000) *
        policyPremiumByTenure *
        Number(premiumMultiplier);

      //Calculate coborrower premium
      if (data.coborr_dob) {
        const coBorrowerAge = await getAge(
          new Date(data.coborr_dob).getFullYear(),
        );
        const calculateCoBorroPremium = await calculatePremium(
          coBorrowerAge,
          loanTenureInMonths,
          data.sanction_amount,
          premiumMultiplier,
        );
        if (!calculateCoBorroPremium.success) throw calculateCoBorroPremium;
        coBorrowerPremium = calculateCoBorroPremium.policyPremiumIncGST;
      }

      //18% of GST should be applied on the above calculated policy premium amount to arrive at the Total premium inclusive of GST
      gstOnPolicyPremium = policyPremium * 0.18;
      policyPremiumIncGST =
        policyPremium + gstOnPolicyPremium + coBorrowerPremium;
      policyPremiumIncGST =
        Math.round((policyPremiumIncGST * 1 + Number.EPSILON) * 100) / 100;
      basePolicyPremium = Number(
        ((data.sanction_amount * 1) / 1000) * policyPremiumByTenure,
      );
      basePolicyPremiumIncGST =
        basePolicyPremium + Number(basePolicyPremium) * 0.18;

      // compare Total premium inclusive of GST with the insurance_amount passed in loan payload.
      // Condition3: If the total premium amount provided by the partner is +- INR 1 then do not reject the amount.
      // If the Condition3 fails throw error "Exception:   Insurance Premium amount is not correct"
      let policyPremiumDiff =
        Number(policyPremiumIncGST) - Number(data.insurance_amount);
      if (policyPremiumDiff > 1 || policyPremiumDiff < -1)
        throw {
          success: false,
          message: `Exception: Insurance Premium amount is not correct, it should be ${policyPremiumIncGST}`,
        };
      if (
        policyPremiumDiff == 0 ||
        policyPremiumDiff <= 1 ||
        policyPremiumDiff >= -1
      ) {
        policyPremiumIncGST = data.insurance_amount * 1;
      }
      // Upon successful validation deduct  insurance charges (incl of gst) from sanction_amount to calculate net_disbur_amt
      response = {
        borrowerPremium: policyPremiumIncGST - coBorrowerPremium,
        coBorrowerPremium: coBorrowerPremium,
        borrowerAge: borrowerAge,
        loanTenureInMonths: loanTenureInMonths,
        master_policy_number: insurancePricingRecord.master_policy_number,
        premium_multiplier: insurancePricingRecord.premium_multiplier,
        policyPremiumByTenure:
          Math.round((policyPremiumByTenure * 1 + Number.EPSILON) * 100) / 100,
        policyPremium:
          Math.round((policyPremium * 1 + Number.EPSILON) * 100) / 100,
        gstOnPolicyPremium:
          Math.round((gstOnPolicyPremium * 1 + Number.EPSILON) * 100) / 100,
        policyPremiumIncGST:
          Math.round((policyPremiumIncGST * 1 + Number.EPSILON) * 100) / 100,
        basePolicyPremiumIncGST:
          Math.round((basePolicyPremiumIncGST * 1 + Number.EPSILON) * 100) /
          100,
        basePolicyPremium:
          Math.round((basePolicyPremium * 1 + Number.EPSILON) * 100) / 100,
      };
    }
    response.policyPremiumIncGST =
      Math.round((policyPremiumIncGST * 1 + Number.EPSILON) * 100) / 100;
    req.insuranceResponse = response;
    return { success: true, response };
  } catch (error) {
    return error;
  }
};

const recordBorrowerInsuranceDetails = async (req, data, response) => {
  try {
    let datatoInsert = {
      company_id: req.company._id,
      product_id: req.product._id,
      company_name: req.company.name,
      product_name: req.product.name,
      loan_id: data.loan_id,
      loan_app_id: data.loan_app_id,
      borrower_id: data.borrower_id,
      partner_loan_id: data.partner_loan_id,
      sanction_amount: data.sanction_amount,
      master_policy_number: response.master_policy_number
        ? response.master_policy_number
        : '',
      insurance_charges: data.insurance_amount,
      policy_premium: response.policyPremium,
      gst_on_policy_premium: response.gstOnPolicyPremium,
      base_policy_premium: response.basePolicyPremium,
      gst_on_base_policy_premium: Number(response.basePolicyPremium) * 0.18,
      tenure_in_months: response.loanTenureInMonths,
      borrower_age: response.borrowerAge,
      processor_ratio: '',
      partner_ratio: '',
      premium_multiplier: response.premium_multiplier
        ? response.premium_multiplier
        : '',
    };
    const addInsuranceDetails =
      await BorrowerInsuranceSchma.addNew(datatoInsert);
    if (!addInsuranceDetails)
      throw {
        sucess: false,
        message: 'Error while adding borrower insurance details.',
      };
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

const updateBorrowerInsuranceDetails = async (req, data, response) => {
  try {
    let datatoUpdate = {
      company_id: req.company._id,
      product_id: req.product._id,
      company_name: req.company.name,
      product_name: req.product.name,
      loan_id: data.loan_id,
      loan_app_id: data.loan_app_id,
      borrower_id: data.borrower_id,
      partner_loan_id: data.partner_loan_id,
      sanction_amount: data.sanction_amount,
      master_policy_number: response.master_policy_number
        ? response.master_policy_number
        : '',
      insurance_charges: data.insurance_amount,
      policy_premium: response.policyPremium,
      gst_on_policy_premium: response.gstOnPolicyPremium,
      tenure_in_months: response.loanTenureInMonths,
      borrower_age: response.borrowerAge,
      processor_ratio: '',
      partner_ratio: '',
      premium_multiplier: response.premium_multiplier
        ? response.premium_multiplier
        : '',
    };
    const updateInsuranceDetails = await BorrowerInsuranceSchma.updateByLID(
      data.loan_id,
      datatoUpdate,
    );
    if (!updateInsuranceDetails)
      throw {
        sucess: false,
        message: 'Error while updating borrower insurance details.',
      };
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

const calculatePremium = async (
  age,
  tenureInMonths,
  loanAmount,
  premiumMultiplier,
) => {
  try {
    //Using age and tenure determine the policy premium using Base Policy Premium Rate Sheet
    const policyPremiumByAge = await PolicyPremiumRateSchema.findByAge(age);
    if (!policyPremiumByAge)
      throw {
        success: false,
        message: 'Exception: Requested policy configuration not found',
      };
    const policyPremiumObj = JSON.parse(JSON.stringify(policyPremiumByAge));
    delete policyPremiumObj.max_age;
    delete policyPremiumObj.min_age;
    const keys = Object.keys(policyPremiumObj);
    let tenureArray = [];
    keys.forEach((key) => {
      if (tenureInMonths == key * 1 || tenureInMonths < key * 1) {
        tenureArray.push(key);
      }
    });
    if (!tenureArray.length)
      throw {
        success: false,
        message: 'Exception: Requested policy configuration not found',
      };
    const policyPremiumByTenure = policyPremiumByAge[`${tenureArray[0]}`];
    //Calculate policy premium
    policyPremium =
      ((loanAmount * 1) / 1000) *
      policyPremiumByTenure *
      Number(premiumMultiplier);
    //18% of GST should be applied on the above calculated policy premium amount to arrive at the Total premium inclusive of GST
    gstOnPolicyPremium = policyPremium * 0.18;
    policyPremiumIncGST = policyPremium + gstOnPolicyPremium;
    policyPremiumIncGST =
      Math.round((policyPremiumIncGST * 1 + Number.EPSILON) * 100) / 100;

    return { success: true, policyPremiumIncGST };
  } catch (error) {
    return error;
  }
};

const recordIssuePolicyStagingData = async (req, leadLoanData, loanData) => {
  try {
    // Calculate borrower age by DOB in BIC and fetch the AgeBand from master policy data
    const borrowerAge = await getAge(new Date(leadLoanData.dob).getFullYear());
    const policyPremiumByAge =
      await PolicyPremiumRateSchema.findByAge(borrowerAge);
    const stagingData = req.insuranceStagingData;
    loanCreationData = loanData[0];
    let insuredPersons = [
      {
        sum_insured: leadLoanData?.sanction_amount,
        premium:
          Math.round(
            ((loanCreationData.borrower_premium / 1.18) * 1 + Number.EPSILON) *
              100,
          ) / 100,

        first_name: leadLoanData?.first_name,
        last_name: leadLoanData?.last_name,
        gender: leadLoanData?.gender,
        age: borrowerAge,
        ageBand: `${policyPremiumByAge.min_age} - ${policyPremiumByAge.max_age}`,
        relationship: 'SELF',
        date_of_birth: leadLoanData?.dob,
        mobile: leadLoanData?.appl_phone,
        email: leadLoanData?.email_id,
        height: '0',
        weight: '0',
        tobacco: '0',
        alcohol: '0',
        heart_disease: '0',
        asthma: '0',
        lipid_disorder: '0',
        pre_existing_disease: '0',
        type: 'N',
        nominee: {
          relationship: 'Others',
          first_name: 'ARTHMATE FINANCING INDIA PRIVATE LIMITED',
          last_name: '.',
          gender: 'Unknown',
          date_of_birth: '1993-01-01',
        },
        address: {
          city: leadLoanData?.city,
          country: 'IN',
          street: leadLoanData?.resi_addr_ln1,
          state: leadLoanData?.state,
          pincode: leadLoanData?.pincode,
        },
        documents: [
          {
            document_type: 'P',
            document_id: leadLoanData?.appl_pan,
            issuing_authority: 'GOI',
            issuing_place: 'IN',
          },
        ],
      },
    ];
    const coborrPolicyDetails = {
      sum_insured: leadLoanData?.sanction_amount,
      premium:
        Math.round(
          ((loanCreationData.coborrower_premium / 1.18) * 1 + Number.EPSILON) *
            100,
        ) / 100,

      first_name: leadLoanData?.coborr_first_name,
      last_name: leadLoanData?.coborr_last_name,
      gender: leadLoanData?.coborr_gender,
      relationship: leadLoanData?.coborr_relationship_with_borrower,
      date_of_birth: leadLoanData?.coborr_dob,
      mobile: leadLoanData?.coborr_phone,
      email: leadLoanData?.coborr_email,
      height: '0',
      weight: '0',
      tobacco: '0',
      alcohol: '0',
      heart_disease: '0',
      asthma: '0',
      lipid_disorder: '0',
      pre_existing_disease: '0',
      type: 'N',
      address: {
        city: leadLoanData?.coborr_city,
        country: leadLoanData?.coborr_country,
        street: leadLoanData?.coborr_addr_line_1,
        state: leadLoanData?.coborr_state,
        pincode: leadLoanData?.coborr_pincode,
      },
      documents: [
        {
          document_type: 'P',
          document_id: leadLoanData?.coborr_pan,
          issuing_authority: 'GOI',
          issuing_place: 'IN',
        },
      ],
      nominee: {
        relationship: 'Others',
        first_name: 'ARTHMATE FINANCING INDIA PRIVATE LIMITED',
        last_name: '.',
        gender: 'Unknown',
        date_of_birth: '1993-01-01',
      },
    };
    if (leadLoanData.coborr_dob) {
      insuredPersons.push(coborrPolicyDetails);
    }

    let dataObj = {
      company_id: req.company._id,
      product_id: req.product._id,
      company_name: req.company.name,
      product_name: req.product.name,
      loan_id: loanCreationData.loan_id,
      digit_api_ref_number: process.env.DIGIT_API_REF_NUMBER,
      stage: 'policyIssuance',
      product_key: process.env.PRODUCT_KEY,
      loan_amount: leadLoanData?.sanction_amount,
      loan_tenure: stagingData.loanTenureInMonths,
      loan_account_number: loanCreationData.loan_id,
      package_name: 'Option 6',
      external_ref_number: loanCreationData.loan_id.slice(-20),
      master_policy_number: process.env.MASTER_POLICY_NUMBER,
      insured_product_code: process.env.INSURED_PRODUCT_CODE,
      partner_api_key: process.env.PARTNER_API_KEY,
      imd_code: process.env.IMD_CODE,
      total_collected_premium:
        Math.round(
          ((loanCreationData.insurance_amount / 1.18) * 1 + Number.EPSILON) *
            100,
        ) / 100,
      contract_coverages: [
        {
          section_id: '1',
          value: loanCreationData.sanction_amount,
        },
        {
          section_id: '2',
          value: loanCreationData.sanction_amount,
        },
        {
          section_id: '3',
          value: loanCreationData.sanction_amount,
        },
      ],
      insured_persons: insuredPersons,
      family_composition: leadLoanData.coborr_dob ? '2A' : '1A',
    };
    //Record data in issue_policy_staging collection.
    issuePolicyStagingRecord = await IssuePolicyStagingSchema.addNew(dataObj);
    if (!issuePolicyStagingRecord)
      throw {
        success: false,
        message:
          'Error while recording insurance data in issue policy staging schema.',
      };
    return { success: true };
  } catch (error) {
    return error;
  }
};

module.exports = {
  callInsurancePolicyIssueApi,
  validatePayload,
  validateGetPolicyDetailPayload,
  callGetPolicyDetailApi,
  validateGetPolicyPdfPayload,
  callGetPolicyPdfApi,
  loanInsuranceValidations,
  recordBorrowerInsuranceDetails,
  updateBorrowerInsuranceDetails,
  calculatePremium,
  recordIssuePolicyStagingData,
};
