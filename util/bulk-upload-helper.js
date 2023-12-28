const BulkUploadQueueSchema = require('../models/bulk-upload-queue-schema');
const s3helper = require('../routes/third-party-apis/utils/aws-s3-helper');
const moment = require('moment');

const uploadBulkFile = async (data) => {
  const isInvalidFileType = data.file_name.split('.')[1] !== data.file_extension_type;
  if (isInvalidFileType)
    throw {
      success: false,
      message: `Only ${data.file_extension_type} files are allowed`,
    };

  let contentType = data.base64.split(';')[0].split(':')[1];
  let base64 = data.base64.split(',')[1];
  const buffer = new Buffer.from(base64, 'base64');
  let key = `${data.s3_folder_path}/${data.file_type}/${moment().format(
    'DD-MM-YYYY-HH-mm-ss',
  )}.${data.file_extension_type}`;

  const response = await s3helper.putFileIntoS3(key, buffer, contentType);
  if (!response)
    throw {
      success: false,
      message: 'Failed to upload file into S3',
    };

  let nachFileDump = {
    file_type: data.file_type,
    file_name: data.file_name,
    validation_stage: data.validation_stage,
    validation_status: data.validation_status,
    s3_url: response.Location,
    source_s3_url: response.Location,
    created_by: data.created_by,
    updated_by: data.updated_by,
  };
  if (data.company_id) {
    nachFileDump.company_id = data.company_id
  }
  if (data.file_code) {
    nachFileDump.file_code = data.file_code
  }
  let fileDump = await BulkUploadQueueSchema.save(nachFileDump);

  if (!fileDump)
    throw {
      success: false,
      message: 'Failed to save file details',
    };
}

module.exports = {
  uploadBulkFile
};