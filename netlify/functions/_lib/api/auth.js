/**
 * Auth Helpers - User authentication and admin checks
 */

const documentStore = require('../document-store');

async function isAdminUser(user) {
  if (!user || !user.uid) return false;
  const role = await documentStore.getUserRole(user.uid);
  return role === 'admin';
}

module.exports = {
  isAdminUser,
};