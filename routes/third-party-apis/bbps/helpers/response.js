const commonHeaders = require("./headers");

module.exports = {
  success(code = 200, input_data) {
    if (Array.isArray(input_data)) {
      return {
        statusCode: code,
        headers: commonHeaders,
        body: JSON.stringify(input_data, null, 2),
      };
    } else if (input_data != null && input_data.constructor.name === "Object") {
      return {
        statusCode: code,
        headers: commonHeaders,
        body: JSON.stringify(input_data, null, 2),
      };
    } else {
      return {
        statusCode: code,
        headers: commonHeaders,
        body: JSON.stringify(input_data, null, 2),
      };
    }
  },

  fail(code, input_data) {
    if (Array.isArray(input_data)) {
      return {
        statusCode: code,
        headers: commonHeaders,
        body: JSON.stringify(input_data, null, 2),
      };
    } else if (input_data != null && input_data.constructor.name === "Object") {
      return {
        statusCode: code,
        headers: commonHeaders,
        body: JSON.stringify(input_data, null, 2),
      };
    } else {
      return {
        statusCode: code,
        headers: commonHeaders,
        body: JSON.stringify(input_data, null, 2),
      };
    }
  }
}

