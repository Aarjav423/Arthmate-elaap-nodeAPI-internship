const jwt = require('../util/jwt');
const bodyParser = require('body-parser');
const StatusLogsSchema = require('../models/status-logs-schema');
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get(
    '/api/status-logs/:page/:loan_id',
    [jwt.verifyToken, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const { loan_id, page } = req.params;
        const { rows, count } = await StatusLogsSchema.findStatusLogsByLID(
          loan_id,
          page,
        );
        if (rows.length)
          res.send({
            success: true,
            data: {
              rows,
              count,
            },
          });
        else {
          throw {
            success: false,
            message: 'No status logs found for the given loan id',
          };
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};
