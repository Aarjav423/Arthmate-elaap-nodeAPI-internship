const CollectionBankDetailsMaster = require('../models/collection-account-master-schema.js');
const jwt = require('../util/jwt');

module.exports = (app) => {
  app.get('/api/collection-bank-details',
  async (req, res) => {
    try {
      const collectionBankAccounts = await CollectionBankDetailsMaster.getAll();
      if (!collectionBankAccounts.length)
        throw {
          message: 'No collection bank accounts found',
        };
      return res.status(200).send(collectionBankAccounts);
    } catch (error) {
      return res.status(400).send(error);
    }
  })
}