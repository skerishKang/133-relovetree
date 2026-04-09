# Firestore Compat Layer Analysis

> 최종 업데이트: 2026-04-09
> 작성자: Claude (analysis mode)

---

## 1. 현재 Compat 구조

### 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────┐
│  클라이언트 (브라우저)                                               │
│  firebase.firestore() → FirestoreCompat (firebase-firestore-compat.js) │
│                                                                       │
│  - CollectionReference.doc().get()                                  │
│  - CollectionReference.where().orderBy().limit().get()            │
│  - DocumentReference.set/update/delete                              │
│  - CollectionReference.onSnapshot (polling)                        │
│  - WriteBatch / runTransaction                                      │
└────────────────────────────────────┬────────────────────────────────┘
                                     │ POST /api/firestore
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Netlify Functions                                                  │
│  firestore-api.js → _lib/firestore-api.js → _lib/document-store.js │
│                                                                       │
│  1. getUserFromEvent() - Firebase ID Token 검증                     │
│  2. assertAuthorized() - 경로/컬렉션별 권한 판정                      │
│  3. document-store.js - Postgres CRUD                               │
└────────────────────────────────────┬────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Neon PostgreSQL                                                    │
│                                                                       │
│  tables: users, trees, tree_comments, community_posts,               │
│          community_comments, ai_logs, community_moderation_logs     │
│                                                                       │
│  - 모든 데이터는 payload jsonb 컬럼에 저장                           │
│  - mapped fields만 dedicated column (id, role, name 등)              │
└─────────────────────────────────────────────────────────────────────┘
```

### 핵심 파일 역할

| 파일 | 라인 | 역할 |
|------|------|------|
| `src/firebase-firestore-compat.js` | 400 | 클라이언트侧 Firestore SDK 흉내 |
| `netlify/functions/firestore-api.js` | 26 | Netlify function 엔드포인트 |
| `netlify/functions/_lib/firestore-api.js` | 305 | 권한 판정/ops 라우팅 |
| `netlify/functions/_lib/document-store.js` | 545 | Postgres CRUD 구현 |
| `netlify/functions/_lib/db.js` | ~ | pg pool 관리 |

---

## 2. 지원 기능

### Firestore API 호환 (firebase-firestore-compat.js)

| Firestore API | 지원 여부 | 비고 |
|--------------|----------|------|
| `collection(path)` | ✅ | |
| `doc(id)` | ✅ | |
| `collection.add(data)` | ✅ | |
| `doc.get()` | ✅ | |
| `doc.set(data, {merge})` | ✅ | |
| `doc.update(data)` | ✅ | |
| `doc.delete()` | ✅ | |
| `collection.where(f, op, v)` | ✅ | ==, !=, <, <=, >, >=, array-contains |
| `collection.orderBy(f, dir)` | ✅ | |
| `collection.limit(n)` | ✅ | |
| `collection.onSnapshot(cb)` | ✅ | 4초 polling |
| `doc.onSnapshot(cb)` | ✅ | 4초 polling |
| `firestore.batch()` | ✅ | |
| `batch.set()` | ✅ | |
| `batch.update()` | ✅ | |
| `batch.delete()` | ✅ | |
| `batch.commit()` | ✅ | |
| `firestore.runTransaction(fn)` | ✅ | |
| `FieldValue.serverTimestamp()` | ✅ | |
| `FieldValue.increment(n)` | ✅ | |
| `FieldValue.arrayUnion(...values)` | ✅ | |
| `FieldValue.delete()` | ✅ | |

### 지원 컬렉션 (document-store.js TABLE_CONFIG)

| Collection | Table | 지원 여부 |
|------------|-------|----------|
| `users` | users | ✅ |
| `trees` | trees | ✅ |
| `trees/{id}/comments` | tree_comments | ✅ |
| `community_posts` | community_posts | ✅ |
| `community_posts/{id}/comments` | community_comments | ✅ |
| `ai_logs` | ai_logs | ✅ |
| `community_moderation_logs` | community_moderation_logs | ✅ |

### Postgres Transform 지원

- `serverTimestamp` → ISO string
- `increment` → 숫자、加算
- `arrayUnion` → JSON array merge
- `delete` → 컬럼 제거

---

## 3. 제약/주의점

### onSnapshot Polling 구조 (위험)

**위치**: `firebase-firestore-compat.js:340-367`

```javascript
function createPollingSubscription(target, callback, errorCallback) {
    let lastSignature = '';
    async function poll() {
        const snapshot = await target.get();
        const signature = JSON.stringify(snapshot.docs.map(...));
        if (signature !== lastSignature) {  // 변경 감지
            lastSignature = signature;
            callback(snapshot);            // 변경 시 콜백
        }
    }
    poll();
    const timer = window.setInterval(poll, 4000);  // 4초 간격
    return function unsubscribe() { ... };
}
```

**한계**:
- **실시간 아님**: 최대 4초 지연
- **불필요 polling**: 변경 없어도 4초마다 API 호출
- **서버 부하**: 사용자 수 × 4초마다 GET 요청
- ** race condition**: 동시에 여러 변경 시 일부 손실 가능

### Query 제약

**위치**: `document-store.js:396-434`

- `where`는 `==, !=, <, <=, >, >=, array-contains`만 지원
- `array-contains`는 단일 값만 지원 (다중 불가)
- `startAt`, `endAt`, `startAfter`, `endAfter` 미지원
- **커서 기반 페이지네이션 미지원**: offset 기반만
- **합성 인덱스 미지원**: where + orderBy 조합 시 성능 저하 가능

### 컬렉션 경로 제약

**위치**: `document-store.js:207-274`

- 하위 컬렉션은 `trees/{id}/comments`, `community_posts/{id}/comments`만 지원
- 새로운 하위 컬렉션 추가 시 코드 수정 필요
- `resolveCollectionPath()`, `resolveDocumentPath()` 수동 확장

### 권한 판정 이중 구조

**서버** (`_lib/firestore-api.js`):
```javascript
async function isAdminUser(user) {
    const adminEmails = String(process.env.ADMIN_EMAILS || '').split(',');
    if (email && adminEmails.includes(email)) return true;
    const role = await documentStore.getUserRole(user.uid);
    return role === 'admin';
}
```

**클라이언트** (`src/auth.js`):
- 하드코딩된 `adminEmails` 배열 사용
- 서버와 불일치 가능성

---

## 4. 위험 지점

### 🔴 높음 (즉시 대응 필요)

| 위험 | 위치 | 설명 | 완화책 |
|------|------|------|--------|
| **AUTH 이중 판정** | auth.js vs firestore-api.js | 클라이언트/서버 admin 기준 불일치 | ADMIN_EMAILS env统一, DB role 우선 |
| **_PUBLIC 트리 쓰기** | firestore-api.js:167-169 | viewCount/shareCount 인증 없이 수정 가능 | IP-based rate limiting |
| **Payload jsonb 쿼리** | document-store.js:405 | 매핑 안 된 필드는 LIKE 검색, 성능 저하 | 인덱스 추가 |

### 🟡 중간 (개선 필요)

| 위험 | 위치 | 설명 | 완화책 |
|------|------|------|--------|
| **onSnapshot 부하** | compat.js:362 | 4초마다 전체 문서 가져옴 | 변경时才 polling, Last-modified ETag |
| **Transaction 직렬화** | document-store.js:494 | 순차 실행, 병렬 아님 | PostgreSQL concurrent transactions |
| **Array union 중복** | document-store.js:127-138 | JSON.stringify 기반, 순서 민감 | sort 후 비교 |

### 🟢 낮음 (장기 개선)

| 항목 | 설명 |
|------|------|
| **Rate limiting** | ai-helper 등 고비용 함수에 보호 없음 |
| **테스트 커버리지** | smoke-firestore-api.js만, E2E 없음 |
| **인덱스 명시** | where/orderBy에 자동 인덱스 사용 |

---

## 5. 향후 개선 후보

### 단기 (1-2주)

1. **onSnapshot 최적화**
   - 변경 있을 때만 콜백 (현재 구조 유지)
   - Last-Modified / ETag 헤더로 네트워크 절약
   - 참고: `firebase-firestore-compat.js:348-354`

2. **AUTH 판정 단일화**
   - ADMIN_EMAILS env를 Netlify에 설정
   - 클라이언트 하드코딩 제거 또는 UI 표시용으로만
   - 참고: `auth.js:8`, `_lib/firestore-api.js:13-23`

3. **Public 쓰기 제한**
   - viewCount/shareCount 쓰기 시 rate limiting
   - 참고: `firestore-api.js:167-169`

### 중기 (1-2개월)

1. **실시간 동기화 개선**
   - Polling → WebSocket 또는 Server-Sent Events
   - 단, Neon free tier에서의 연결 수 제한 확인 필요

2. **Query 성능**
   - WHERE + ORDER BY 조합에复合 인덱스 추가
   - 커서 기반 페이지네이션 구현

3. **테스트 체계**
   - Playwright E2E 테스트 추가
   - Compat 레이어 단위 테스트

### 장기 (2-3개월)

1. **Rate limiting**
   - Netlify functions-level rate limiting
   - 또는 API Gateway層에서 구현

2. **Audit logging**
   - Admin actions 로깅
   - community_moderation_logs 활용

3. **Migration tooling**
   - Firestore → Postgres 마이그레이션 스크립트
   - Rollback plan

---

## 6. 건드리면 위험한 부분

### ❌ 지금 건드리면 안 되는 부분

1. **document-store.js TABLE_CONFIG** (`_lib/document-store.js:7-106`)
   - 컬렉션 경로 매핑이 하드코딩됨
   - 한 글자라도 잘못되면 전체 조회 실패

2. **resolveCollectionPath / resolveDocumentPath** (`document-store.js:207-274`)
   - 경로 파싱 로직,任何一个 오타면 400 에러

3. **applyTransform** (`document-store.js:121-145`)
   - Firestore FieldValue transform 처리
   - 잘못되면 데이터 손실

4. **assertAuthorized** (`_lib/firestore-api.js:135-228`)
   - 권한 판정 로직, 잘못되면 security hole

5. **firebase-firestore-compat.js의 onSnapshot** (`compat.js:340-367`)
   - Polling 구조, 변경하면 실시간 기능 전체 동작 안 함

### ✅ 개선 가능한 부분

1. **onSnapshot interval** - 4초 → 설정 가능하거나 adaptive
2. **queryCollection buildWhereClause** - array-contains 다중 지원
3. **getUserRole caching** - 매번 DB 조회 대신 memory cache
4. **runTransaction 병렬화** - 현재 순차 → 병렬 (Postgres 권한 필요)

---

## 7. Smoke Test 검증

```bash
# queryCollection
curl -s -X POST https://lovetree.limone.dev/.netlify/functions/firestore-api \
  -H "Content-Type: application/json" \
  -d '{"op":"queryCollection","path":"trees","constraints":{"limit":1}}'

