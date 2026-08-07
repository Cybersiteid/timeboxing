const crypto = require("crypto");

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

exports.handler = async function handler(event) {
  if (event.httpMethod !== "GET" && event.httpMethod !== "PUT") {
    return response(405, { error: "Metode tidak diizinkan." });
  }

  const appAccessToken = process.env.APP_ACCESS_TOKEN;
  if (!appAccessToken) {
    return response(503, { error: "Kunci akses aplikasi belum dikonfigurasi di Netlify." });
  }

  const authorization = event.headers.authorization || event.headers.Authorization || "";
  const suppliedToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!tokensMatch(suppliedToken, appAccessToken)) {
    return response(401, { error: "Kunci akses tidak valid." });
  }

  const gasUrl = process.env.GAS_API_URL;
  const gasToken = process.env.GAS_API_TOKEN;
  if (!gasUrl || !gasToken) {
    return response(503, { error: "Backend GAS belum dikonfigurasi di Netlify." });
  }

  try {
    let requestPayload = { action: "getAppData", token: gasToken };
    if (event.httpMethod === "PUT") {
      const data = JSON.parse(event.body || "{}");
      if (!Array.isArray(data.tasks) || !Array.isArray(data.ideas)) {
        return response(400, { error: "Data aplikasi tidak valid." });
      }
      requestPayload = { action: "saveAppData", token: gasToken, data };
    }

    const { gasResponse, result } = await callGasWithRetry(gasUrl, requestPayload);

    if (!gasResponse.ok || result.ok === false) {
      throw new Error(result.error || `Backend GAS gagal (${gasResponse.status}).`);
    }
    return response(200, result.data !== undefined ? result.data : result);
  } catch (error) {
    return response(502, { error: error.message || "Tidak dapat menghubungi backend GAS." });
  }
};

async function callGasWithRetry(gasUrl, requestPayload) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const gasResponse = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(requestPayload),
        redirect: "follow"
      });
      const raw = await gasResponse.text();
      let result;
      try {
        result = JSON.parse(raw);
      } catch {
        throw new Error("Backend GAS tidak mengembalikan JSON.");
      }
      return { gasResponse, result };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await delay(attempt * 700);
    }
  }

  throw lastError || new Error("Tidak dapat menghubungi backend GAS.");
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function tokensMatch(suppliedToken, expectedToken) {
  const supplied = Buffer.from(suppliedToken);
  const expected = Buffer.from(expectedToken);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body)
  };
}
