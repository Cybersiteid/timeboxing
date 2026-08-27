const BOOTSTRAP_ADMIN_EMAIL = "GANTI_EMAIL_ADMIN";
const USERS_HEADERS = [
  "id", "uid", "email", "name", "role", "status", "spreadsheetId",
  "createdAt", "lastLoginAt", "lastSyncAt"
];
const TASK_HEADERS = ["id", "title", "deadline", "done", "minutes", "updatedAt", "json"];
const IDEA_HEADERS = ["id", "title", "status", "targetMonth", "updatedAt", "json"];

function setupSystem() {
  const adminEmail = normalizeEmail_(BOOTSTRAP_ADMIN_EMAIL);
  if (!adminEmail || adminEmail === "ganti_email_admin") {
    throw new Error("Ganti BOOTSTRAP_ADMIN_EMAIL terlebih dahulu.");
  }

  const properties = PropertiesService.getScriptProperties();
  let masterId = properties.getProperty("MASTER_SPREADSHEET_ID");
  let folderId = properties.getProperty("DATA_FOLDER_ID");

  if (!folderId) {
    const folder = DriveApp.createFolder("Task Time Boxing - User Databases");
    folderId = folder.getId();
    properties.setProperty("DATA_FOLDER_ID", folderId);
  }

  if (!masterId) {
    const master = SpreadsheetApp.create("Task Time Boxing - Master Users");
    masterId = master.getId();
    properties.setProperty("MASTER_SPREADSHEET_ID", masterId);
    moveFileToDataFolder_(masterId);
  }

  const usersSheet = ensureSheet_(SpreadsheetApp.openById(masterId), "Users", USERS_HEADERS);
  const existing = getUserRecords_().find(user => user.email === adminEmail);
  if (!existing) {
    usersSheet.appendRow([
      Utilities.getUuid(), "", adminEmail, "Administrator", "admin", "active", "",
      new Date(), "", ""
    ]);
  } else {
    usersSheet.getRange(existing.row, 5, 1, 2).setValues([["admin", "active"]]);
  }

  setupApi();
  console.log("MASTER_SPREADSHEET_URL=" + SpreadsheetApp.openById(masterId).getUrl());
  console.log("DATA_FOLDER_URL=https://drive.google.com/drive/folders/" + folderId);
}

function setupApi() {
  const properties = PropertiesService.getScriptProperties();
  let token = properties.getProperty("TASK_TIMEBOXING_API_TOKEN");
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    properties.setProperty("TASK_TIMEBOXING_API_TOKEN", token);
  }
  console.log("GAS_API_TOKEN=" + token);
  console.log("GAS_API_URL=" + (ScriptApp.getService().getUrl() || "Deploy Web App terlebih dahulu"));
}

function doGet() {
  return jsonResponse_({ ok: true, service: "Task Time Boxing Multi User GAS" });
}

function doPost(event) {
  try {
    const request = JSON.parse(event.postData.contents || "{}");
    verifyInternalToken_(request.token);
    const identity = normalizeIdentity_(request.identity);
    const caller = requireActiveUser_(identity);

    switch (request.action) {
      case "getAppData":
        return jsonResponse_({ ok: true, data: getAppData_(caller) });
      case "saveAppData":
        return jsonResponse_({ ok: true, data: saveAppData_(caller, request.data) });
      case "listUsers":
        requireAdmin_(caller);
        return jsonResponse_({ ok: true, data: { users: listUsers_() } });
      case "createUser":
        requireAdmin_(caller);
        return jsonResponse_({ ok: true, data: { user: createUser_(request.data) } });
      case "updateUser":
        requireAdmin_(caller);
        return jsonResponse_({ ok: true, data: { user: updateUser_(request.data, caller) } });
      default:
        throw new AppError_("Aksi tidak dikenal.", "INVALID_ACTION");
    }
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error.message || "Backend GAS gagal.",
      code: error.code || "GAS_ERROR"
    });
  }
}

function getAppData_(user) {
  const database = getOrCreateUserDatabase_(user);
  return {
    tasks: readJsonRows_(database.getSheetByName("Tasks"), 7),
    ideas: readJsonRows_(database.getSheetByName("Ideas"), 6),
    profile: profileForClient_(user)
  };
}

