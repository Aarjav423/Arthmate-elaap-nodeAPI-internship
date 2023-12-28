const data = {
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  book_entity_id: {
    type: Number,
    allowNull: true,
  },
  company_id: {
    type: String,
    allowNull: true,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  borrower_id: {
    type: String,
    allowNull: false,
  },
  partner_loan_app_id: {
    type: String,
    allowNull: true,
  },
  partner_loan_id: {
    type: String,
    allowNull: true,
  },
  partner_borrower_id: {
    type: String,
    allowNull: true,
  },
  doc_stage: {
    type: String,
    allowNull: true,
  },
  code: {
    type: String,
    allowNull: false,
  },
  file_type: {
    type: String,
    allowNull: true,
  },
  file_url: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
  drawdown_request_id: {
    type: String,
    allowNull: true,
  },
  doc_key: {
    type: String,
    allowNull: true,
  },
  additional_file_url: {
    type: [String],
    default:undefined,
    allowNull: true,
  },
};

//copy variables you want to exclude from schema verification while uplaoding template
const excludes = [
  'id',
  'loan_id',
  'book_entity_id',
  'company_id',
  'doc_stage',
  'created_at',
  'updated_at',
  'base64pdfencodedfile',
  'additional_file_url',
];

module.exports = {
  data,
  excludes,
};
