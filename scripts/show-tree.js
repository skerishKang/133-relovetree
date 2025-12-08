// 특정 트리의 노드 요약을 출력하는 로컬 관리자 스크립트
// 사용법: node scripts/show-tree.js <treeId>

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(
  __dirname,
  '..',
  'relovetree-firebase-adminsdk-fbsvc-d8d4c96f15.json'
);

const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function main() {
  const treeId = process.argv[2];
  if (!treeId) {
    console.error('사용법: node scripts/show-tree.js <treeId>');
    process.exit(1);
  }

  console.log(`=== 트리 상세: id=${treeId} ===`);

  const doc = await db.collection('trees').doc(treeId).get();
  if (!doc.exists) {
    console.error('해당 id의 트리가 존재하지 않습니다.');
    process.exit(1);
  }

  const data = doc.data() || {};
  const name = data.name || '(제목 없음)';
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];

  console.log(`name=${name}, nodeCount=${nodes.length}`);
  console.log('--- 노드 목록 ---');

  if (!nodes.length) {
    console.log('(노드가 없습니다)');
    return;
  }

  nodes.forEach((node, index) => {
    const title = node.title || node.label || `(제목 없음 #${index})`;
    const desc = typeof node.description === 'string' ? node.description : '';
    const descLen = desc.trim().length;
    const videoId = node.videoId || node.videoID || node.video || null;
    const hasMoments = Array.isArray(node.moments) && node.moments.length > 0;

    const statusParts = [];
    if (!descLen) statusParts.push('설명 없음');
    else if (descLen < 20) statusParts.push(`설명 짧음(${descLen}자)`);
    if (!videoId) statusParts.push('videoId 없음');
    if (!hasMoments) statusParts.push('moments 없음');

    const status = statusParts.length ? statusParts.join(', ') : 'OK';

    console.log(
      `${index}. title=${title}, descLen=${descLen}, videoId=${videoId || '-'}, moments=$${
        hasMoments ? 'Y' : 'N'
      } -> ${status}`
    );
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('에러:', err);
    process.exit(1);
  });
