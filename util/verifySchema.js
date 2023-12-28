const leadSchema = require('../maps/lead');
const loanSchema = require('../maps/borrowerinfo');
const loanDocumentSchema = require('../maps/loandocument');
const data = {
  templates: {
    lead: Object.keys(JSON.parse(JSON.stringify(leadSchema.data))),
    loan: Object.keys(JSON.parse(JSON.stringify(loanSchema.data))),
    loandocument: Object.keys(
      JSON.parse(JSON.stringify(loanDocumentSchema.data)),
    ),
  },
  excludes: {
    lead: leadSchema.excludes,
    loan: loanSchema.excludes,
    loandocument: loanDocumentSchema.excludes,
  },
};

const verifySchemaWithTemplate = (templates, inputFields) => {
  console.log('templates', templates);
  let validationObj = {
    notExists: [],
    mismatchTemplates: [],
    error: false,
  };
  //loop through all templates
  templates.forEach((item) => {
    console.log('item ==>', item);
    const tmpl = data.templates[item];
    const excludedColumns = data.excludes[item];
    // push non existing schema
    // developer need to add the schema for newly added template
    if (!tmpl) validationObj['notExists'].push(item);
    console.log('tmpl', tmpl);
    const inputFieldTmpl = inputFields[item];
    //console.log("inputFieldTmpl", inputFields["loan"]);
    //loop through cuttent and get all the fields of the template.
    let uploadTmplFields = [];
    inputFieldTmpl.forEach((fieldItem) => {
      uploadTmplFields.push(fieldItem.field);
    });
    // console.log("uploadTmplFields", uploadTmplFields);
    // loop through all the fields and check whether passed columns in excel are
    // matching with existing columns in code or not
    console.log('uploadTmplFields', uploadTmplFields);
    uploadTmplFields.forEach((label) => {
      if (excludedColumns.indexOf(label) < 0) {
        if (tmpl.indexOf(label) < 0) {
          console.log(
            `${label} not excluded - ${tmpl.indexOf(label)} not found`,
          );
          validationObj.mismatchTemplates.push(label);
          if (validationObj.mismatchTemplates.indexOf(item) < 0)
            validationObj.mismatchTemplates.push(`${item}`);
        }
      }
    });
  });
  console.log('outside loop');
  validationObj.error =
    validationObj.notExists.length || validationObj.mismatchTemplates.length;
  return validationObj;
};

module.exports = {
  verifySchemaWithTemplate,
};
