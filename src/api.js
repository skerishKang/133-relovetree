/**
 * Lovetree - API Client for Netlify Functions
 * Postgres DB 연동용 API 함수들
 * 
 * 엔드포인트: .netlify/functions/{function-name}
 */

// API 기본 경로
const API_BASE = '/.netlify/functions';

/**
 * 트리 목록 조회
 * @param {string} userId - Firebase Auth user ID
 * @returns {Promise<Array>} 트리 배열
 */
async function fetchUserTrees(userId) {
  try {
    const response = await fetch(`${API_BASE}/get-trees?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.trees || [];
  } catch (error) {
    console.error('fetchUserTrees error:', error);
    return [];
  }
}

/**
 * 특정 트리의 기억들(moments) 조회
 * @param {string} treeId - 트리 ID
 * @returns {Promise<Array>} moments 배열
 */
async function fetchMoments(treeId) {
  try {
    const response = await fetch(`${API_BASE}/get-moments?treeId=${encodeURIComponent(treeId)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.moments || [];
  } catch (error) {
    console.error('fetchMoments error:', error);
    return [];
  }
}

/**
 * 개별 기억 상세 조회
 * @param {string} momentId - 기억 ID
 * @returns {Promise<Object>} moment 객체
 */
async function fetchMomentDetail(momentId) {
  try {
    const response = await fetch(`${API_BASE}/get-moment?id=${encodeURIComponent(momentId)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('fetchMomentDetail error:', error);
    return null;
  }
}

/**
 * 새 트리 생성
 * @param {string} userId - Firebase Auth user ID
 * @param {Object} treeData - 트리 데이터 { title, description, isPublic }
 * @returns {Promise<Object>} 생성된 트리
 */
async function createTree(userId, treeData) {
  try {
    const response = await fetch(`${API_BASE}/create-tree`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...treeData })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('createTree error:', error);
    return null;
  }
}

/**
 * 새 기억(moment) 생성
 * @param {Object} momentData - 기억 데이터 { treeId, title, emotion, videoUrl, memo, date }
 * @returns {Promise<Object>} 생성된 moment
 */
async function createMoment(momentData) {
  try {
    const response = await fetch(`${API_BASE}/create-moment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(momentData)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('createMoment error:', error);
    return null;
  }
}

/**
 * 기억에 연결 (가지 추가)
 * @param {string} parentMomentId - 부모 기억 ID
 * @param {Object} childMomentData - 자식 기억 데이터
 * @returns {Promise<Object>} 연결 결과
 */
async function connectMoments(parentMomentId, childMomentData) {
  try {
    const response = await fetch(`${API_BASE}/connect-moments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId: parentMomentId, ...childMomentData })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('connectMoments error:', error);
    return null;
  }
}

/**
 * 트리/기억 삭제
 * @param {string} id - 삭제할 항목 ID
 * @param {string} type - 'tree' 또는 'moment'
 * @returns {Promise<boolean>} 성공 여부
 */
async function deleteItem(id, type = 'tree') {
  try {
    const response = await fetch(`${API_BASE}/delete-${type}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    return response.ok;
  } catch (error) {
    console.error('deleteItem error:', error);
    return false;
  }
}

/**
 * 유저 프로필 조회/저장 (Auth 연동)
 * @param {string} userId - Firebase Auth user ID
 * @returns {Promise<Object>} 유저 데이터
 */
async function syncUserProfile(userId) {
  try {
    const response = await fetch(`${API_BASE}/sync-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('syncUserProfile error:', error);
    return null;
  }
}

// 전역 노출
window.fetchUserTrees = fetchUserTrees;
window.fetchMoments = fetchMoments;
window.fetchMomentDetail = fetchMomentDetail;
window.createTree = createTree;
window.createMoment = createMoment;
window.connectMoments = connectMoments;
window.deleteItem = deleteItem;
window.syncUserProfile = syncUserProfile;
