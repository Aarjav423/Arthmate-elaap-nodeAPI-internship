const { ObjectId } = require("mongodb");
var mongoose = require("mongoose");
mongoose.Promise = global.Promise;

var CoLenderReqRes = mongoose.Schema({
    id: {
        type: ObjectId,
        primaryKey: true,
        allowNull: false
    },
    request_id : {
        type : String,
        allowNull : false
    },
    co_lender_id : {
        type : Number,
        allowNull : true
    },
    co_lender_shortcode : {
        type : String,
        allowNull : true
    },
    api_name : {
        type : String,
        allowNull : true,
        enum : [
            "co-lender-utr",
            "update-net-invest",
            "co-lender-disbursal-status",
            "co-lender-repayment",
            "abfl-bre-status",
            "abfl-mrp-polling"
        ]
    },
    request_type : {
        type : String,
        allowNull : true,
        enum : ["request","response"]
    },
    status : {
        type : Boolean,
        allowNull : true
    },
    raw_data : {
        type : String,
        allowNull : true
    }
},{
    timestamp : {
        createdAt : "created_at",
        updatedAt : "updated_at"
    } 
})

var CoLenderReqRes = (module.exports = mongoose.model("co_lender_request_response", CoLenderReqRes));

module.exports.addOne = (coLenderReqRes) => {
    return new CoLenderReqRes(coLenderReqRes).save();
}