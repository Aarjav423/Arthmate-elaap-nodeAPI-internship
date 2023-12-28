const karzaPostConfig = (apiUrl, keyValue, payload) => {
  return {
    url: apiUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-karza-key': keyValue,
    },
    data: JSON.parse(JSON.stringify(payload))
  }
}

const pushpakPostConfig = (apiUrl, keyValue, payload) => {
  return {
    url: apiUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: keyValue,
    },
    data: JSON.parse(JSON.stringify(payload))
  }
}

const riskPostConfig = (apiUrl, keyValue, payload) => {
  return {
    url: apiUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access-token': keyValue,
    },
    data: JSON.parse(JSON.stringify(payload))
  }
}

module.exports ={
  karzaPostConfig,
  pushpakPostConfig,
  riskPostConfig,
}