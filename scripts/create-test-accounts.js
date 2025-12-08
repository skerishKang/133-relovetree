// 테스트용 관리자/일반 계정 생성 스크립트
// 로컬에서만 사용하며, 서비스 계정 JSON은 .gitignore로 보호됩니다.

const admin = require('firebase-admin');
const path = require('path');

// 로컬 서비스 계정 키 파일 경로 (레포 루트 기준)
const serviceAccountPath = path.join(__dirname, '..', 'relovetree-firebase-adminsdk-fbsvc-d8d4c96f15.json');

const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = admin.auth();
const db = admin.firestore();

// 테스트용 계정 정보
const ADMIN_EMAIL = 'admin.test@lovetree.dev';
const ADMIN_PASSWORD = 'LoveTree!admin2025';

const USER_EMAIL = 'user.test@lovetree.dev';
const USER_PASSWORD = 'LoveTree!user2025';

async function ensureUser(email, password, displayName) {
  try {
    const existing = await auth.getUserByEmail(email);
    console.log(`[INFO] 이미 존재하는 계정: ${email} (uid=${existing.uid})`);
    return existing;
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      const created = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: false,
        disabled: false,
      });
      console.log(`[INFO] 새 계정 생성 완료: ${email} (uid=${created.uid})`);
      return created;
    }
    throw e;
  }
}

async function main() {
  console.log('=== 테스트용 계정 생성 시작 ===');

  const adminUser = await ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD, '테스트 관리자');
  const normalUser = await ensureUser(USER_EMAIL, USER_PASSWORD, '테스트 사용자');

  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.collection('users').doc(adminUser.uid).set(
    {
      email: ADMIN_EMAIL,
      displayName: '테스트 관리자',
      role: 'admin',
      createdAt: now,
      lastLogin: now,
    },
    { merge: true }
  );

  await db.collection('users').doc(normalUser.uid).set(
    {
      email: USER_EMAIL,
      displayName: '테스트 사용자',
      role: 'free',
      createdAt: now,
      lastLogin: now,
    },
    { merge: true }
  );

  console.log('=== 완료 ===');
  console.log('관리자 테스트 계정:', ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('일반 테스트 계정  :', USER_EMAIL, USER_PASSWORD);
}

main().catch((err) => {
  console.error('에러 발생:', err);
  process.exit(1);
});
