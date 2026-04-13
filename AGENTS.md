# AGENTS.md

## First Read

이 저장소에서 제품/화면/기능 작업을 시작하기 전에 반드시 아래 문서를 먼저 읽는다.

- [PRODUCT_IDENTITY.md](docs/product/PRODUCT_IDENTITY.md)
- [MVP_SCOPE.md](docs/product/MVP_SCOPE.md)
- [USER_FLOW.md](docs/product/USER_FLOW.md)
- [DATA_NAMING_RULE.md](docs/product/DATA_NAMING_RULE.md)
- **PR 작성 시**: [docs/ops/PR_CHECKLIST.md](docs/ops/PR_CHECKLIST.md) 참조

## Data Access Rules (신규 개발자 필독)

이 저장소에서 "Firestore"라는 이름이 코드에 남아 있지만, 실제 데이터는 **Neon/PostgreSQL**에 저장된다.
코드를 작성하기 전에 이 규칙을 먼저 읽는다.

### 뭘 쓰면 되는가 (공식 진입점)

| 환경 | 공식 진입점 | 사용법 |
|------|------------|--------|
| 브라우저 | `src/postgres-client-browser.js` | `<script src="/src/postgres-client-browser.js">` 후 `window.postgresDB` |
| 서버 | `netlify/functions/_lib/db-api.js` | `const { queryPostgresCollection, getPostgresDoc } = require('./db-api');` |

### 뭘 쓰면 안 되는가 (금지)

| 금지 항목 | 이유 |
|-----------|------|
| `src/firebase-firestore-compat.js` 직접 참조 | Legacy shim. `postgres-client-browser.js`가 내부적으로 로드함 |
| `netlify/functions/_lib/firestore-api.js` 직접 참조 | 내부 구현. `db-api.js`를 통해서만 접근 |
| 신규 코드에서 함수명/주석에 "Firestore" 추가 | Legacy shim과 구분 불가능해짐 |
| `firebase.firestore.FieldValue` 직접 호출 | Shim의 변환 객체. 에디터 기존 코드만 허용 |

### 왜 rename하지 않고 문서화로 해결하는가

1. 기존 클라이언트 코드가 Firestore 스타일 API에 의존 (editor.html만 37개 스크립트)
2. `/api/firestore` 엔드포인트는 하위 호환을 위해 유지해야 함
3. Rename하면 기존 코드 전체가 깨지며, 기능 구현이 정체됨
4. 문서화 + alias 진입점으로 신규 코드는 안전하게 분리 가능
5. 기능 안정화 이후 점진적 마이그레이션은 `docs/plans/DATABASE_NAMING_MIGRATION_PLAN.md` 참조

## Product Rule

Lovetree는 단순 저장 앱이 아니다.

- 첫 순간을 기록하는 제품이다.
- 감정을 메모로 남기는 제품이다.
- 순간들을 러브트리로 연결하는 제품이다.
- 완성된 러브트리를 공유하고 전파하는 제품이다.

새 기능, 새 화면, 새 문구는 이 기준에 맞아야 한다.

## Priority Order

아래 우선순위를 기준으로 판단한다.

1. 첫 순간을 쉽게 기록하게 만들기
2. 영상의 특정 시점과 감정 메모를 남기게 만들기
3. 순간들을 트리로 연결해 보여주기
4. 기록을 다시 보기 쉽게 만들기
5. 공유와 전파를 돕기

이 순서를 뒤집지 않는다.

## UX Rule

- 모바일은 빠른 기록과 쉬운 감상 우선
- 데스크톱은 연결 구조와 편집 우선
- 트리는 기술 플로우가 아니라 감정 흐름처럼 보여야 함
- 커뮤니티는 게시판이 아니라 러브트리 감상 공간이어야 함

## Implementation Rule

- 제품 방향이 헷갈리면 `docs/product/PRODUCT_IDENTITY.md`를 source of truth로 본다.
- 구현 범위가 헷갈리면 `docs/product/MVP_SCOPE.md`를 본다.
- 화면보다 흐름이 중요하면 `docs/product/USER_FLOW.md`를 본다.
- 데이터 명칭이 헷갈리면 `docs/product/DATA_NAMING_RULE.md`를 본다.
- README는 입구 문서다. 제품 판단 기준은 README보다 PRODUCT_IDENTITY가 우선이다.
- 신규 데이터 액세스 코드는 반드시 아래 파일을 진입점으로 사용한다.
  - 브라우저: `src/postgres-client-browser.js`
  - 서버(Netlify Functions): `netlify/functions/_lib/db-api.js`
- ⚠️ 신규 코드에서 `firebase-firestore-compat.js` 직접 참조 금지
- 새 페이지나 새 기능을 만들 때는 “이게 첫 순간 기록과 사랑의 경로 연결에 실제 도움이 되나”를 먼저 따진다.
- **editor 전용 아키텍처 및 안전 가이드**:
  - 작업을 시작하기 전 반드시 [docs/ops/EDITOR_ARCHITECTURE.md](docs/ops/EDITOR_ARCHITECTURE.md)를 숙독한다.
  - **editor 영역**은 복잡성과 의존성으로 인해 일반 페이지 구조 정리 트랙에서 **제외**되어 관리된다.
  - `shared.js`, `runtime-config.js` 등 공통(shared) 로직 수정 시, 반드시 `tests/editor-smoke.spec.js`를 실행하여 에디터 쉘의 무결성을 검증해야 한다.
  - **FieldValue 관련 코드** (increment, serverTimestamp 등) 수정 시 `tests/editor-fieldvalue.spec.js`를 실행하여 shim 변환을 검증해야 한다.
  - 다음 핵심 파일들은 에디터의 근간이므로 수정 시 극도로 주의한다:
    - `src/editor-bootstrap.js` (DB 할당)
    - `src/editor-data.js` (FieldValue 사용)
    - `src/editor-comments.js` (FieldValue 사용)
    - `src/editor-actions.js` (FieldValue 사용)
    - `src/editor-runtime.js` (DB 인터페이스)

## Data / Architecture Reminder

- Firebase Auth는 로그인/세션 전용
- 실제 앱 데이터는 Netlify Functions를 거쳐 Neon/Postgres에 저장
- Firestore 스타일 API 명칭은 호환 레이어일 뿐, 실제 저장소는 Postgres다
- ⚠️ 신규 코드에서 함수명/주석에 "Firestore" 추가 금지 (legacy shim과 구분)
- **데이터 진입점 가이드**:
  - 브라우저: `src/postgres-client-browser.js` -> `window.postgresDB`
  - 서버: `netlify/functions/_lib/db-api.js`
