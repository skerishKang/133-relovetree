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
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'admin.test@lovetree.dev').trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || 'LoveTree!admin2025');
const ADMIN_NAME = String(process.env.ADMIN_NAME || '테스트 관리자');

const USER_EMAIL = String(process.env.USER_EMAIL || 'user.test@lovetree.dev').trim();
const USER_PASSWORD = String(process.env.USER_PASSWORD || 'LoveTree!user2025');
const USER_NAME = String(process.env.USER_NAME || '테스트 사용자');

const SKIP_NORMAL_USER = String(process.env.SKIP_NORMAL_USER || '').trim() === '1';

async function ensureUser(email, password, displayName) {
  if (!email) {
    throw new Error('email is required');
  }
  try {
    const existing = await auth.getUserByEmail(email);
    console.log(`[INFO] 이미 존재하는 계정: ${email} (uid=${existing.uid})`);
    const updatePayload = {};
    if (password) updatePayload.password = password;
    if (displayName) updatePayload.displayName = displayName;
    if (Object.keys(updatePayload).length) {
      const updated = await auth.updateUser(existing.uid, updatePayload);
      console.log(`[INFO] 계정 정보 업데이트 완료: ${email} (uid=${updated.uid})`);
      return updated;
    }
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

  const adminUser = await ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME);
  const normalUser = SKIP_NORMAL_USER ? null : await ensureUser(USER_EMAIL, USER_PASSWORD, USER_NAME);

  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.collection('users').doc(adminUser.uid).set(
    {
      email: ADMIN_EMAIL,
      displayName: ADMIN_NAME,
      role: 'admin',
      createdAt: now,
      lastLogin: now,
    },
    { merge: true }
  );

  if (normalUser) {
    await db.collection('users').doc(normalUser.uid).set(
      {
        email: USER_EMAIL,
        displayName: USER_NAME,
        role: 'free',
        createdAt: now,
        lastLogin: now,
      },
      { merge: true }
    );
  }

  console.log('=== 완료 ===');
  console.log('관리자 테스트 계정:', ADMIN_EMAIL, ADMIN_PASSWORD);
  if (normalUser) {
    console.log('일반 테스트 계정  :', USER_EMAIL, USER_PASSWORD);
  } else {
    console.log('일반 테스트 계정  : (생성 안 함)');
  }
}

main().catch((err) => {
  console.error('에러 발생:', err);
  process.exit(1);
});
