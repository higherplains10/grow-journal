const http = require('http');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };
  }

  try {
    let body;
    if (event.isBase64Encoded) {
      body = JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'));
    } else {
      body = JSON.parse(event.body);
    }

    const { endpoint, payload, token } = body;

    if (!endpoint || !payload) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing endpoint or payload' }) };
    }

    const allowed = ['/api/user/appUserLogin', '/api/user/devInfoListAll'];
    if (!allowed.includes(endpoint)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Endpoint not allowed' }) };
    }

    if (token && !payload.userId) {
      payload.userId = token;
    }

    const result = await doRequest(endpoint, payload, token);
    return { statusCode: 200, headers, body: result };
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'AC Infinity API error', detail: err.message }) };
  }
};

function doRequest(endpoint, payload, token) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(payload)) {
      params.append(key, String(val));
    }
    const postData = params.toString();

    const reqHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'ACController/1.9.7 (com.acinfinity.humiture; build:533; iOS 18.5.0) Alamofire/5.10.2'
    };

    // Authenticated endpoints require token + phoneType + appVersion headers
    if (token) {
      reqHeaders['token'] = token;
      reqHeaders['phoneType'] = '1';
      reqHeaders['appVersion'] = '1.9.7';
    }

    const options = {
      hostname: 'www.acinfinityserver.com',
      port: 80,
      path: endpoint,
      method: 'POST',
      headers: reqHeaders,
      timeout: 15000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => { resolve(body); });
    });

    req.on('error', (e) => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(postData);
    req.end();
  });
}
