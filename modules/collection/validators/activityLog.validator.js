const { check, query } = require('express-validator');
const { ActivityLog } = require('../models');
const fetchActivityLogsValidationRules = () => {
  const validationRules = [
    query("limit").optional().isNumeric().withMessage("Limit must be a number"),
    query("page").optional().isNumeric().withMessage("Page must be an number"),
    query("sortBy")
      .optional()
      .custom(async (value) => {
        const sortParameter = value.split(":");
        const schema = Case.schema.obj;
        if (!(sortParameter[0] in schema)) {
          throw new Error("Invalid sort parameter");
        }
        if (
          sortParameter.length > 1 &&
          (sortParameter[1] != "desc" && sortParameter[1] != "asc")
        ) {
          throw new Error("Invalid sort parameter");
        }
        return true;
      }),
    query('populate')
      .optional()
      .custom(async (value) => {
        const populatePath = value.split(',');
        const schema = ActivityLog.schema.obj;
        populatePath.forEach(element => {
          if (!(element in schema)) {
            throw new Error(`Invalid populate path. ${element}`)
          }
        });
        return true;
      })
  ];

  return validationRules;
};

module.exports = {
    fetchActivityLogsValidationRules
};
