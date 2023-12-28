const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const AccessMetrixSchema = require('../models/access-metrix-schema.js');

module.exports = (app, connection) => {
  //API to get paginated access metrix.
  app.get('/api/access_metrix/:page/:limit', async (req, res) => {
    try {
      const { page, limit } = req.params;
      const accessMetrix = await AccessMetrixSchema.findPaginatedAccessMetrix(
        page,
        limit,
      );
      if (!accessMetrix.rows.length)
        throw {
          success: false,
          message: 'No records found in access matrix',
        };
      return res
        .status(200)
        .send({
          success: true,
          data: JSON.parse(JSON.stringify(accessMetrix)),
        });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
  //API to add access metrix.
  app.post(
    '/api/access_metrix',
    [
      check('title')
        .notEmpty()
        .withMessage('title is required')
        .isLength({ min: 4, max: 100 })
        .withMessage('title length should be min 4 and max 100'),
      check('tag')
        .notEmpty()
        .withMessage('tag is required')
        .custom((value) => !/\s/.test(value))
        .withMessage('no space allowed in tag')
        .isLength({ min: 4, max: 100 })
        .withMessage('tag length should be min 4 and max 100'),
    ],
    async (req, res) => {
      try {
        const data = req.body;
        //Validate input payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        if (!data.title.replace(/\s*/g, ''))
          throw {
            success: false,
            message: 'title length should be min 4 and max 100',
          };
        if (!data.tag.replace(/\s*/g, ''))
          throw {
            success: false,
            message: 'tag length should be min 4 and max 100',
          };
        //Validate if access_metrix already exist.
        const accessMetrix = await AccessMetrixSchema.findIfExist(
          data.title,
          data.tag,
        );
        if (accessMetrix)
          throw {
            success: false,
            message: 'Access matrix already exists.',
          };
        const AccessMetrixRecord = await AccessMetrixSchema.addNew({
          title: data.title,
          tag: data.tag,
        });
        if (!AccessMetrixRecord)
          throw {
            success: false,
            message: 'Error while adding access matrix data.',
          };
        return res.status(200).send({
          success: true,
          message: 'Access matrix created successfully.',
          data: AccessMetrixRecord,
        });
      } catch (error) {
        let msg = '';
        if (error.code === 11000) {
          const key = Object.keys(error.keyValue);
          let msg = `${key[0]} already exist.`;
          return res.status(400).send({
            success: false,
            message: msg,
          });
        }
        return res.status(400).send(error);
      }
    },
  );
  //API to update access metrix.
  app.put('/api/access_metrix/:_id', async (req, res) => {
    try {
      const data = req.body;
      const { _id } = req.params;
      const { title, tag } = req.body;
      // check if record exists by id
      const accessMetrix = await AccessMetrixSchema.findIfExistById(_id);
      if (!accessMetrix)
        throw {
          success: false,
          message: 'Access matrix not exists.',
        };
      //Validate for the tags pass in payload.
      if (Number(tag) === 0)
        throw { success: false, message: 'tag cannot be empty' };
      //Validate for empty string
      if (Number(title) === 0)
        throw { success: false, message: 'title cannot be empty' };
      //Validate for the length of title.
      if (title) {
        if (title.toString().length < 4 || title.toString().length > 100)
          throw {
            success: false,
            message: 'title length should be min 4 and max 100',
          };
      }
      if (tag) {
        if (tag.toString().length < 4 || tag.toString().length > 100)
          throw {
            success: false,
            message: 'tag length should be min 4 and max 100',
          };
        if (/\s/.test(tag))
          throw {
            success: false,
            message: 'No space allowed in tag.',
          };
      }
      if (
        accessMetrix.title === title &&
        accessMetrix?.tag?.toString() === tag?.toString()
      )
        throw {
          success: false,
          message: 'Access matrix record has same data already.',
        };
      const accessMetrixByTitleTag = await AccessMetrixSchema.findIfExist(
        title,
        tag,
      );
      if (accessMetrixByTitleTag && accessMetrixByTitleTag._id !== _id)
        throw {
          success: false,
          message: 'Access matrix already exists with data for other record.',
        };
      const updatedAccessMetrix = await AccessMetrixSchema.updateAccessMetrix(
        { _id: _id },
        data,
      );
      if (!updatedAccessMetrix)
        throw { success: false, message: 'Unable to update access matrix' };
      return res.status(200).send({
        success: true,
        message: 'Access matrix updated successfully.',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};
