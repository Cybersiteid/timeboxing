const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

exports.handler = async function handler(event) {
  if (!["GET", "PUT", "POST"].includes(event.httpMethod)) {
    return response(405, { error: "Metode tidak diizinkan." });
  }

  const gasUrl = process.env.GAS_API_URL;
  const gasToken = process.env.GAS_API_TOKEN;
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!gasUrl || !gasToken || !firebaseProjectId || !serviceAccountJson) {
    return response(503, { error: "Backend multi-pengguna belum dikonfigurasi di Netlify." });
  }

  const authorization = event.headers.authorization || event.headers.Authorization || "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!idToken) return response(401, { error: "Sesi login diperlukan." });

  try {
    if (!getApps().length) {
      initializeApp({ credential: cert(JSON.parse(serviceAccountJson)), projectId: firebaseProjectId });
    }
    const decoded = await getAuth().verifyIdToken(idToken);
    const identity = {
      uid: decoded.uid,
      email: decoded.email || "",
      name: decoded.name || decoded.email || "Pengguna",
      emailVerified: decoded.email_verified === true
    };

    let requestPayload = { action: "getAppData", token: gasToken, identity };
    if (event.httpMethod === "PUT") {
      const data = JSON.parse(event.body || "{}");
      if (!Array.isArray(data.tasks) || !Array.isArray(data.ideas)) {
        return response(400, { error: "Data aplikasi tidak valid." });
      }
      requestPayload = { action: "saveAppData", token: gasToken, identity, data };
    }
    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const allowedActions = ["listUsers", "createUser", "updateUser"];
      if (!allowedActions.includes(data.action)) {
        return response(400, { error: "Aksi admin tidak valid." });
      }
      requestPayload = { action: data.action, token: gasToken, identity, data };
    }

    const { gasResponse, result } = await callGasWithRetry(gasUrl, requestPayload);
    if (!gasResponse.ok || result.ok === false) {
      const forbidden = ["USER_NOT_FOUND", "USER_DISABLED", "ADMIN_REQUIRED"].includes(result.code);
      const invalid = ["INVALID_ACTION", "INVALID_DATA", "INVALID_EMAIL", "EMAIL_EXISTS", "SELF_LOCKOUT", "LAST_ADMIN", "DATA_LIMIT"].includes(result.code);
      const status = forbidden ? 403 : invalid ? 400 : 502;
      return response(status, { error: result.error || `Backend GAS gagal (${gasResponse.status}).` });
    }
    return response(200, result.data !== undefined ? result.data : result);
  } catch (error) {
    const isAuthError = String(error.code || "").startsWith("auth/");
    return response(isAuthError ? 401 : 502, {
      error: isAuthError ? "Sesi login tidak valid atau sudah kedaluwarsa." : (error.message || "Tidak dapat menghubungi backend.")
    });
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

function response(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}
