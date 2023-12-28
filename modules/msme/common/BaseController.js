class BaseController {

  constructor(request, response) {
    this.request = request;
    this.response = response;
  }

  async validate() {}

  async execute() {}

  async executeAndHandleErrors() {
    try {
      let data = await this.execute();
      if (data == null) {
        data = {};
      }

      this.response.status(200).json(data);
    } catch (error) {
      if (error != null) {
        let message = error.message;

        let code = error.code ? error.code : 400;
        
        let data = { code: code, message: message, errors: [] };

        if (error.errors) {
          for (const err of error.errors) {
            data.errors.push(err);
          }
        }
        this.response.status(code >= 100 && code < 600 ? code : 500).json(data);
      } else {
        let data = {
          code: 400,
          message: 'Unable to process your request, please try again',
        };
        this.response.status(400).json(data);
      }
    }
  }
}

module.exports = BaseController;
