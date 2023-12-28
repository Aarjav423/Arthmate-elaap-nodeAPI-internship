var crypto = require('crypto');
var algorithm = 'aes-256-cbc';

const encryptDecrypt = async (Mode, encryptinput, iv) => {
  var InutString = JSON.stringify(encryptinput);
  var key = process.env.TOKEN_ID;
  var hash = crypto.createHash('sha256').update(key).digest();
  var hashstring = hash.toString('hex');
  let Dencryptedinput = '';
  hashstring = hashstring.substring(0, 32);
  try {
    if (Mode == 'Encrypt') {
      var b = process.env.TOKEN_ID;
      b = b.substring(0, 16);
      var iven = Buffer.from(b);
      var cipher = crypto.createCipheriv('aes-256-cbc', hashstring, iven);
      var encrypted =
        cipher.update(InutString, 'utf8', 'base64') + cipher.final('base64');
      encrypted = encrypted.split('+').join('-');
      encrypted = encrypted.split('/').join('_');
      iven = iven.toString('hex');
      return iven + '.' + encrypted;
    }
    if (Mode == 'Decrypt') {
      var iv = Buffer.from(iv, 'hex');
      Dencryptedinput = InutString.split('-').join('+');
      Dencryptedinput = Dencryptedinput.split('_').join('/');
      var decipher = crypto.createDecipheriv(algorithm, hashstring, iv);
      var Decrypted =
        decipher.update(Dencryptedinput, 'base64', 'utf8') +
        decipher.final('utf8');
      return Decrypted;
    }
  } catch (error) {
    return '';
  }
};

module.exports = { encryptDecrypt };
