const { check } = require('express-validator');

const createAgencyValidationRules = () => {
    var requiredAttributes = [
        'name',
    ];

    var validationRules = [];
    for (let attribute of requiredAttributes) {
        validationRules.push(
            check(attribute)
                .notEmpty().withMessage(`Agency ${attribute} is required`)
                .isString().withMessage(`Agency ${attribute} should be string.`),
        );
    }
    return validationRules;
};
const updateAgencyValidationRules = () => {
    var requiredAttributes = [
        'name',
    ];

    var validationRules = [];
    for (let attribute of requiredAttributes) {
        validationRules.push(
            check(attribute)
                .optional()
                .notEmpty().withMessage(`Agency ${attribute} is required`)
                .isString().withMessage(`Agency ${attribute} should be string.`),
        );
    }
    return validationRules;
};

module.exports = {
    createAgencyValidationRules,
    updateAgencyValidationRules,
};