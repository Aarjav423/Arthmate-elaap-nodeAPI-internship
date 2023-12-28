const getEPSILON = (num) => {
  return Math.round((num * 1 + Number.EPSILON) * 100) / 100;
};

const numberDecimalGetVal = (value) => {
  if (value?.$numberDecimal !== undefined) {
    return parseFloat(value.$numberDecimal.toString());
  } else if (typeof value === 'object') {
    return parseFloat(value.toString());
  }
  return value;
};
const generateSequentialStrings = () => {
  var result = [];

  // ASCII code for 'a' is 97, and for 'z' is 122
  for (var i = 97; i <= 122; i++) {
    for (var j = 97; j <= 122; j++) {
      for (var k = 97; k <= 122; k++) {
        var str =
          String.fromCharCode(i) +
          String.fromCharCode(j) +
          String.fromCharCode(k);
        result.push(str);
      }
    }
  }

  return result;
};

const generateSequentialNumbers = () => {
  var result = [];

  // ASCII code for 'a' is 97, and for 'z' is 122
  for (var i = 97; i <= 122; i++) {
    for (var j = 97; j <= 122; j++) {
      for (var k = 97; k <= 122; k++) {
        var str =
          String.fromCharCode(i) +
          String.fromCharCode(j) +
          String.fromCharCode(k);
        result.push(str);
      }
    }
  }

  return result;
};

module.exports = {
  getEPSILON,
  numberDecimalGetVal,
  generateSequentialStrings,
  generateSequentialNumbers,
};
