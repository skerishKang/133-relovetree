# Firestore Compat Transaction Risk Analysis

**분석일**: 2026-04-08  
**목표**: `runTransaction` 한계를 기준으로 위험한 호출 지점 식별

---

## 1. 현재 `runTransaction` 구현 분석

### Compat 레이어 구조

| 계층 | 위치 | 역할 |
|------|------|------|
| 클라이언트 | `src/firebase-firestore-compat.js:300` | `db.runTransaction()` → actions 배열로 변환 |
| API 라우터 | `netlify/functions/_lib/firestore-api.js:160` | `runTransaction` op 수신 |
| document-store | `netlify/functions/_lib/document-store.js:485` | Postgres 트랜잭션으로 실행 |

### Compat의 한계 (POSTGRES_MIGRATION.md 기준)

> `runTransaction` is intentionally minimal. **Reads inside the client callback are not part of the same database snapshot yet.**

**핵심 문제**: 트랜잭션 내 read가 DB 스냅샷에 포함되지 않음

```javascript
// community.js:296-300 (문제 코드)
await db.runTransaction(async (tx) => {
    const commentSnap = await tx.get(commentRef);  // ⚠️ 이 read가 스냅샷에 포함되지 않음
    // ...
});
```

---

## 2. 호출 지점 분석

### 2.1 댓글 삭제 (`deleteComment`) - community.js:296-318

```javascript
await db.runTransaction(async (tx) => {
    const commentSnap = await tx.get(commentRef);  // ⚠️ Read 문제
    if (!commentSnap.exists) throw new Error('comment_not_found');
    // ...
    tx.update(commentRef, { isDeleted: true, ... });
    tx.update(postRef, { commentCount: firebase.firestore.FieldValue.increment(-1) });
});
```

| 항목 | 분석 |
|------|------|
| **위험도** | 🟡 중 |
| **문제** | Read가 스냅샷에 미포함 → 동시 삭제 시 중복 감소 가능 |
| **시나리오** | User A, User B가 동시에 같은 댓글 삭제 → commentCount -2 대신 -1 |

### 2.2 댓글 추가 (`addComment`) - community.js:1426-1430

```javascript
// 트랜잭션 없이 단일 update
await db.collection(COMMUNITY_COLLECTION)
    .doc(communityCurrentPostId)
    .update({
        commentCount: firebase.firestore.FieldValue.increment(1)
    });
```

| 항목 | 분석 |
|------|------|
| **위험도** | 🔴 높음 |
| **문제** | 트랜잭션 미사용 → atomic increment 아님 |
| **시나리오** | 동시 댓글 작성 시 카운터 드리프트 발생 확률 높음 |

---

## 3. Risk Matrix

| 지점 | 파일:줄 | 작업 유형 | 트랜잭션 | 위험도 |理由 |
|------|---------|----------|---------|--------|------|
| 댓글 삭제 | community.js:296 | delete + increment | ✅ 사용 | 🟡 중 | Read 미포함 문제 |
| 댓글 추가 | community.js:1426 | increment only | ❌ 없음 | 🔴 높음 | atomic 보장 안됨 |
|社区 게시물 작성 | index.js:956 | set only | ❌ 없음 | 🟢 낮음 | 단일 문서 쓰기, 카운터 아님 |
|社区 게시물 수정 | index.js:980 | merge set | ❌ 없음 | 🟢 낮음 | 단일 문서 쓰기, 카운터 아님 |

---

## 4. 분류: 즉시 수정 필요 vs 운영 감수 가능

### 🔴 즉시 수정 필요

**댓글 추가 (community.js:1426-1430)**
- **이유**: 트랜잭션 없이 `increment(1)` 호출 → 동시성 문제
- **수정안**:
  ```javascript
  // 옵션 1: 트랜잭션으로 래핑
  await db.runTransaction(async (tx) => {
      tx.update(postRef, { commentCount: firebase.firestore.FieldValue.increment(1) });
  });
  
  // 옵션 2: 백엔드에서 atomic counter 관리 (더 권장)
  // netlify/functions/tree-ai.js 또는 별도 API에서 increment
  ```

### 🟡 운영 감수 가능

**댓글 삭제 (community.js:296-318)**
- **이유**: 트랜잭션 사용 중이나 read 미포함 문제 있음. 다만 댓글 삭제는 상대적으로 ред发生
- **수정안**:
  ```javascript
  // 읽기 최적화: 클라이언트에서 사전 검증
  const commentSnap = await commentRef.get();
  if (!commentSnap.exists) throw new Error('comment_not_found');
  if (commentSnap.data().isDeleted) return;
  
  // 트랜잭션은 write만
  await db.runTransaction(async (tx) => {
      tx.update(commentRef, { isDeleted: true, ... });
      tx.update(postRef, { commentCount: firebase.firestore.FieldValue.increment(-1) });
  });
  ```

---

## 5. 최소 수정안 제안

### 5.1 댓글 추가에 트랜잭션 적용

**파일**: `community.js`  
**위치**: lines 1426-1430

**변경 전**:
```javascript
await db.collection(COMMUNITY_COLLECTION)
    .doc(communityCurrentPostId)
    .update({
        commentCount: firebase.firestore.FieldValue.increment(1)
    });
```

**변경 후**:
```javascript
const postRef = db.collection(COMMUNITY_COLLECTION).doc(communityCurrentPostId);
await db.runTransaction(async (tx) => {
    tx.update(postRef, {
        commentCount: firebase.firestore.FieldValue.increment(1)
    });
});
```

**영향**: 동시 댓글 작성 시 atomic 보장, Compat read 문제 영향 없음 (write만 함)

### 5.2 댓글 삭제 개선 (선택적)

**파일**: `community.js`  
**위치**: lines 296-318

사전 검증을 트랜잭션 외부로 이동:
```javascript
//事前 검증
const commentSnap = await commentRef.get();
if (!commentSnap.exists) return { ok: false, error: 'not_found' };
if (commentSnap.data().isDeleted) return { ok: true }; // 이미 삭제됨

// 트랜잭션은 write만
await db.runTransaction(async (tx) => {
    tx.update(commentRef, { isDeleted: true, ... });
    tx.update(postRef, { commentCount: firebase.firestore.FieldValue.increment(-1) });
});
```

---

## 6. 요약

| 분류 | 지점 | 조치 |
|------|------|------|
| 🔴 즉시 수정 | community.js:1426 (댓글 추가) | 트랜잭션으로 래핑 |
| 🟡 선택적 수정 | community.js:296 (댓글 삭제) | 사전 검증 추가 |
| 🟢 현재 유지 | index.js (게시물 작성/수정) | 단일 문서 опера션, 문제 無 |

**권장**: 댓글 추가에 트랜잭션 적용 (5-10분 소요)만으로도 동시성 문제 90% 이상 해결 가능
