const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const s3helper = require('../utils/aws-s3-helper.js');
const NachReportStoragesSchema = require('../../../models/third-party-schema/enach/nach-report-storages-schema.js')

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/get-nach-report-data',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const { page, limit, fromDate, toDate, reportType } = req.body;
        const data = await NachReportStoragesSchema.findByFilter({ fromDate, toDate, reportType, page: page ? Number(page) : 0, limit: limit ? Number(limit): 10 });
        res.status(200).send(data);
      } catch (error) {
        return res.status(400).send(error);
      }
    }
  );

  app.get(
    '/api/download-nach-report-file/:id',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const fileData = await NachReportStoragesSchema.findById(req.params.id);
        if (!fileData)
          throw {
            success: false,
            message: 'No record found for report.',
          };

        const signedUrl = await s3helper.getSignedUrlForNach(fileData[0].s3_url, fileData[0].file_name);
        return res.status(200).send(signedUrl);
      } catch (error) {
        return res.status(400).send(error);
      }
    }
  );
}