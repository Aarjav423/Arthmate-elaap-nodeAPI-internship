function getFinancialYearQuarterDetails(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  let quarter;
  if (month >= 4 && month <= 6) {
    quarter = 'Q1';
  } else if (month >= 7 && month <= 9) {
    quarter = 'Q2';
  } else if (month >= 10 && month <= 12) {
    quarter = 'Q3';
  } else {
    quarter = 'Q4';
  }
  return `${year - 1}-${year}${quarter}`;
}
 
function getFinancialQuarters(startDate, endDate) {
  const quarters = [];
  const endQuarter = getFinancialYearQuarterDetails(endDate);
  let currentDate = new Date(startDate);
  while (true) {
    const quarterString = getFinancialYearQuarterDetails(currentDate);
    quarters.push({ label: quarterString, value: quarterString });
    if (quarterString === endQuarter) {
      break;
    }
    currentDate.setMonth(currentDate.getMonth() + 3);
  }
  return quarters;
}

function getSpecificDay(date) {
  if(date !== 'null'){
    let d = new Date(date);
    let datePlusOne = d.setDate(d.getDate() + 1);
    datePlusOne = new Date(datePlusOne).toISOString();
    return {"$gte": date, "$lt":datePlusOne}
  } else {
    return null;
  }

}

module.exports = {
  getFinancialQuarters,
  getSpecificDay
};
