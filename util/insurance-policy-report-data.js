const moment = require('moment');
const { getEPSILON, numberDecimalGetVal } = require('./math-ops');

const getEndDateByRepaymentType = (type, disbursement_date_time, tenure) => {
  switch (type) {
    case 'daily':
      return moment(disbursement_date_time)
        .add(tenure, 'day')
        .format('YYYY-MM-DD');
    case 'monthly':
      return moment(disbursement_date_time)
        .add(tenure, 'M')
        .format('YYYY-MM-DD');
    case 'weekly':
      return moment(disbursement_date_time)
        .add(tenure * 7, 'day')
        .format('YYYY-MM-DD');
    case 'bullet':
      return moment(disbursement_date_time)
        .add(tenure, 'day')
        .format('YYYY-MM-DD');
    default:
      break;
  }
};
const generateInsuranceReportData = (
  ipsData,
  BICData,
  repaymentInstallmentsData,
) => {
  const reportData = {
    'Unique ID': ipsData.loan_id || '',
    'LAN ID': ipsData.loan_id || '',
    'Master policy number': 'D093963345',
    'Member Name': `${ipsData?.insured_persons[0]?.first_name || ''} ${
      ipsData?.insured_persons[0]?.last_name || ''
    }`,
    'Date of Birth': ipsData?.insured_persons[0]?.date_of_birth
      ? moment(ipsData?.insured_persons[0]?.date_of_birth).format('YYYY-MM-DD')
      : 'NA',
    Gender: ipsData?.insured_persons[0]?.gender || '',
    'Member Age': `${ipsData?.insured_persons[0].age || ''}`,
    AgeBand: `${ipsData?.insured_persons[0].ageBand || ''}`,
    'Family Composition': ipsData.family_composition || '',
    'Relationship to Employee':
      ipsData.family_composition === '1A' ? 'Self' : 'Others',
    'Nominee Name': 'ARTHMATE FINANCING INDIA PVT.LTD',
    'Nominee Relation': 'OTHER',
    'Sum Insured / Hospital Cash Allowance':
      getEPSILON(BICData.sanction_amount * 1) || '',
    'Br Premium': getEPSILON(ipsData.total_collected_premium * 1) || '',
    'Final Premium': getEPSILON(ipsData.total_collected_premium * 1.18) || '',
    'Annual Premium': '',
    'EMI Amount':
      getEPSILON(
        numberDecimalGetVal(repaymentInstallmentsData[0]?.emi_amount),
      ) || '',
    'Date of joining': BICData?.disbursement_date_time
      ? moment(BICData.disbursement_date_time).format('YYYY-MM-DD')
      : 'NA',
    'As at Date': BICData?.disbursement_date_time
      ? moment(BICData.disbursement_date_time).format('YYYY-MM-DD')
      : 'NA',
    Address:
      `${ipsData?.insured_persons[0]?.address?.street} ${ipsData?.insured_persons[0]?.address?.state} ${ipsData?.insured_persons[0]?.address?.city} ${ipsData?.insured_persons[0]?.address?.pincode}` ||
      '',
    'Pin code': ipsData?.insured_persons[0]?.address?.pincode || '',
    City: ipsData?.insured_persons[0]?.address?.city || '',
    State: ipsData?.insured_persons[0]?.address?.state || '',
    'Mobile Number': ipsData?.insured_persons[0]?.mobile || '',
    Email: ipsData?.insured_persons[0]?.email || '',
    Package: 'Option 6',
    'Document Type':
      `${ipsData?.insured_persons[0]?.documents[0]?.document_type}` || '',
    'Document No': `${ipsData?.insured_persons[0]?.documents[0]?.document_id}`,
    'Bank Account Number': BICData.bene_bank_acc_num || '',
    'Loan date': BICData?.disbursement_date_time
      ? moment(BICData.disbursement_date_time).format('YYYY-MM-DD')
      : 'NA',
    'Account Name': BICData.bene_bank_account_holder_name || '',
    RID: BICData?.disbursement_date_time
      ? moment(BICData.disbursement_date_time).format('YYYY-MM-DD')
      : 'NA',
    RED: getEndDateByRepaymentType(
      BICData.repayment_type.toLowerCase(),
      BICData.disbursement_date_time,
      BICData.tenure,
    ),
    'Loan Tenure': BICData.tenure || '',
    'Loan Amount': getEPSILON(BICData.sanction_amount) || '',
    'IMD Code': '1022169',
    'GST No': '',
    'Endorsement Type': 'New Employee',
    section1: getEPSILON(BICData.sanction_amount * 1) || '',
    section2: getEPSILON(BICData.sanction_amount * 1) || '',
    section3: getEPSILON(BICData.sanction_amount * 1) || '',
  };
  return reportData;
};

const insuranceReportFields = [
  'Unique ID',
  'LAN ID',
  'Master policy number',
  'Member Name',
  'Date of Birth',
  'Gender',
  'Member Age',
  'AgeBand',
  'Family Composition',
  'Relationship to Employee',
  'Nominee Name',
  'Nominee Relation',
  'Sum Insured / Hospital Cash Allowance',
  'Br Premium',
  'Final Premium',
  'Annual Premium',
  'EMI Amount',
  'Date of joining',
  'As at Date',
  'Address',
  'Pin code',
  'City',
  'State',
  'Mobile Number',
  'Email',
  'Package',
  'Document Type',
  'Document No',
  'Bank Account Number',
  'Loan date',
  'Account Name',
  'RID',
  'RED',
  'Loan Tenure',
  'Loan Amount',
  'IMD Code',
  'GST No',
  'Endorsement Type',
  'section1',
  'section2',
  'section3',
];

module.exports = {
  generateInsuranceReportData,
  insuranceReportFields,
};
