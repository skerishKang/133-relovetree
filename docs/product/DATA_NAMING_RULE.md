# Lovetree Data Naming Rule

## Purpose

이 문서는 Lovetree에서 왜 `Firestore`라는 이름이 남아 있는데 실제 저장소는 `Neon/Postgres`인지, 그리고 앞으로 신규 작업에서 어떤 이름을 써야 하는지를 고정하기 위한 규칙 문서다.

지금 단계의 목표는 실제 파일명을 한 번에 다 바꾸는 것이 아니라, 신규 작업이 더 이상 잘못된 이름을 기준으로 자라지 않게 막는 것이다.

## One-line Rule

로그인은 Firebase, 앱 데이터는 Neon/Postgres.

`Firestore`라는 이름은 일부 레거시 호환 레이어에만 남아 있을 뿐, 실제 앱 데이터 저장소를 의미하지 않는다.

## Current Reality

### Auth

- `src/auth.js`
- Firebase Auth 사용
- 로그인, 세션, ID 토큰, `onAuthStateChanged` 담당

### App Data

- 실제 저장소: Neon/Postgres
- 서버 경유: Netlify Functions
- 클라이언트 데이터 접근: Firestore 스타일 compat layer를 거쳐 Postgres로 전달

즉 아래처럼 이해하면 된다.

```text
Firebase Auth         -> 로그인/세션
Netlify Functions     -> 권한 검증 + API 게이트웨이
Neon/Postgres         -> 실제 앱 데이터 저장소
```

## Why This Is Confusing

아래 이름들이 혼동을 만든다.

- `firebase-firestore-compat.js`
- `firestore-api.js`
- `/api/firestore`
- `firebase.firestore()` 스타일 호출

이 이름들은 역사적 호환성 때문에 남아 있는 레거시 명칭이다.

## Official Naming From Now On

신규 코드와 신규 문서에서는 아래 이름을 공식 기준으로 사용한다.

### Client

- 공식 이름: `postgres-client.js`
- 의미: 클라이언트의 앱 데이터 접근 진입점

### Server

- 공식 이름: `db-api.js`
- 의미: 서버의 앱 데이터 접근 진입점

### Forbidden for New Code

신규 코드에서는 아래 직접 참조를 금지한다.

- `firebase-firestore-compat.js`
- `firestore-api.js`

기존 코드는 레거시 호환을 위해 유지할 수 있지만, 새 코드의 진입점으로 도입하지 않는다.

## Concrete Rule

### New Client Code

신규 클라이언트 데이터 접근은 아래를 기준으로 쓴다.

```javascript
import { postgresDB as db } from './postgres-client.js';
```

또는 `postgres-client.js`가 제공하는 export를 그대로 사용한다.

### New Server Code

신규 서버 데이터 접근은 아래를 기준으로 쓴다.

```javascript
const { queryPostgresCollection, getPostgresDoc } = require('./db-api');
```

## What Not To Do

지금 당장 아래 작업은 하지 않는다.

- 전체 파일명을 한 번에 rename
- 기존 endpoint 경로 전체 변경
- 기존 `firebase.firestore()` 흔적을 한 번에 제거
- compat layer 삭제

이건 장기 마이그레이션 작업이다. 현재는 구현 안정성이 우선이다.

## What To Do Instead

지금은 아래 방식으로 진행한다.

1. 문서와 프롬프트에서 공식 용어를 통일한다
2. 신규 작업은 alias 경로만 사용한다
3. 기존 파일은 필요할 때만 점진적으로 교체한다
4. 기능 구현이 안정된 뒤 실제 rename을 진행한다

## Free Model Warning Block

외부 모델이나 무료 모델에게는 아래 문단을 그대로 붙여도 된다.

```text
주의:
firebase-firestore-compat.js와 firestore-api.js는 레거시 이름이다.
실제 앱 데이터 저장소는 Neon/Postgres다.
신규 코드는 postgres-client.js / db-api.js 기준으로 작성한다.
Firebase는 로그인/세션(Auth)에만 사용한다.
```

## Priority

이 문서의 우선순위는 아래와 같다.

1. `docs/product/PRODUCT_IDENTITY.md`
2. `docs/product/MVP_SCOPE.md`
3. `docs/product/USER_FLOW.md`
4. `docs/product/DATA_NAMING_RULE.md`

제품 방향이 먼저고, 데이터 명칭 규칙은 그 다음이다.

## Related Documents

- `docs/plans/DATABASE_NAMING_MIGRATION_PLAN.md`
- `docs/plans/DATABASE_NAMING_PHASE_B_EXECUTION_PLAN.md`
- `AGENTS.md`

위 문서들은 장기 계획과 작업 규칙을 다루고, 이 문서는 현재 작업자가 당장 헷갈리지 않도록 하는 실무 기준 문서다.
