/**
 * Only upto to 999999999
 * @param {*} amount
 * @returns
 */
const amountToIndianCurrencyWord = (amount) => {
  if (!amount) return '';
  const amounts = amount.toString().split('.');
  const before_point = new Number(amounts[0]);
  const after_point = new Number(amounts[1]);
  const word_before_point = numberToWords(before_point);
  const word_after_point = numberToWords(after_point);
  if (
    (before_point == 0 && after_point) ||
    (isNaN(before_point) && after_point)
  ) {
    return `${word_after_point}Paisas `;
  }
  if (before_point && isNaN(after_point)) {
    return `${word_before_point}`;
  }
  return `${word_before_point} and ${word_after_point}Paisas `;
};
const numberToWords = (amount) => {
  if (amount > 1000000000) {
    throw {
      message: 'Limit exceeded. Conversion possible upto 999999999',
    };
  }
  const single_digits = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
  ];
  const double_digits = [
    '',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tenth_digits = [
    '',
    'Ten',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];
  const numbers = [
    10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 40, 50, 60, 70, 80, 90,
  ];
  let amount_in_words = '';
  while (amount > 0) {
    if (amount >= 1 && amount < 10) {
      amount_in_words = amount_in_words + `${single_digits[amount]} `;
      break;
    }
    if (amount >= 10 && amount < 100 && numbers.includes(amount)) {
      amount_in_words =
        amount_in_words +
        (amount % 10 === 0
          ? `${tenth_digits[Math.floor(amount / 10)]}`
          : `${double_digits[amount % 10]}`);
      break;
    }
    if (amount >= 10 && amount < 100) {
      amount_in_words =
        amount_in_words +
        `${tenth_digits[Math.floor(amount / 10)]} ` +
        `${single_digits[amount % 10]} `;
      break;
    }
    if (amount >= 100 && amount < 1000) {
      amount_in_words =
        amount_in_words + `${single_digits[Math.floor(amount / 100)]} Hundred `;
      amount = amount % 100;
    }
    if (amount >= 1000 && amount < 10000) {
      amount_in_words =
        amount_in_words +
        `${single_digits[Math.floor(amount / 1000)]} Thousand `;
      amount = amount % 1000;
    }
    if (amount >= 10000 && amount < 100000) {
      const index = Math.floor(amount / 1000);
      if (index >= 10 && index < 100 && numbers.includes(index)) {
        amount_in_words =
          amount_in_words +
          (index % 10 === 0
            ? `${tenth_digits[Math.floor(index / 10)]} Thousand `
            : `${double_digits[index % 10]} Thousand `);
      } else {
        amount_in_words =
          amount_in_words +
          `${tenth_digits[Math.floor(index / 10)]} ` +
          `${single_digits[index % 10]} Thousand `;
      }
      amount = amount % 1000;
    }
    if (amount >= 100000 && amount < 1000000) {
      amount_in_words =
        amount_in_words + `${single_digits[Math.floor(amount / 100000)]} Lakh `;
      amount = amount % 100000;
    }
    if (amount >= 1000000 && amount < 10000000) {
      const index = Math.floor(amount / 100000);
      if (index >= 10 && index < 100 && numbers.includes(index)) {
        amount_in_words =
          amount_in_words +
          (index % 10 === 0
            ? `${tenth_digits[Math.floor(index / 10)]} Lakh `
            : `${double_digits[index % 10]} Lakh `);
      } else {
        amount_in_words =
          amount_in_words +
          `${tenth_digits[Math.floor(index / 10)]} ` +
          `${single_digits[index % 10]} Lakh `;
      }
      amount = amount % 100000;
    }
    if (amount >= 10000000 && amount < 100000000) {
      amount_in_words =
        amount_in_words +
        `${single_digits[Math.floor(amount / 10000000)]} Crore `;
      amount = amount % 10000000;
    }
    if (amount >= 100000000 && amount < 1000000000) {
      const index = Math.floor(amount / 10000000);
      if (index >= 10 && index < 100 && numbers.includes(index)) {
        amount_in_words =
          amount_in_words +
          (index % 10 === 0
            ? `${tenth_digits[Math.floor(index / 10)]} Crore `
            : `${double_digits[index % 10]} Crore `);
      } else {
        amount_in_words =
          amount_in_words +
          `${tenth_digits[Math.floor(index / 10)]} ` +
          `${single_digits[index % 10]} Crore `;
      }
      amount = amount % 10000000;
    }
  }
  return amount_in_words;
};

module.exports = {
  amountToIndianCurrencyWord,
};
