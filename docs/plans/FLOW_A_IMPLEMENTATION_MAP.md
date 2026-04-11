# Flow A 구현 맵 (IMPLEMENTATION MAP)

## 1. 개요

이 문서는 Lovetree의 핵심 사용자 흐름인 Flow A가 현재 어떤 파일들로 구성돼 있는지 한눈에 정리합니다.

**Flow A 정의:**
```
영상 발견 → Lovetree로 가져옴 → 특정 시점 선택 → 감정 메모 남김 → 트리에 연결 → 다시 감상 → 공유
```

---

## 2. Flow A 단계별 파일 매핑

### 2.1 진입: 내 트리 목록

| 파일 | 책임 |
|------|------|
| `pages/my-trees.html` | 트리 목록 화면 |
| `src/my-trees.js` | 트리 로드/렌더링 로직 |
| `src/flow-shared.js` | `loadUserTrees()` 함수 |

**관련:** Firebase Auth (로그인 체크), postgresDB (트리 조회)

---

### 2.2 기록: 순간 추가

| 파일 | 책임 |
|------|------|
| `pages/mobile-add-memory.html` | 순간 추가 폼 화면 |
| `src/mobile-add-memory.js` | 폼 입력处理, 제출 로직 |
| `src/flow-shared.js` | `addMemoryToTree()` 함수 |

**주요 입력:**
- 영상 URL → `parseYouTubeId()` → videoId
- timestamp (예: "1:30")
- 감정 태그 (love, tear, happy, fan, shock, funny, nostalgia, pride)
- 메모 텍스트

**관련:** Firebase Auth (로그인 체크), postgresDB (트리 저장)

---

### 2.3 연결: 연결 위치 선택

| 파일 | 책임 |
|------|------|
| `pages/mobile-add-branch.html` | 부모 노드 선택 화면 |
| `src/mobile-add-branch.js` | 기존 노드 리스트 렌더링 |

**역할:** 새 순간을 기존 트리의 어느 노드 뒤에 연결할지 선택

---

### 2.4 보기: 모바일 트리 감상

| 파일 | 책임 |
|------|------|
| `pages/mobile-tree.html` | 트리 전체 보기 화면 |
| `src/mobile-tree.js` | BFS 순회로 노드 렌더링 |
| `src/flow-shared.js` | `getRootNode()`, `getChildrenOf()` 함수 |

**역할:** 저장된 순간들을 연결 순서로 표시, 노드 클릭 → 상세로 이동

---

### 2.5 상세: 순간 상세 보기

| 파일 | 책임 |
|------|------|
| `pages/memory-detail.html` | 개별 순간 상세 화면 |
| `src/memory-detail.js` | videoId로 YouTube embed, moments 표시, 연결 노드 렌더링 |

**역할:** 특정 순간의 영상, 감정 태그, 메모, 연결된 전후 순간 보기

---

## 3. 재사용 레이어 구조

### 3.1 Firebase Auth (공통)

```
src/auth.js
```

**역할:**
- 로그인/세션 관리
- `onAuthStateChanged`로 사용자 상태 감시
- `requireAuth()` 함수로 인증 필요 페이지 보호

**참조:** `src/flow-shared.js:55` (`requireAuth` 함수)

---

### 3.2 Postgres Compat Layer (공통)

```
src/postgres-client-browser.js  (브라우저용)
/src/postgres-client.js         (ES 모듈용)
src/firebase-firestore-compat.js (레거시 shim)
```

**역할:**
- 브라우저에서 `window.postgresDB` 제공
- Firestore 스타일 API (`collection`, `doc`, `get`, `set`) 제공
- 실제 요청은 `/api/firestore` → Netlify Functions → Neon/Postgres

**참조 경로:**
- `src/flow-shared.js:76` (`getDb()` → `window.postgresDB`)
- `src/editor-data.js` (에디터 데이터 로드/저장)

---

## 4. 데이터 흐름

```
사용자 입력 (mobile-add-memory.html)
    ↓
mobile-add-memory.js (폼 데이터 수집)
    ↓
flow-shared.js: addMemoryToTree()
    ↓
window.postgresDB (firebase.firestore() 인터페이스)
    ↓
POST /api/firestore (Netlify Functions)
    ↓
firestore-api.js → document-store.js
    ↓
Neon/PostgreSQL (실제 데이터 저장)
```

**역할 구분:**
| 계층 | 하는 일 |
|------|--------|
| UI层 | 폼 입력, 화면 렌더링 |
| 공유 유틸 | 데이터 가공 (flow-shared.js) |
| Compat Layer | Firestore API → HTTP 변환 |
| 서버 | 권한 검증, PostgreSQL 저장 |

---

## 5. 현재 제약 (Constraints)

### 5.1 timestamp 관련
- 입력 필드는 UI에 존재하나, 실제 저장 시 문자열로 저장
- memory-detail에서 seconds로 변환 필요 (예: "1:30" → 90)

### 5.2 노드 위치
- 새 노드 생성 시 x:400, y:300 하드코딩
- 에디터에서 사용자가 수동 이동 필요

### 5.3 moments 구조
- moments 배열과 description 필드 중복 존재
- 감정 태그는 `moments[0].feeling`에 저장

### 5.4 visibility
- 데이터 모델에 visibility 필드 정의돼 있으나, 실제 구현은 URL 기반 ( ownerId !== currentUserUid )

---

## 6. 다음 리팩토링 후보

### 6.1 높은 우선순위
|候选 | 이유 |
|------|------|
| timestamp seconds 변환 로직 통합 | memory-detail과 flow-shared 중복 |
| 노드 x/y 자동 계산 | 하드코딩 값 개선 |
| visibility 실제 구현 | URL 기반 임시 방식을正式的实现으로 |

### 6.2 중간 우선순위
|候选 | 이유 |
|------|------|
| moments/description 통합 | 데이터 중복 제거 |
| community-tree-detail 트리 뷰 | 제품 정체성 구현 |

### 6.3 낮은 우선순위
|候选 | 이유 |
|------|------|
| nodes/edges 별도 테이블分离 | 트리 커질 경우 성능 |
| likes/comments 컬렉션 분리 | 페이지네이션 지원 |

---

## 7. Postgres naming 주의 사항 (작업자 참고)

> **중요:** 코드에 `firebase.firestore()` 호출이 남아 있지만, 실제 데이터 저장소는 **Neon/Postgres**입니다.
> 
> **왜 이렇게 되었는가:**
> - 기존 클라이언트 코드는 Firestore API 스타일로 작성됨
> - `firebase-firestore-compat.js`가 HTTP 요청으로 변환
> - `/api/firestore` → Netlify Functions → PostgreSQL
> 
> **작업자가 알아야 할 것:**
> - `window.postgresDB`가 실제 DB 접근 포인트 (via compat layer)
> - `src/postgres-client.js` / `src/postgres-client-browser.js`가 공식 entry point
> - Firebase는 **인증(Auth)** 전용, 데이터 저장 아님
> - 문서/주석에서 "Firebase 데이터" 대신 "앱 데이터" 또는 "트라 데이터" 표현 사용
> 
> **참조:**
> - `docs/product/DATA_NAMING_RULE.md`
> - `src/postgres-client-browser.js` 주석

---

**참조 문서:**
- `docs/product/USER_FLOW.md` - Flow A 정의
- `docs/product/DATA_MODEL_DRAFT.md` - 데이터 모델
- `docs/ops/FLOW_A_QA_CHECKLIST.md` - QA 체크리스트