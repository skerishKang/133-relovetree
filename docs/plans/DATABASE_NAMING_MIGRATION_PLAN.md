# Database Naming Migration Plan

> 목표: Firestore 스타일 이름에서 PostgreSQL 중심 이름으로 단계적 전환
> 작성일: 2026-04-09
> 상태: Phase A 진행 중

---

## 1. 현재 상황

### 문제 인식

```
클라이언트 코드                   실제 저장소
─────────────────────────────────────────────────
db.collection('trees').get()  →  Neon PostgreSQL
doc.set({...})                →  users, trees tables
firebase.firestore()          →  compat layer → Postgres
```

- **혼란 요소**: 코드가 Firestore처럼 보이지만 실제 데이터는 PostgreSQL에 저장됨
- **원인**: 원래 Firestore 사용 → PostgreSQL 마이그레이션 시 프론트 호환성 유지
- **영향**: 신규 기여자가 아키텍처를 오해하기 쉬움

### 현재 파일 구조

```text
src/
├── firebase-firestore-compat.js    # 클라이언트 compat layer (400줄)
├── firebase.js                     # Firebase 초기화
└── auth.js                         # 인증 (Firestore API 사용)

netlify/functions/
├── firestore-api.js                # Netlify Function 엔드포인트
├── _lib/
│   ├── firestore-api.js            # 권한/ops 라우팅 (305줄)
│   └── document-store.js           # Postgres CRUD (545줄)
└── ...
```

---

## 2. Migration 단계

### Phase A: Alias & Documentation (진행 중)

**목표**: 새 이름으로 시작할 수 있는 기반 마련

| 작업 | 상태 | 파일 |
|------|------|------|
| 문서화 | ✅ 완료 | README.md, OPERATIONS.md, RUNBOOK.md |
| Low-risk rename | ✅ 완료 | `saveUserToFirestore` → `syncUserToDatabase` |
| Client alias | ✅ 완료 | `src/postgres-client.js` 생성 |
| Server alias | ✅ 완료 | `netlify/functions/_lib/db-api.js` 생성 |
| Migration plan | 🔄 작성 중 | `docs/plans/DATABASE_NAMING_MIGRATION_PLAN.md` |

**변경 내용**:

```javascript
// src/postgres-client.js (새로 생성)
// Firestore compat layer를 re-export 하지만 이름은 PostgreSQL 중심
export { db as postgresDB } from './firebase-firestore-compat.js';

// netlify/functions/_lib/db-api.js (새로 생성)
// Server-side API alias with PostgreSQL naming
module.exports = {
  queryPostgresCollection: require('./firestore-api').queryCollection,
  getPostgresDoc: require('./firestore-api').getDoc,
  // ...
};
```

**위험도**: 🟢 낮음
- 기존 코드 변경 없음
- 새 파일만 추가
- 하위 호환성 100% 유지

---

### Phase B: New Code Path Adoption (예정)

**목표**: 새 코드부터는 명확한 이름 사용

| 대상 | 현재 | 목표 | 시점 |
|------|------|------|------|
| 신규 클라이언트 코드 | `firebase.firestore()` | `import { db } from './postgres-client.js'` | Phase B 시작 시 |
| 신규 서버 코드 | `require('./firestore-api')` | `require('./db-api')` | Phase B 시작 시 |
| 문서 예제 | Firestore 스타일 | PostgreSQL 중심 예제 | Phase B 중 |

**새 코드 패턴**:

```javascript
// Before (Phase A까지)
import { db } from './firebase-firestore-compat.js';
const trees = await db.collection('trees').get();

// After (Phase B부터)
import { postgresDB as db } from './postgres-client.js';
const trees = await db.collection('trees').get(); // 동일 API, 명확한 의미
```

**위험도**: 🟡 중간
- 새 코드만 변경
- 기존 코드 영향 없음
- 혼란 방지를 위한 문서 업데이트 필요

**테스트 포인트**:
- [ ] 신규 import 경로 정상 동작
- [ ] 기존 import 경로 계속 동작
- [ ] 번들 크기 변화 없음
- [ ] IDE autocomplete 정상

---

### Phase C: Gradual Old Path Updates (예정)

**목표**: 기존 코드를 단계적으로 새 이름으로 전환

**우선순위 (위험도 낮은 것부터)**:

| 순위 | 대상 | 이유 | 예상 작업량 |
|------|------|------|------------|
| 1 | 내부 헬퍼 함수 | 참조가 적음 | 1-2시간 |
| 2 | 신규 모듈 | 영향 범위 작음 | 2-3시간 |
| 3 | 핵심 모듈 (auth.js 등) | 참조가 많음 | 반나절+ |
| 4 | 전역 객체 | 가장 위험 | 하루+ |

**진행 방식**:
1. 파일 단위로 PR 생성
2. 각 PR마다 smoke test 필수
3. 문제 발생 시 즉시 rollback

**위험도**: 🟡 중간 ~ 🟠 높음
- 기존 코드 변경
- regression 가능성
- 꼼꼼한 테스트 필요

**테스트 포인트**:
- [ ] 변경된 파일 smoke test
- [ ] 전체 앱 E2E test
- [ ] 권한/인증 flow 확인
- [ ] 데이터 CRUD 확인

