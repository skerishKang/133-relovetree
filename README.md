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

| 구성 요소 | 용도 | 실제 저장소 / 진입점 |
|-----------|------|-------------|
| **Firebase Auth** | 로그인/세션 관리 | Firebase (Auth만) |
| **PostgreSQL 클라이언트** | 브라우저 데이터 접근 | `postgres-client-browser.js` |
| **Netlify Functions** | API 엔드포인트 | `/api/firestore` → `firestore-api.js` |
| **Neon/PostgreSQL** | 실제 앱 데이터 저장 | ✅ `trees`, `users`, `posts` 등 |

**핵심**: 브라우저는 `postgres-client-browser.js`를 로드하여 `window.postgresDB`를 사용합니다. 모든 데이터는 **Neon PostgreSQL**에 저장됩니다. 실제 API 엔드포인트는 `/api/firestore`입니다.

### 데이터 저장소 정책 (중요)

> **Firebase Firestore는 데이터 저장소로 사용하지 않습니다.** (Firebase Auth는 로그인에 사용)

| 서비스 | 용도 | 실제 저장소 |
|--------|------|-----------|
| **Firebase Auth** | 로그인/세션 관리 | ✅ 사용 (Firebase) |
| **Firebase Firestore** | 데이터 저장 | ❌ 사용 안 함 (레거시 shim이 대체) |
| **Neon/PostgreSQL** | 앱 데이터 저장 | ✅ 사용 (실제 데이터) |

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
const db = firebase.firestore(); // shim을 통과하므로 작동

// ❌ 주의: firebase.firestore.FieldValue는 shim의 구현임
//         실제 Firestore SDK가 아님
```

- ✅ `src/postgres-client-browser.js` 로드 후 `window.postgresDB` 사용
- ⚠️ 레거시: `firebase.firestore()`는 shim이 가로채어 PostgreSQL로 연결 (작동은 함)
- ❌ 함수명/주석에 "Firestore" 추가 금지

## 프로젝트 구조

```text
133-relovetree/
├── index.html              # 랜딩 페이지 (V2)
├── netlify.toml            # 라우팅 및 리다이렉트 설정
├── package.json
├── css/                    # 페이지별 주요 CSS (home, comm, my-trees 등)
├── assets/                 # 공통 자산 (favicon, 에디터 전용 CSS 등)
├── pages/                  # 실제 HTML 소스 파일들
│   ├── lovetree.html       # 제품 소개
│   ├── community.html      # 탐색 광장
│   ├── login.html          # 인증
│   ├── my-trees.html       # 대시보드
│   └── editor.html         # 트리 에디터 (예외 관리 영역)
├── src/                    # 비즈니스 로직 및 라이브러리
│   ├── entries/            # 페이지별 진입점 스크립트
│   ├── shared-layout.js    # 공통 레이어 (GNB, Auth UI)
│   ├── postgres-client-browser.js  # 브라우저용 (<script> 로드, window.postgresDB)
│   ├── postgres-client.js  # ES 모듈용 (import 문법, 빌드 환경)
│   └── ...
├── netlify/
│   └── functions/          # 서버리스 API (PostgreSQL 연동)
└── README.md
```

**주의**: `editor.html`과 관련 파일들은 복잡성과 의존성으로 인해 별도 정리 트랙으로 관리됩니다. 일반 페이지 구조 정리 시 editor 영역은 제외됩니다.

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

- 앱은 `assets/css/*.css`를 직접 사용합니다.
- Tailwind/PostCSS 빌드 체인은 제거됐습니다.
- `npm run build`는 실질적인 CSS 컴파일을 하지 않습니다.

## 테스트

```bash
npm run test
npx playwright test --config ./config/playwright.config.js
```

- Playwright smoke는 핵심 페이지 회귀 확인용입니다.
- 최종 QA는 실도메인 `https://lovetree.limone.dev` 기준 수동 확인도 병행합니다.

## 운영 문서

- 운영 가이드: [docs/ops/OPERATIONS.md](docs/ops/OPERATIONS.md)
- 연결/배포/버전관리 런북: [docs/ops/RUNBOOK.md](docs/ops/RUNBOOK.md)
- 마이그레이션/분석 문서: `docs/migration`, `docs/analysis`

## 주의

- 결제는 `window.RELOVETREE_PAYMENT_CONFIG`가 실제로 주입될 때만 활성화됩니다.
- App Check는 `window.RELOVETREE_APP_CHECK_CONFIG.siteKey`가 실제로 주입될 때만 활성화됩니다.
- 서버 환경변수는 Netlify Dashboard의 Environment variables가 source of truth입니다.

