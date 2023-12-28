const PDFDocument = require('pdfkit');
const { failResponse } = require('../utils/responses');
const doc = new PDFDocument();
var FileSystem = require('fs');
var path = require('path');

const getDatafromStream = (writeStream, fileName) => {
  const promise = new Promise((resolve, reject) => {
    try {
      writeStream.on('finish', () => {
        const chunk = [];
        const fileContent = FileSystem.readFileSync(fileName);
        chunk.push(fileContent);
        const base64Data = Buffer.concat(chunk).toString('base64');
        resolve(base64Data);
      });
    } catch (error) {
      reject(error);
    }
  });
  return promise;
};

const convertImageToPDF = async (req, res, file) => {
  try {
    let fileName = `${file?.originalname}-${Date.now()}.pdf`;
    const doc = new PDFDocument({
      size: 'A4',
    });
    let writeStream = FileSystem.createWriteStream(fileName);
    doc.pipe(writeStream);
    doc.fontSize(12);
    doc.image(file?.buffer, {
      fit: [450, 450],
      align: 'center',
      valign: 'center',
    });
    // Finalize PDF file
    doc.end();
    const finalData = await getDatafromStream(writeStream, fileName);
    FileSystem.unlink(fileName, (err) => {
      if (err) {
        failResponse(req, res, err);
      }
    });
    return finalData;
  } catch (error) {
    return failResponse(req, res, error);
  }
};

const convertTextToPDF = async (req, res, file) => {
  try {
    let fileName = `${file?.originalname}-${Date.now()}.pdf`;
    const doc = new PDFDocument({
      size: 'A4',
    });
    let writeStream = FileSystem.createWriteStream(fileName);
    doc.pipe(writeStream);
    doc.fontSize(12);
    doc.text(`${file?.buffer}`, {
      width: 480,
      align: 'left',
    });
    // Finalize PDF file
    doc.end();
    const finalData = await getDatafromStream(writeStream, fileName);
    FileSystem.unlink(fileName, (err) => {
      if (err) {
        if (err) {
          failResponse(req, res, err);
        }
      }
    });
    return finalData;
  } catch (error) {
    return failResponse(req, res, error);
  }
};

const convertPDFToBase64 = async (req, res, file) => {
  try {
    let chunk = [];
    chunk.push(file?.buffer);
    const base64Data = Buffer.concat(chunk).toString('base64');
    return base64Data;
  } catch (error) {
    return failResponse(req, res, error);
  }
};

module.exports = {
  convertImageToPDF,
  convertTextToPDF,
  convertPDFToBase64,
};