---

### Phase D: Final Removal (미래)

**목표**: Firestore 스타일 이름 완전 제거

**제거 대상**:

| 대상 | 현재 상태 | 제거 조건 |
|------|----------|----------|
| `firebase.firestore` 전역 | 활성 사용 | Phase C 100% 완료 후 |
| `src/firebase-firestore-compat.js` | 활성 사용 | 모든 클라이언트 코드 이관 후 |
| `netlify/functions/firestore-api.js` | 활성 사용 | 모든 서버 코드 이관 후 |
| `/api/firestore` endpoint | 활성 사용 | 클라이언트 대응 후 |

**위험도**: 🔴 높음
- breaking change
- production 영향
- 신중한 계획 필요

**테스트 포인트**:
- [ ] 모든 API endpoint 응답 확인
- [ ] 클라이언트-서버 통합 test
- [ ] production 배포 전 staging 검증
- [ ] rollback plan 준비

---

## 3. 단계별 체크리스트

### Phase A 완료 기준

- [x] README.md 아키텍처 설명 추가
- [x] OPERATIONS.md 데이터 흐름 다이어그램 추가
- [x] RUNBOOK.md 신규 기여자 주의사항 추가
- [x] Low-risk rename (`saveUserToFirestore` → `syncUserToDatabase`)
- [x] Client alias (`src/postgres-client.js`)
- [x] Server alias (`netlify/functions/_lib/db-api.js`)
- [x] Migration plan 문서 작성 (본 문서)

### Phase B 시작 조건

- [ ] Phase A 모든 항목 완료
- [ ] 팀 내 alias 사용 방식 공유
- [ ] 코드 리뷰 가이드 업데이트
- [ ] 신규 기능 개발 시 alias 사용 규칙 확정

### Phase C 시작 조건

- [ ] Phase B 3개월 이상 운영
- [ ] alias 사용 패턴 안정화
- [ ] regression 테스트 체계 구축
- [ ] 롤백/대응 계획 수립

### Phase D 시작 조건

- [ ] Phase C 100% 완료
- [ ] 모든 코드가 새 이름 사용
- [ ] 호환성 레이어 사용량 0% 확인
- [ ] stakeholder 승인

---

## 4. Alias 파일 사용법

### 클라이언트 (신규 코드)

```javascript
// 권장: postgres-client.js import
import { postgresDB, collection, doc, getDoc } from './postgres-client.js';

// 또는 기존 방식 유지 (하위 호환)
import { db } from './firebase-firestore-compat.js';
```

### 서버 (신규 코드)

```javascript
// 권장: db-api.js require
const { queryPostgresCollection, getPostgresDoc } = require('./db-api');

// 또는 기존 방식 유지 (하위 호환)
const { queryCollection, getDoc } = require('./firestore-api');
```

---

## 5. Risk Assessment

### 현재 위험 수준

| 항목 | Phase A | Phase B | Phase C | Phase D |
|------|---------|---------|---------|---------|
| `firebase.firestore` 전역 | 🟢 안전 | 🟢 안전 | 🟡 주의 | 🔴 위험 |
| `/api/firestore` endpoint | 🟢 안전 | 🟢 안전 | 🟡 주의 | 🔴 위험 |
| `firebase-firestore-compat.js` | 🟢 안전 | 🟡 주의 | 🟠 위험 | 🔴 위험 |
| `firestore-api.js` (server) | 🟢 안전 | 🟡 주의 | 🟠 위험 | 🔴 위험 |
| 내부 함수 이름 | 🟢 안전 | 🟢 안전 | 🟡 주의 | 🟡 주의 |

### 완화책

- **Alias 파일**: 단일 source of truth 유지
- **Re-export 패턴**: 실제 구현 변경 없음
- **단계적 전환**: 한 번에 많은 변경 방지
- **문서화**: 명확한 사용 가이드 제공
- **테스트**: 각 phase별 테스트 체계

---

## 6. 참고 문서

- [README.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/README.md) - 프로젝트 개요 및 아키텍처
- [docs/ops/OPERATIONS.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/ops/OPERATIONS.md) - 운영 환경 데이터 흐름
- [docs/ops/RUNBOOK.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/ops/RUNBOOK.md) - 배포 및 신규 기여자 가이드
- [docs/analysis/FIRESTORE_COMPAT_ANALYSIS.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/analysis/FIRESTORE_COMPAT_ANALYSIS.md) - Compat layer 상세 분석
- [src/postgres-client.js](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/src/postgres-client.js) - 클라이언트 alias
- [netlify/functions/_lib/db-api.js](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/netlify/functions/_lib/db-api.js) - 서버 alias

---

## 7. 다음 작업

1. **Phase A 마무리**: 본 문서 검토 및 승인
2. **Phase B 준비**: 팀 내 alias 사용 방식 공유
3. **Phase B 진행**: 신규 기능에 alias 적용 시작
4. **진행 상황 추적**: 본 문서에 Phase B/C/D 진행 상황 기록

---

*마지막 업데이트: 2026-04-09*
*다음 검토 예정: Phase B 시작 시*
