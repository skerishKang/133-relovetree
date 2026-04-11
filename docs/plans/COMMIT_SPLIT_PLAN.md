# 커밋 분할 계획 문서 (COMMIT SPLIT PLAN)

## 1. 목적

현재 변경 사항을 의미 있는 단위로 분할하여 안전하게 커밋하기 위한 계획 문서다. Fossil snapshot과 Git 커밋의 역할을 구분하고, GitHub push 전 확인할 사항을 정리한다.

---

## 2. 현재 변경 범주 분류

### 2.1 현재 변경 파일 (Uncommitted)

```
 M netlify/functions/_lib/db-api.js    # 서버 주석 정리
 M src/auth.js                          # 클라이언트 주석 정리
 M src/flow-shared.js                  # Flow A 주석 정리
```

### 2.2 최근 커밋된 파일들 (참고)

| 커밋 | 범주 | 설명 |
|------|------|------|
| d9efcc8 | 제품/문서 | Flow A QA, 구현 맵, 데이터 레이어 명칭 |
| d9e1ade | 시안 | frontend-concept-v2 업데이트 |

---

## 3. 권장 커밋 묶음

### 3.1 Commit 1: 데이터 레이어 주석 정리

**범주:** naming cleanup  
**시점:** 가장 먼저 (즉시 가능)

**포함 파일:**
- `src/auth.js` - Firestore → Postgres compat layer 주석 변경
- `src/flow-shared.js` - 주석 정리
- `netlify/functions/_lib/db-api.js` - 서버 주석 보강

**커밋 메시지 초안:**
```
refactor: update data layer comments to reflect Postgres naming

- auth.js: clarify Firestore is auth-only, data goes to Postgres
- flow-shared.js: update getDb() comment to reference official entry point
- db-api.js: clarify shim relationship and data flow
```

---

### 3.2 Commit 2: 제품 문서 (이미 커밋됨)

**범주:** 제품/문서  
**시점:** 이미 완료됨 (d9efcc8)

**포함 파일:**
- `docs/product/DATA_MODEL_DRAFT.md`
- `docs/product/FRONTEND_BASELINE.md`
- `docs/ops/FLOW_A_QA_CHECKLIST.md`
- `docs/plans/NEXT_BUILD_QUEUE.md`
- `docs/plans/FLOW_A_IMPLEMENTATION_MAP.md`
- `docs/product/DATA_NAMING_RULE.md`
- `docs/product/PRODUCT_IDENTITY.md`
- `docs/product/MVP_SCOPE.md`
- `docs/product/USER_FLOW.md`

---

### 3.3 Commit 3: Flow A 구현 파일 (이미 커밋됨)

**범주:** Flow A 구현  
**시점:** 이미 완료됨 (d9efcc8)

**포함 파일:**
- `src/flow-shared.js`
- `src/my-trees.js`
- `src/mobile-add-memory.js`
- `src/mobile-add-branch.js`
- `src/mobile-tree.js`
- `src/memory-detail.js`
- `src/postgres-client-browser.js`
- `pages/my-trees.html`
- `pages/mobile-add-memory.html`
- `pages/mobile-add-branch.html`
- `pages/mobile-tree.html`
- `pages/memory-detail.html`

---

### 3.4 Commit 4: 페이지 로더 마이그레이션 (이미 커밋됨)

**범주:** naming cleanup  
**시점:** 이미 완료됨 (d9efcc8)

**포함 파일:**
- `pages/community.html`
- `pages/owner.html`
- `pages/editor.html`
- `pages/admin.html`
- `pages/login.html`
- `index.html`

**변경:** `firebase-firestore-compat.js` → `postgres-client-browser.js`

---

### 3.5 Commit 5: 시안 업데이트 (이미 커밋됨)

**범주:** frontend-concept-v2 시안  
**시점:** 이미 완료됨 (d9e1ade)

