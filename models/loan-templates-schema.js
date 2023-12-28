var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const LoanTemplatesSchema = mongoose.Schema({
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
  name: {
    type: String,
    allowNull: false,
  },
  path: {
    type: String,
    allowNull: false,
  },
  loan_custom_templates_id: {
    type: String,
    allowNull: false,
  },
  created_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
});
autoIncrement.initialize(mongoose.connection);
LoanTemplatesSchema.plugin(autoIncrement.plugin, 'id');
var LoanTemplates = (module.exports = mongoose.model(
  'loan_templates',
  LoanTemplatesSchema,
));

module.exports.addNew = (inputData) => {
  return LoanTemplates.create(inputData);
};

module.exports.findByIds = (ids) => {
  return LoanTemplates.find({
    _id: {
      $in: ids,
    },
  });
};

module.exports.findAllById = (id) => {
  console.log('LoanTemplates.findAllById', id);
  return LoanTemplates.find({
    loan_custom_templates_id: id,
  });
};

module.exports.findAllByIdAttributed = (id) => {
  return LoanTemplates.find({
    loan_custom_templates_id: id,
  }).select('name');
};

module.exports.findByNameTmplId = (id, name) => {
  console.log(`${id} ${name}`);
  return LoanTemplates.findOne({
    loan_custom_templates_id: id,
    name: name,
  });
};

module.exports.addBulk = (templates) => {
  let counter = 0;
  const myPromise = new Promise((resolve, reject) => {
    templates.forEach((record) => {
      LoanTemplates.create(record)
        .then((response) => {
          counter++;
          if (counter >= templates.length);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  });
  return myPromise;
};

module.exports.findByLoanCustomTepmlateId = (id) => {
  return LoanTemplates.find({
    loan_custom_templates_id: id,
  }).select('name', 'path');
};

module.exports.findByCondition = (condition) => {
  return LoanTemplates.find(condition);
};

module.exports.updateBulk = (data) => {
  const promise = new Promise((resolve, reject) => {
    try {
      let counter = 0;
      data.forEach((row) => {
        let query = {
          loan_custom_templates_id: row.loan_custom_templates_id,
          name: row.name,
        };
        return LoanTemplates.findOneAndUpdate(query, {
          path: row.path,
        })
          .then((result) => {
            counter++;
            if (counter == data.length) resolve(result);
          })
          .catch((error) => {
            reject(error);
          });
      });
    } catch (error) {
      reject(error);
    }
  });
  return promise;
};

module.exports.findByTemplateIds = (ids) => {
  return LoanTemplates.find({
    loan_custom_templates_id: {
      $in: ids,
    },
  });
};