function saveAppData_(user, data) {
  if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.ideas)) {
    throw new AppError_("Data aplikasi tidak valid.", "INVALID_DATA");
  }
  if (data.tasks.length > 2000 || data.ideas.length > 1000) {
    throw new AppError_("Batas data akun terlampaui.", "DATA_LIMIT");
  }

  const database = getOrCreateUserDatabase_(user);
  const now = new Date();
  const taskRows = data.tasks.map(task => [
    String(task.id || ""), safeCellText_(task.title), String(task.deadline || ""),
    Boolean(task.done), Number(task.minutes) || 0, now, JSON.stringify(task)
  ]);
  const ideaRows = data.ideas.map(idea => [
    String(idea.id || ""), safeCellText_(idea.title), String(idea.status || "inbox"),
    String(idea.targetMonth || ""), now, JSON.stringify(idea)
  ]);

  replaceRows_(database.getSheetByName("Tasks"), taskRows, TASK_HEADERS.length);
  replaceRows_(database.getSheetByName("Ideas"), ideaRows, IDEA_HEADERS.length);
  touchUser_(user.row, 10, now);
  return { saved: true, profile: profileForClient_(user) };
}

function listUsers_() {
  return getUserRecords_().map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    linked: Boolean(user.uid),
    spreadsheetId: user.spreadsheetId,
    databaseUrl: user.spreadsheetId ? "https://docs.google.com/spreadsheets/d/" + user.spreadsheetId + "/edit" : "",
    createdAt: serializeDate_(user.createdAt),
    lastLoginAt: serializeDate_(user.lastLoginAt),
    lastSyncAt: serializeDate_(user.lastSyncAt)
  }));
}

function createUser_(data) {
  const email = normalizeEmail_(data && data.email);
  const name = String((data && data.name) || "Pengguna").trim().slice(0, 80);
  const role = data && data.role === "admin" ? "admin" : "user";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new AppError_("Email pengguna tidak valid.", "INVALID_EMAIL");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (getUserRecords_().some(user => user.email === email)) {
      throw new AppError_("Email sudah terdaftar pada dashboard.", "EMAIL_EXISTS");
    }
    const userId = Utilities.getUuid();
    const database = createUserDatabase_({ id: userId, email: email, name: name });
    getUsersSheet_().appendRow([
      userId, "", email, name, role, "active", database.getId(), new Date(), "", ""
    ]);
    return listUsers_().find(user => user.id === userId);
  } finally {
    lock.releaseLock();
  }
}

function updateUser_(data, caller) {
  const id = String((data && data.id) || "");
  const records = getUserRecords_();
  const target = records.find(user => user.id === id);
  if (!target) throw new AppError_("Pengguna tidak ditemukan.", "USER_NOT_FOUND");

  const nextRole = data.role === "admin" ? "admin" : "user";
  const nextStatus = data.status === "disabled" ? "disabled" : "active";
  const activeAdmins = records.filter(user => user.role === "admin" && user.status === "active");
  if (target.id === caller.id && (nextRole !== "admin" || nextStatus !== "active")) {
    throw new AppError_("Admin tidak dapat menonaktifkan atau menurunkan role akun sendiri.", "SELF_LOCKOUT");
  }
  if (target.role === "admin" && target.status === "active" && activeAdmins.length === 1 && (nextRole !== "admin" || nextStatus !== "active")) {
    throw new AppError_("Minimal satu admin aktif harus tersedia.", "LAST_ADMIN");
  }

  getUsersSheet_().getRange(target.row, 5, 1, 2).setValues([[nextRole, nextStatus]]);
  return listUsers_().find(user => user.id === id);
}

function requireActiveUser_(identity) {
  if (!identity.emailVerified) {
    throw new AppError_("Verifikasi email sebelum menggunakan aplikasi.", "USER_NOT_FOUND");
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const records = getUserRecords_();
    let user = records.find(record => record.uid && record.uid === identity.uid);
    if (!user) user = records.find(record => record.email === identity.email);
    if (!user) throw new AppError_("Akun belum ditambahkan oleh admin.", "USER_NOT_FOUND");
    if (user.uid && user.uid !== identity.uid) {
      throw new AppError_("Email sudah terhubung dengan akun lain.", "USER_NOT_FOUND");
    }
    if (user.status !== "active") throw new AppError_("Akun dinonaktifkan admin.", "USER_DISABLED");

    const now = new Date();
    getUsersSheet_().getRange(user.row, 2, 1, 3).setValues([[identity.uid, identity.email, identity.name || user.name]]);
    getUsersSheet_().getRange(user.row, 9).setValue(now);
    return { ...user, uid: identity.uid, email: identity.email, name: identity.name || user.name, lastLoginAt: now };
  } finally {
    lock.releaseLock();
  }
}

