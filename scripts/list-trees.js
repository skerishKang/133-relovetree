// 트리 리스트를 출력하는 로컬 관리자 스크립트
// Firestore trees 컬렉션에서 id, name, nodeCount 등을 조회한다.

const admin = require('firebase-admin');
const path = require('path');

// 레포 루트 기준 서비스 계정 JSON 경로
const serviceAccountPath = path.join(__dirname, '..', 'relovetree-firebase-adminsdk-fbsvc-d8d4c96f15.json');

const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function main() {
  console.log('=== 트리 리스트 (최대 100개, lastUpdated 내림차순) ===');

  const snapshot = await db
    .collection('trees')
    .orderBy('lastUpdated', 'desc')
    .limit(100)
    .get();

  if (snapshot.empty) {
    console.log('(trees 컬렉션에 문서가 없습니다)');
    return;
  }

  let index = 0;
  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    const nodeCount =
      typeof data.nodeCount === 'number'
        ? data.nodeCount
        : Array.isArray(data.nodes)
        ? data.nodes.length
        : 0;
    const name = data.name || '(제목 없음)';
    const ownerId = data.ownerId || '(owner 없음)';
    const isDemo = !!data.isDemo;
    const isAiBot = !!data.isAiBot;
    const lastUpdated =
      data.lastUpdated && typeof data.lastUpdated.toDate === 'function'
        ? data.lastUpdated.toDate().toISOString()
        : null;

    console.log(
      `${++index}. id=${doc.id}, name=${name}, nodeCount=${nodeCount}, ownerId=${ownerId}, isDemo=${isDemo}, isAiBot=${isAiBot}, lastUpdated=${lastUpdated}`
    );
  });
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('에러:', err);
    process.exit(1);
  });
