const axios = require('axios');
const qs = require('qs');
const handlePostRequest = async (url, data, options={}) => {
    let result;
    let error;
    try {
        result = await axios.post(url, data, options);

        return { result };
    } catch (error) {
        throw { error, message: error?.response?.data?.errors || "Error occured in handle Post Request", success: false }
    }
};
const handleGetRequest = async (url, options={}) => {
    let result;
    let error;
    try {
        result = await axios.get(url, options);
        return { result };
    } catch (error) {
        throw { error, message:error?.response?.data?.errors || "Error occured in handle Get Request", success: false }
    }
};

const handleDeleteRequest = async (url, options={}) =>{
    let result;
    try {
        result = await axios.delete(url, options);
        return { result };
    } catch (error) {
        throw { error, message:error?.response?.data?.errors || "Error occured while canceling subscription", success: false }
    }
}
module.exports = {
    handlePostRequest,
    handleGetRequest,
    handleDeleteRequest
};