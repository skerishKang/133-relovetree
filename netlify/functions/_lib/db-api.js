const { applyTransform, applyPatch, TABLE_CONFIG } = require('./document-store');
const { getDoc, setDoc, updateDoc, deleteDoc, queryCollection, addDoc, runTransaction, getUserRole, getConfigByTableName } = require('./document-store');

module.exports = {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  queryCollection,
  addDoc,
  runTransaction,
  getUserRole,
  TABLE_CONFIG,
  getConfigByTableName,
  // 육성 테스트를 위해 내부 함수 배출
  applyTransform,
  applyPatch
};
