var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const ldSchema = require('../maps/loandocument');
const loanDocumentSchema = mongoose.Schema(ldSchema.data, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

autoIncrement.initialize(mongoose.connection);
loanDocumentSchema.plugin(autoIncrement.plugin, 'id');
var loanDocument = (module.exports = mongoose.model(
  'loandocument_common',
  loanDocumentSchema,
));

//bulk insert
module.exports.addInBulk = (loandocumentData) => {
  return loanDocument.insertMany(loandocumentData);
};

module.exports.addNew = (loandocumentData) => {
  return loanDocument.create(loandocumentData);
};

module.exports.updateExisting = (
  data,
  id,
  loan_app_id,
  borrower_id,
  doc_stage,
) => {
  var query = {
    _id: id,
    loan_app_id: loan_app_id,
    borrower_id: borrower_id,
    doc_stage: doc_stage,
  };
  return loanDocument.findOneAndUpdate(query, data, {});
};

module.exports.findIfExists = (loan_app_id, doc_stage, file_type, borrower_id) => {
  if(borrower_id){
    return loanDocument.findOne({
      loan_app_id,
      doc_stage,
      file_type,
      borrower_id,
    })
  }
  return loanDocument.findOne({
    loan_app_id,
    doc_stage,
    file_type,
  });
};

//for finding docs with drawdown_request_id and code
module.exports.findByUIDAndDoc = (drawdown_request_id, code) => {
  return loanDocument.findOne({
    drawdown_request_id,
    code,
  });
};

module.exports.findUploadedDocsByStage = (loan_app_id, doc_stage) => {
  let query = {
    loan_app_id,
  };
  if (
    doc_stage &&
    (doc_stage == 'pre_approval' ||
      doc_stage == 'post_approval' ||
      doc_stage == 'post_disbursal')
  )
    query.doc_stage = doc_stage;
  return loanDocument.find(query);
};

module.exports.findUploadedDrawdownDocsByStage = (loan_app_id, doc_stage) => {
  let query = {
    loan_app_id,
    doc_stage,
  };
  return loanDocument.find(query);
};

module.exports.findIfDocumentExists = (loan_id, borrower_id, document) => {
  var query = {
    loan_id,
    borrower_id,
    [document]: {
      $ne: null,
    },
  };
  return loanDocumentSchema.findOne(query);
};

module.exports.getPaginateddata = async (data, page) => {
  try {
    const response = await loanDocumentSchema
      .find(data)
      .skip((page - 1) * 25)
      .limit(25);
    let count = response.length;
    return {
      count: count,
      rows: response,
    };
  } catch (error) {
    return error;
  }
};

module.exports.findByKLID = (loan_id) => {
  return loanDocument.find({
    loan_id: loan_id,
  });
};

module.exports.findByLoanAppID = (loan_app_id) => {
  return loanDocument.find({
    loan_app_id,
  });
};

module.exports.findByKLIDAndDocType = (loan_id, filetype) => {
  return loanDocument
    .findOne({
      loan_id: loan_id,
    })
    .select([filetype]);
};

module.exports.findByKLAPPIDAndDocType = (loan_app_id, filetype) => {
  return loanDocument.findOne({
    loan_app_id: loan_app_id,
    file_type: filetype,
  });
};

module.exports.findByKLIDAndDrawDocType = (
  loan_app_id,
  filetype,
  drawdown_request_id,
) => {
  return loanDocument.findOne({
    loan_app_id: loan_app_id,
    drawdown_request_id: drawdown_request_id,
    filetype: filetype,
  });
};

module.exports.findAllRecord = (condition) => {
  return new Promise((resolve, reject) => {
    loanDocument
      .find(condition)
      .then((response) => {
        return resolve(response);
      })
      .catch((err) => {
        return reject(err);
      });
  });
};

module.exports.findByCondition = (condition) => {
  return loanDocument.findOne(condition);
};

module.exports.deleteDocs = async (loan_app_id, code, borrowerId= null) =>
{
  let query = {
    loan_app_id : loan_app_id,
    code : code
  }
  if (borrowerId)
  {
    query.borrower_id = borrowerId;
  }
  const data =  await loanDocument.findOneAndDelete(query);
  return data;
}

module.exports.findByIdAndCodeThenUpdate = (code, loan_app_id, data) => {
  var query = {
    loan_app_id: loan_app_id,
    code: code,
  };
  return loanDocument.findOneAndUpdate(query, data, {});
};

module.exports.findByCodeAndLoanAppID = async (code, loan_app_id,borrower_id) => {
  var query = {
    code: code,
    loan_app_id: loan_app_id,
  };

  if(borrower_id){
    query={
      ...query,
      borrower_id: borrower_id
    }
  }

  return await loanDocument.findOne(query);
};

module.exports.findRecentDocumentByLoanAppID = async(loanAppIds) => {
	const promise = new Promise((resolve, reject) => {
		try{
			loanDocument.aggregate([
				{
					$match: {
						loan_app_id: {
							$in: loanAppIds
						}
					},
				},
				{
					$sort: {
						created_at: -1,
					},
				},
				{
					$group: {
						_id: { code:'$code' },
						created_at: {
							$first: '$created_at'
						},
						loan_app_id: {
							$first: '$loan_app_id'
						},
						file_url: {
							$first: '$file_url'
						},
						code: {
							$first: '$code'
						},
						file_type: {
							$first: '$file_type'
						},
					},
				},
				{
					$sort: {
						code: 1,
					},
				},
			])
			.then((response) => {
				resolve(response);
			})
			.catch((err) => {
				reject(err);
			});
		}
		catch(error) {
			reject(error);
		}
	});
	return promise;
}
