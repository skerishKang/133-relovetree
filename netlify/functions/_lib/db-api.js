const {
  applyTransform,
  applyPatch,
  DELETE_SENTINEL
} = require('./document-store');

const {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  queryCollection,
  addDoc,
  runTransaction,
  getUserRole,
  getConfigByTableName
} = require('./document-store');

module.exports = {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  queryCollection,
  addDoc,
  runTransaction,
  getUserRole,
  getConfigByTableName,
  applyTransform,
  applyPatch,
  DELETE_SENTINEL
};
