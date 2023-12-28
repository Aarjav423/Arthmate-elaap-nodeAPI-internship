var mongoose = require('mongoose');
const WebhookSchema = mongoose.Schema({
    request_id: {
        type: String,
        allowNull: true,
    },
    company_id: {
        type: Number,
        allowNull: true,
    },
    company_code: {
        type: String,
        allowNull: true,
    },
    is_webhook_received: {
        type: Boolean,
        allowNull: true,
        default: false
    },
    api_name: {
        type: String,
        allowNull: true,
    },
    status: {
        type: String,
        allowNull: false,
        default: 'PENDING',
    },
    webhook_audit: [
        {
            received_at: {
                type: Date,
                allowNull: true,
            },
        },
    ],
    loan_app_id: {
        type: String,
        allowNull: true,
    },
    service_request_id: {
        type: String,
        allowNull: true,
    },
    doc_code: {
        type: String,
        allowNull: true,
    },
    client_acknowledgement: {
        type: Object,
        allowNull: true,
    },
    webhook_response: {
        type: String,
        allowNull: true,
    },
    downloaded_data: {
        type: String,
        allowNull: true,
    }
},
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

var webhookModel = (module.exports = mongoose.model('webhook_details', WebhookSchema));

module.exports.addData = async (data) => {
    try {
        return await webhookModel.create(data);
    } catch (error) {
        console.log(error);
        return null;
    }
};

module.exports.findById = async (request_id) => {
    try {
        return await webhookModel.findOne({
            request_id: request_id,
        });
    } catch (error) {
        console.log(error);
        return null;
    }
};

module.exports.findBySRI = async (sri) => {
    try {
        return await webhookModel.findOne({
            service_request_id: sri,
        });
    } catch (error) {
        console.log(error);
        return null;
    }
};

module.exports.updateWebhookJson = async (sri, webhookResponse) => {
    try {
        return await webhookModel.findOneAndUpdate(
            {
                service_request_id: sri,
            },
            {
                $set: {
                    webhook_response: webhookResponse,
                    status: 'COMPLETED',
                    is_webhook_received: true,
                },
            }
        );
    } catch (error) {
        console.log(error);
        return null;
    }
};

module.exports.updateWebhookDocDownload = async (sri, docDownloadS3Url) => {
    try {
        return await webhookModel.findOneAndUpdate(
            {
                service_request_id: sri,
            },
            {
                $set: {
                    downloaded_data: docDownloadS3Url,
                    status: 'DOCUMENT-DOWNLOADED',
                    is_webhook_received: true,
                },
            }
        );
    } catch (error) {
        console.log(error);
        return null;
    }
}

module.exports.updateDocDownloadFailed = async (sri) => {
    try {
        return await webhookModel.findOneAndUpdate(
            {
                service_request_id: sri,
            },
            {
                $set: {
                    status: 'DOWNLOAD-FAILED',
                    is_webhook_received: true,
                },
            }
        );
    } catch (error) {
        return null;
    }
};

module.exports.updateWebhookResponseFailed = async (sri, webhookResponse) => {
    try {
        return await webhookModel.findOneAndUpdate(
            {
                service_request_id: sri,
            },
            {
                $set: {
                    webhook_response: webhookResponse,
                    status: 'DOWNLOAD-FAILED',
                    is_webhook_received: true,
                },
            }
        );
    } catch (error) {
        return null;
    }
};

module.exports.findByRI = async (requestId) => {
    try {
        return await webhookModel.findOne({
            request_id: requestId,
        });
    } catch (error) {
        console.log(error);
        return null;
    }
};

module.exports.updateClientAck = async (sri, ackData) => {
    try {
        return await webhookModel.findOneAndUpdate(
            {
                service_request_id: sri,
            },
            {
                $set: {
                    client_acknowledgement: ackData,
                },
            }
        );
    } catch (error) {
        console.log(error);
        return null;
    }
};

module.exports.updateWebhook = async (webhookDetails) => {
    try {
        return await webhookModel.findOneAndUpdate(
            {
                service_request_id: webhookDetails.service_request_id,
            },
            {
                $set: {
                    downloaded_data: webhookDetails.downloaded_data,
                    status: webhookDetails.status,
                    is_webhook_received: webhookDetails.is_webhook_received,
                    webhook_audit: webhookDetails.webhook_audit,
                },
            }
        );
    } catch (error) {
        console.log(error);
        return null;
    }
};

module.exports.findByLoanandReqId = async (request_id, loan_app_id) => {
    try {
        return await webhookModel.findOne({
            request_id: request_id,
            loan_app_id: loan_app_id,
        });
    } catch (error) {
        console.log(error);
        return null;
    }
};