function requireAdmin_(user) {
  if (user.role !== "admin") throw new AppError_("Akses admin diperlukan.", "ADMIN_REQUIRED");
}

function normalizeIdentity_(identity) {
  const uid = String((identity && identity.uid) || "").trim();
  const email = normalizeEmail_(identity && identity.email);
  if (!uid || !email) throw new AppError_("Identitas pengguna tidak lengkap.", "USER_NOT_FOUND");
  return {
    uid: uid,
    email: email,
    name: String((identity && identity.name) || email).trim().slice(0, 80),
    emailVerified: identity.emailVerified === true
  };
}

function verifyInternalToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty("TASK_TIMEBOXING_API_TOKEN");
  if (!expected || String(token || "") !== expected) {
    throw new AppError_("Token backend tidak valid.", "INVALID_TOKEN");
  }
}

function getOrCreateUserDatabase_(user) {
  if (user.spreadsheetId) {
    try {
      return SpreadsheetApp.openById(user.spreadsheetId);
    } catch (error) {
      console.warn("Database lama tidak dapat dibuka: " + error.message);
    }
  }
  const database = createUserDatabase_(user);
  getUsersSheet_().getRange(user.row, 7).setValue(database.getId());
  user.spreadsheetId = database.getId();
  return database;
}

function createUserDatabase_(user) {
  const label = (user.name || user.email || user.id).replace(/[\\/:*?"<>|]/g, " ").slice(0, 70);
  const spreadsheet = SpreadsheetApp.create("Time Boxing - " + label);
  const firstSheet = spreadsheet.getSheets()[0];
  firstSheet.setName("Tasks");
  ensureSheet_(spreadsheet, "Tasks", TASK_HEADERS);
  ensureSheet_(spreadsheet, "Ideas", IDEA_HEADERS);
  ensureSheet_(spreadsheet, "Info", ["key", "value"]);
  spreadsheet.getSheetByName("Info").getRange(2, 1, 3, 2).setValues([
    ["userId", user.id],
    ["email", user.email],
    ["createdAt", new Date()]
  ]);
  moveFileToDataFolder_(spreadsheet.getId());
  return spreadsheet;
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (current.join("|") !== headers.join("|")) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}

function getUsersSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("MASTER_SPREADSHEET_ID");
  if (!id) throw new Error("Jalankan setupSystem terlebih dahulu.");
  return ensureSheet_(SpreadsheetApp.openById(id), "Users", USERS_HEADERS);
}

function getUserRecords_() {
  const sheet = getUsersSheet_();
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, USERS_HEADERS.length).getValues().map((row, index) => ({
    row: index + 2,
    id: String(row[0] || ""),
    uid: String(row[1] || ""),
    email: normalizeEmail_(row[2]),
    name: String(row[3] || ""),
    role: row[4] === "admin" ? "admin" : "user",
    status: row[5] === "disabled" ? "disabled" : "active",
    spreadsheetId: String(row[6] || ""),
    createdAt: row[7],
    lastLoginAt: row[8],
    lastSyncAt: row[9]
  }));
}

function profileForClient_(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
}

function readJsonRows_(sheet, jsonColumn) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, jsonColumn, sheet.getLastRow() - 1, 1).getValues()
    .map(row => safeJsonParse_(row[0]))
    .filter(Boolean);
}

function replaceRows_(sheet, rows, width) {
  const existingRows = Math.max(0, sheet.getLastRow() - 1);
  if (existingRows) sheet.getRange(2, 1, existingRows, width).clearContent();
  if (rows.length) sheet.getRange(2, 1, rows.length, width).setValues(rows);
}

function moveFileToDataFolder_(fileId) {
  const folderId = PropertiesService.getScriptProperties().getProperty("DATA_FOLDER_ID");
  if (folderId) DriveApp.getFileById(fileId).moveTo(DriveApp.getFolderById(folderId));
}

function touchUser_(row, column, value) {
  getUsersSheet_().getRange(row, column).setValue(value);
}

function safeCellText_(value) {
  const text = String(value || "");
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function safeJsonParse_(value) {
  try {
    return value ? JSON.parse(String(value)) : null;
  } catch (error) {
    return null;
  }
}

function normalizeEmail_(value) {
  return String(value || "").trim().toLowerCase();
}

function serializeDate_(value) {
  return value instanceof Date ? value.toISOString() : String(value || "");
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function AppError_(message, code) {
  this.name = "AppError";
  this.message = message;
  this.code = code;
}
AppError_.prototype = Object.create(Error.prototype);
