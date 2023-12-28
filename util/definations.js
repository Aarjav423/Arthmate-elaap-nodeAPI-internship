const fileUploadError = {
  success: false,
  message: 'Error while uploading error data to s3',
};

const dbEntryError = {
  success: false,
  message: 'Error while adding error data to database',
};

module.exports = {
  fileUploadError,
  dbEntryError,
};
