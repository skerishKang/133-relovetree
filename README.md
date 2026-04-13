# Lovetree - 나의 덕질 기록

> K-pop 팬을 위한 타임라인 기록 앱

## 제품 정체성 먼저 보기

이 저장소에서 기능/화면/디자인 작업을 시작하기 전에 아래 문서를 먼저 보는 것을 권장합니다.

- 제품 기준 문서: [docs/product/PRODUCT_IDENTITY.md](docs/product/PRODUCT_IDENTITY.md)
- MVP 범위: [docs/product/MVP_SCOPE.md](docs/product/MVP_SCOPE.md)
- 핵심 사용자 흐름: [docs/product/USER_FLOW.md](docs/product/USER_FLOW.md)
- 데이터 명칭 규칙: [docs/product/DATA_NAMING_RULE.md](docs/product/DATA_NAMING_RULE.md)
- 작업자 규칙: [AGENTS.md](AGENTS.md)

핵심 문장:

> Lovetree는 처음 사랑에 빠진 순간부터 팬이 되어가는 경로를 영상과 메모로 연결해 남기는 팬 감정 러브트리다.

## 프로젝트 개요

- **운영 URL**: https://lovetree.limone.dev
- **정적 프론트엔드**: plain HTML + plain CSS + 브라우저 JS
- **백엔드**: Netlify Functions
- **테스트**: Playwright smoke / production QA

### 아키텍처 개요 (중요)

```
클라이언트                    Netlify Functions              저장소
┌──────────────┐             ┌──────────────────┐          ┌──────────────┐
│ Firebase Auth│ ─────────── │ firestore-api.js │ ──────── │ Neon/Postgres│
│ (로그인/세션)│   ID Token  │ (Postgres API)   │   SQL    │ (실제 데이터)│
└──────────────┘             └──────────────────┘          └──────────────┘
       │                              │
       ▼                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ PostgreSQL 클라이언트 (postgres-client-browser.js)                             │
│ - 브라우저는 이 파일을 로드하여 window.postgresDB 사용                          │
│ - 실제 데이터는 Netlify Functions → Postgres 로 전달됨                    │
└──────────────────────────────────────────────────────────────────────────┘
```

| 구성| 파일 | 검증 대상 | 통과 기준 | 역할 구분 |
|------|-----------|-----------|-----------|-----------|
| `smoke.spec.js` | **표준 페이지 UI 존재 확인** | 모든 CSS 선택자가 실제 HTML과 일치 | E2E/UI Presence |
| `architecture-v2.spec.js` | **아키텍처/보안 검증** | app-loaded 플래그 + auth 중복 방지 + 에러 마스킹 | System Guard |
| `editor-smoke.spec.js` | **에디터 쉘 무결성** | 초기화 + 읽기전용 배지 + 상단 내비게이션 | Editor Shell Integrity |
| `editor-fieldvalue.spec.js` | **FieldValue Shim 변환** | 소스 패턴(Layer A) + 네트워크 Payload(Layer B) | Data Consistency Shim |

**Neon PostgreSQL**에 저장됩니다. 실제 API 엔드포인트는 `/api/firestore`입니다.

### 데이터 저장소 정책 (중요)

> **Firebase Firestore는 데이터 저장소로 사용하지 않습니다.** (Firebase Auth는 로그인에 사용)

#### editor-fieldvalue.spec.js 검증 레이어 (Data Integrity)

| 레이어 | 검증 방식 | 검증 내용 | 목적 |
|--------|-----------|-----------|------|
| **Layer A: 소스 패턴** | Static Check (fetch) | `FieldValue.increment` 등의 호출이 소스에 있는지 확인 | 의도치 않은 코드 제거 방지 |
| **Layer B: 런타임 Payload** | Network Intercept | `__firestoreTransform` 객체가 포함된 POST 요청 캡처 | Shim 변환 및 소켓 무결성 보장 |

**왜 "Firestore"라는 이름이 코드에 남아 있는가?**

1. 기존 클라이언트 코드가 Firestore 스타일 API (`collection().get()`, `doc().set()` 등)를 사용함
2. `src/firebase-firestore-compat.js` shim이 이 API를 PostgreSQL로 라우팅함
3. `window.firebase.firestore()`는 shim을 실행하므로 작동함 (실제 Firestore가 아님)
4. `/api/firestore` 엔드포인트도 하위 호환을 위해 유지

