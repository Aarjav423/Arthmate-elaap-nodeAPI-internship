const httpStatus = require('http-status');
const { check, query, param, validationResult } = require('express-validator');

const { LeadSectionService } = require('../../services');
const { BaseController } = require('../../common');
const { GstVerificationHelper } = require('../../helper');

class FetchGSTLeadSectionController extends BaseController {
    constructor(request, response, leadSectionService) {
        super(request, response);
        this.leadSectionService = leadSectionService;
    }

    async validate() {
        await Promise.all([
            param('loan_app_id')
                .exists()
                .withMessage('Loan_app_id is required')
                .isString()
                .withMessage('Loan_app_id must be a string')
                .notEmpty()
                .withMessage('Loan_app_id cannot be empty'),
            query('sequence')
                .exists()
                .withMessage('sequence is required')
                .isString()
                .withMessage('sequence must be a string')
                .notEmpty()
                .withMessage('sequence cannot be empty'),
            query('name')
                .exists()
                .withMessage('name is required')
                .isString()
                .withMessage('name must be a string')
                .notEmpty()
                .withMessage('name cannot be empty'),
        ]);

        const errors = validationResult(this.request);

        if (!errors.isEmpty()) {
            throw { errors: errors.array() };
        }
    }

    findItemByName = (OuterArray, name) => {
        for (const outerObject of OuterArray) {
            for (const item of outerObject.validation_checklist) {
                if (item.status == 'Approved') {
                    if (item.code == name) {
                        return item.remarks;
                    }
                } else {
                    return 'Rejected'
                }
            }
        }
    }

    async execute() {
        try {
            await this.validate();
            const { loan_app_id } = this.request.params;
            let query = { loan_app_id };
            const { name, sequence } = this.request.query;
            if (name) {
                query = { ...query, name };
            }
            if (sequence) {
                query = { ...query, sequence };
            }
            const leadSections = await this.leadSectionService.findAll(query);

            const gstValidationName = this.findItemByName(leadSections, "GST_VALIDATION_CHECK");
            const gstPareserName = this.findItemByName(leadSections, "GST_DATA_VALIDATION_CHECK");

            const gstParserArray = gstPareserName.split(":");
            const gstValidationArray = gstValidationName.split(":");

            if (!leadSections.length) {
                throw {
                    success: false,
                    message:
                        "Lead-Section doesn't exist for te given loan_app_id, sequence and name",
                };
            }

            if (gstValidationName !== 'Rejected' && gstPareserName !== 'Rejected') {
                let entityName = this.request.body.entity_name.toUpperCase();
                let entityPin = this.request.body.res_pincode;
                let entityState = this.request.body.res_state.toUpperCase();
                let gstDataName = gstValidationArray[1].toUpperCase();

                let ParserName = gstParserArray[1].toUpperCase();
                let ParserPin = gstParserArray[2];
                let ParserState = gstParserArray[3].toUpperCase();

                let status = 'deviation';
                let message = '';

                let stateName = GstVerificationHelper.nameMatch(entityState, ParserState);
                let pinNameCheck = GstVerificationHelper.nameMatch(ParserPin, entityPin);
                let entityNameCheck = GstVerificationHelper.nameMatch(entityName, gstDataName);
                let gstNameCheck = GstVerificationHelper.nameMatch(ParserName, gstDataName);

                if (pinNameCheck == 1) {
                    if (stateName > 0.7) {
                        if (gstNameCheck > 0.7) {
                            if (entityNameCheck > 0.7) {
                                status = 'approve';
                                message = 'GST verified successfully';
                            } else if (entityNameCheck < 0.2) {
                                status = 'reject';
                                message = 'GST failed successfully';
                            } else {
                                status = 'deviation';
                                message = 'GST was not verified because of GST name difference with entity';
                            }
                        } else if (gstNameCheck < 0.2) {
                            status = 'reject';
                            message = 'GST failed successfully';
                        } else {
                            status = 'deviation';
                            message = 'GST was not verified because of GST name difference with certificate';
                        }
                    } else if (stateName < 0.2) {
                        status = 'reject';
                        message = 'GST failed successfully';
                    } else {
                        status = 'deviation';
                        message = 'GST was not verified because of state name';
                    }
                } else {
                    status = 'reject';
                    message = 'GST failed successfully';
                }


                let finalResult = {
                    gstValidationStatus: status,
                    message: message
                }

                return finalResult;
            }
        } catch (error) {
            throw error;
        }
    }

    static create(request, response) {
        let fetchGSTLeadSectionController = new FetchGSTLeadSectionController(
            request,
            response,
            new LeadSectionService(),
        );
        return fetchGSTLeadSectionController;
    }
}

module.exports = FetchGSTLeadSectionController;