# getDoc
curl -s -X POST https://lovetree.limone.dev/.netlify/functions/firestore-api \
  -H "Content-Type: application/json" \
  -d '{"op":"getDoc","path":"trees/nonexistent-doc"}'

# bogus token → 401
curl -s -X POST https://lovetree.limone.dev/.netlify/functions/firestore-api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer bogus" \
  -d '{"op":"queryCollection","path":"trees","constraints":{"limit":1}}'
```

모든 테스트가 통과하면 Compat 레이어 정상 동작 중입니다.

---

## 8. 참고 문서

- [README.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/README.md) - 프로젝트 전체 개요, 아키텍처 다이어그램
- [docs/ops/OPERATIONS.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/ops/OPERATIONS.md) - 환경 변수/배포 검증, 데이터 흐름 상세 설명
- [docs/ops/RUNBOOK.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/ops/RUNBOOK.md) - 배포 런북, 아키텍처 주의사항
- `scripts/smoke-firestore-api.js` - 함수 smoke 테스트

---

### ⚠️ 신규 기여자 필독 요약

**"Firestore처럼 보이지만 실제론 Neon이다"**

이 프로젝트의 가장 큰 특징은 **클라이언트 코드는 Firestore API를 사용하는 것처럼 보이지만, 실제 데이터는 Neon PostgreSQL에 저장**된다는 점입니다.

| 컴포넌트 | 실제 역할 | 저장소 |
|----------|----------|--------|
| Firebase Auth | 로그인/세션 | Firebase (Auth만) |
| Firestore 호환 레이어 | API 어댑터 | - (중간 변환만) |
| Netlify Functions | API 게이트웨이, 권한 검증 | - |
| **Neon/PostgreSQL** | **실제 앱 데이터 저장** | **users, trees, posts 등** |

**왜 이런 구조?**
- 원래 Firestore 사용 → Neon으로 마이그레이션
- 프론트 코드 변경 최소화를 위해 호환 레이어 유지
- 새로운 기능 개발 시 Firestore API로 작성 → compat 레이어가 중재

**이 문서를 읽고 나면**
- 클라이언트의 `.collection().get()`이 실제로 어떻게 Postgres SQL로 변환되는지 이해
- 어떤 코드를 수정하면 compat 레이어가 깨지는지 파악
- 왜 `document-store.js`에서 SQL 쿼리를 봐야 하는지 인지
