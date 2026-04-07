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

  try {
    let body;
    if (event.isBase64Encoded) {
      body = JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'));
    } else {
      body = JSON.parse(event.body);
    }

    const { endpoint, payload, token } = body;

    if (!endpoint || !payload) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing endpoint or payload' })
      };
    }

    const url = `https://acicloud.appspot.com${endpoint}`;

    const fetchHeaders = { 'Content-Type': 'application/json' };
    if (token) {
      fetchHeaders['token'] = token;
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify(payload)
    });

    const data = await resp.text();

    return {
      statusCode: 200,
      headers,
      body: data
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Proxy error', detail: err.message })
    };
  }
};
