const { BaseService } = require('../common');
const { Compliance } = require('../models');

class ComplianceService extends BaseService {
    constructor() {
        super(Compliance);
    }

    XMLFindAndUpdate = async (loan_id, data) => {
        let temp = await this.model.findOneAndUpdate(
            {
                loan_app_id: loan_id,
            },
            {
                ...data,
            },
        );
        if (!temp) {
            temp = await this.model.create(data);
        }
        return temp;
    };
}

module.exports = ComplianceService;