```javascript
// ✅ 권장: postgres-client-browser.js 로드 후 window.postgresDB 사용
const db = window.postgresDB;
const snapshot = await db.collection('trees').where('isPublic', '==', true).get();

// ✅ 작동함: firebase.firestore()를 shim이 가로채어 PostgreSQL로 연결
//    단, 신규 코드에서는 이 방식을 쓰지 마세요
const db = window.firebase.firestore(); // shim이 가로채어 라우팅 (legacy)

// ❌ 금지: firebase-firestore-compat.js 직접 참조
// <script src="/src/firebase-firestore-compat.js"></script>

// ❌ 금지: firebase.firestore.FieldValue 직접 호출 (에디터 기존 코드만 허용)
firebase.firestore.FieldValue.increment(1);
```

- ✅ `src/postgres-client-browser.js` 로드 후 `window.postgresDB` 사용
- ⚠️ 레거시: `firebase.firestore()`는 shim이 가로채어 PostgreSQL로 연결 (작동은 함, 신규 코드에서 사용 금지)
- ❌ `src/firebase-firestore-compat.js` 직접 참조 금지
- ❌ 신규 코드에서 함수명/주석에 "Firestore" 추가 금지

**서버 측 (Netlify Functions)**:

```javascript
// ✅ 권장: db-api.js를 공식 진입점으로 사용
const { queryPostgresCollection, getPostgresDoc } = require('./_lib/db-api');

// ❌ 금지: firestore-api.js 직접 참조
const { queryCollection, getDoc } = require('./_lib/firestore-api'); // 내부 구현
```

### 5 Rules for New Developers

1. **"Firestore"라는 이름을 믿지 마세요**: 이 저장소에서 "Firestore"는 "Firestore API를 쓰는 PostgreSQL"이라| 환경 | 공식 진입점 | 사용법 (Simple Rule) |
|------|------------|-----------------------|
| 브라우저 | `src/postgres-client-browser.js` | `window.postgresDB` 사용 |
| 서버 | `netlify/functions/_lib/db-api.js` | `db-api.js` 내부 함수 사용 |

3. **Legacy shim을 직접 참조하지 마세요**: `firebase-firestore-compat.js`와 `firestore-api.js`는 내부 구현입니다.
4. **새 코드에 "Firestore"라는 단어를 추가하지 마세요**: `DATA_NAMING_RULE.md`를 따르세요.
5. **코딩 전에 확인하세요**: `docs/product/`와 `docs/ops/` 문서를 먼저 읽으세요.

### 왜 rename하지 않고 문서화로 해결하는가

이 저장소에서 "Firestore"라는 이름을 그대로 두는 이유는 **기존 코드 보호**입니다.

1. `editor.html`만 37개 스크립트가 Firestore 스타일 API에 의존
2. `/api/firestore` 엔드포인트는 하위 호환을 위해 유지해야 함
3. 전역 rename 시 기존 코드 전체가 깨지며, 기능 구현이 정체됨
4. 문서화 + alias 진입점(`postgres-client-browser.js`, `db-api.js`)으로 신규 코드는 안전하게 분리 가능
5. 기능 안정화 이후 점진적 마이그레이션 계획: `docs/plans/DATABASE_NAMING_MIGRATION_PLAN.md`

## 프로젝트 구조

```text
133-relovetree/
├── index.html              # 메인 랜딩 페이지 (V2)
├── netlify.toml            # 라우팅 및 리다이렉트 설정
├── package.json
├── archive/                # 보관된 레거시 및 프로토타입
│   ├── recovered-legacy/   # 복구된 레거시 소스 및 리소스
│   ├── old-ui/             # 이전 UI 컨셉 (삭제 예정 후보)
│   ├── prototype/          # 초기 개발 프로토타입
│   └── reference-only/     # 기술 문서 및 참고용 데이터
├── assets/                 # 공통 자산 (favicon, 이미지, admin 전용 CSS)
│   └── css/                # 운영용 전용 스타일 (admin.css 등)
├── docs/                   # 프로젝트 문서
│   ├── product/            # 제품 철학 및 기획 문서
│   └── ops/                # 운영 기준 및 체크리스트
├── netlify/                # Netlify Functions (Serverless API)
│   └── functions/          # PostgreSQL 연동 API (_lib 내부에 핵심 로직 위치)
├── pages/                  # 표준 HTML 페이지
│   ├── lovetree.html       # 제품 소개 (랜딩)
│   ├── community.html      # 탐색 광장
│   ├── my-trees.html       # 마이 트리 대시보드
│   ├── editor.html         # 트리 에디터 (핵심 도구)
│   └── mobile-add-*.html   # [Legacy] 모바일 추가 폼 (현재 /css/ 대신 /assets/css/ 사용 필요)
├── src/                    # 프론트엔드 JavaScript 소스
│   ├── entries/            # 페이지별 주요 진입점 스크립트
│   ├── postgres-client-browser.js # 핵심 DB 진입점
│   ├── shared.js           # 공통 비즈니스 로직
│   └── shared-layout.js    # GNB 및 레이아웃 관리
└── README.md
```