**포함 파일:**
- `frontend-concept-v2/css/app.css`
- `frontend-concept-v2/css/editor-desktop.css`
- `frontend-concept-v2/css/home.css`
- `frontend-concept-v2/css/mobile-tree.css`
- `frontend-concept-v2/editor-desktop.html`
- `frontend-concept-v2/home.html`
- `frontend-concept-v2/mobile-tree.html`

---

## 4. Fossil snapshot 시점

### 4.1 언제 먼저 찍어야 하는가?

Fossil snapshot은 **Git 커밋 전**에 찍어야 한다. 이유는:

1. Fossil은 모든 파일을 포함 (Git에 뺀 파일도 포함)
2. 로컬 복구 지점을 먼저 확보
3. 그 다음 Git 커밋으로 공유할 것만 선별

### 4.2 현재 상황에서 Fossil snapshot

```bash
# Fossil snapshot (현재 변경 파일 포함)
fossil addremove
fossil commit -m "local snapshot: data layer comment updates"
```

### 4.3 Fossil → Git 순서

```
1. Fossil snapshot (모든 변경 포함)
2. Git commit (공유할 것만 선별)
3. Git push (GitHub에 공개)
```

---

## 5. GitHub push 전에 확인할 것

### 5.1 필수 확인

| 확인 항목 | 체크 방법 |
|----------|----------|
| 커밋 메시지 명확성 | `git log --oneline -3` |
| 변경 파일 정확도 | `git status --short` |
| 비밀 정보 누출 | `.env`, `.secrets` 확인 |
| 테스트 산출물 | `test-results/`, `tmp/` 확인 |

### 5.2 선택 확인

| 확인 항목 | 체크 방법 |
|----------|----------|
| Fossil snapshot 먼저 | Fossil에 모든 변경이 있는지 확인 |
| 원치 않는 파일 | `*.png`, `*.log`, `tmp-*.js` |

---

## 6. 지금 커밋에 넣지 않는 게 좋은 파일/산출물

### 6.1 스크린샷/이미지

| 파일 유형 | 이유 |
|----------|------|
| `screenshot-*.png` | 산출물, 버전 관리 불필요 |
| `tmp/*.png` | 임시 파일 |
| `*.png` (루트) | 스크린샷 |

### 6.2 테스트 결과

| 파일 유형 | 이유 |
|----------|------|
| `test-results/` | 테스트 산출물, CI에서 생성 |
| `full-test.png` | 큰 이미지 파일 |

### 6.3 임시 파일

| 파일 유형 | 이유 |
|----------|------|
| `tmp-*.js` | 작업 중 임시 파일 |
| `nul` | Windows 임시 파일 |

### 6.4 빌드 산출물

| 파일 유형 | 이유 |
|----------|------|
| `node_modules/` | 이미 .gitignore에 있을 것 |
| `.netlify/` | 빌드 산출물 |

---

## 7. 최종 권장 커밋 순서

| 순서 | 커밋 이름 | 포함 파일 | 상태 |
|------|----------|----------|------|
| 1 | 제품 문서 | docs/product/*, docs/ops/*, docs/plans/* | ✅ 완료 (d9efcc8) |
| 2 | Flow A 구현 | pages/mobile-*.html, src/mobile*.js | ✅ 완료 (d9efcc8) |
| 3 | 페이지 로더 마이그레이션 | pages/*.html, index.html | ✅ 완료 (d9efcc8) |
| 4 | 시안 업데이트 | frontend-concept-v2/* | ✅ 완료 (d9e1ade) |
| 5 | 데이터 레이어 주석 | src/auth.js, src/flow-shared.js, netlify/.../db-api.js | ⏳ 대기 (현재 변경) |

---

## 8. 현재 상태 요약

| 구분 | 상태 |
|------|------|
| 커밋 대기 | 3개 파일 (주석 정리) |
| Fossil snapshot | ❌ 안 함 |
| 다음 작업 | Fossil snapshot → Git commit → push |

---

**참조:**
- `docs/plans/VCS_COMMIT_PUSH_WORKFLOW.md` - VCS 작업 흐름
- `docs/product/PRODUCT_IDENTITY.md` - 제품 정체성