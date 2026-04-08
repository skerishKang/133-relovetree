const admin = require('firebase-admin');
const { httpError } = require('./http');

let adminInitialized = false;

function getAdmin() {
  if (adminInitialized) return admin;

  if (!admin.apps || !admin.apps.length) {
    const raw =
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!raw) {
      throw new Error(
        'Missing Firebase service account config: FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT'
      );
    }

    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  adminInitialized = true;
  return admin;
}

function extractBearerToken(event) {
  const headers = event && event.headers ? event.headers : {};
  const authHeader = headers.authorization || headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7).trim();
}

async function getUserFromEvent(event) {
  const token = extractBearerToken(event);
  if (!token) return null;
  try {
    const adminInstance = getAdmin();
    const decoded = await adminInstance.auth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email || '',
      decoded,
    };
  } catch (error) {
    throw httpError(401, 'Invalid ID token');
  }
}

async function requireUser(event) {
  const user = await getUserFromEvent(event);
  if (!user) throw httpError(401, 'Authentication required');
  return user;
}

module.exports = {
  getAdmin,
  getUserFromEvent,
  requireUser,
};