> [!IMPORTANT]
> **Editor 운영 주의사항**:
> - `editor.html`과 관련 파일들은 별도 정리 트랙으로 관리됩니다. (일반 페이지 리팩터링 대상에서 제외)
> - 아키텍처 및 위험 파일 가이드: [docs/ops/EDITOR_ARCHITECTURE.md](docs/ops/EDITOR_ARCHITECTURE.md)
> - **Shared 로직 수정 시** 반드시 `tests/editor-smoke.spec.js`를 실행하여 에디터 무결성을 확인해야 합니다.
> - **FieldValue 관련 코드 수정 시** `tests/editor-fieldvalue.spec.js`를 실행하여 shim 변환을 검증해야 합니다.
> - **PR 작성 시**: [docs/ops/PR_CHECKLIST.md](docs/ops/PR_CHECKLIST.md)를 참조하세요.

## 로컬 실행

### 요구사항

- Node.js 18+
- Python 3.7+ 또는 동등한 정적 서버

### 빠른 시작

1. 의존성 설치

```bash
npm install
```

2. 로컬 정적 서버 실행

```bash
npm run dev
# 또는
python -m http.server 3133
```

3. 브라우저 열기

```text
http://localhost:3133/index.html
```

### 현재 스크립트

```bash
npm run dev
npm run serve
npm run build
npm run test
```

### CSS 운영 방식
- 사용자에게 직접 제공되는 앱 스타일은 `assets/css/*.css`에 위치하며, 이 파일들을 직접 수정하여 디자인을 반영합니다. (루트 `css/` 폴더는 사용되지 않으며 아카이브로 이동되었습니다.)
- 일부 레거시 페이지(`mobile-add-*.html`)는 아직 `/css/` 경로를 참조하고 있으나, 최신 버전에서는 `/assets/css/`를 사용하도록 업데이트되었습니다.
- Tailwind/PostCSS 빌드 체인은 제거됐습니다.
- `npm run build`는 실질적인 CSS 컴파일을 하지 않습니다.

## 테스트

```bash
# 전체 연동 테스트
npm run test
npx playwright test --config ./config/playwright.config.js

# Editor 전용 Smoke Test (V1/V2 Shared 무결성 확인)
npx playwright test tests/editor-smoke.spec.js --config ./config/playwright.config.js
```

- Playwright smoke는 핵심 페이지 회귀 확인용입니다.
- **Editor Smoke**: 공통 script(`shared.js`) 변경이 에디터 쉘을 깨뜨리는지 집중 검증합니다.
- 최종 QA는 실도메인 `https://lovetree.limone.dev` 기준 수동 확인도 병행합니다.

## 운영 문서

- 운영 가이드: [docs/ops/OPERATIONS.md](docs/ops/OPERATIONS.md)
- 연결/배포/버전관리 런북: [docs/ops/RUNBOOK.md](docs/ops/RUNBOOK.md)
- 마이그레이션/분석 문서: `docs/migration`, `docs/analysis`

## 주의

- 결제는 `window.RELOVETREE_PAYMENT_CONFIG`가 실제로 주입될 때만 활성화됩니다.
<!-- Updated entrypoint guidance and ops baselines -->
- App Check는 `window.RELOVETREE_APP_CHECK_CONFIG.siteKey`가 실제로 주입될 때만 활성화됩니다.
- 서버 환경변수는 Netlify Dashboard의 Environment variables가 source of truth입니다.

