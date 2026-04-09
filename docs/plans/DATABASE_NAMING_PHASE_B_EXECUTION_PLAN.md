# Database Naming Migration: Phase B Execution Plan

> 목표: Firestore 스타일 이름에서 PostgreSQL 중심 이름으로 실제 적용
> 역할: Firestore legacy phase-B planner
> 적용 대상: 신규 코드 및 활성 모듈

---

## 1. Phase B-1: 준비 및 표준화 (Preparation & Standardization)

*목표: 에이전트와 개발자가 "고민 없이" 새 별칭을 사용할 수 있는 환경 구축*

### 상세 작업
1. **AI 에이전트 지침 업데이트**
   - 파일: `AGENTS.md` (또는 프로젝트 지침)
   - 내용: "신규 데이터 액세스 코드 작성 시 `firestore-api` 대신 `db-api`를, `firebase-firestore-compat` 대신 `postgres-client`를 사용해야 함" 규칙 명시.
2. **타입 정의 및 자동완성 강화**
   - 파일: `src/postgres-client.js`, `netlify/functions/_lib/db-api.js`
   - 작업: JSDoc `@module` 및 `@type` 보충하여 IDE에서 `postgresDB`나 `queryPostgresCollection` 입력 시 자동완성 지원 강화.
3. **신규 코드 기준 확립**
   - 신규 개발 건, 50% 이상 리팩토링 모듈을 대상으로 즉시 적용.

---

## 2. Phase B-2: 활성 모듈 적용 (Active Module Adoption)

*목표: 현재 빈번하게 수정되는 핵심 모듈의 import 경로를 우선 전환*

### 상세 작업
1. **서버측 AI 엔진 모듈 전환**
   - 대상: `netlify/functions/tree-ai.js`, `netlify/functions/tree-admin.js`
   - 내용: `isAdminUser` → `isPostgresAdmin`, `getDoc` → `getPostgresDoc` 등으로 교체.
   - Import: `require('./_lib/firestore-api')` → `require('./_lib/db-api')`
2. **클라이언트측 AI 어시스턴트 유틸 전환**
   - 대상: `src/editor-ai-logic.js`, `src/editor-ai-ui.js`
   - Import: `from './firebase-firestore-compat.js'` → `from './postgres-client.js'`
3. **상수 및 설정 파일 가이드**
   - `src/firebase.js`: Firestore 직접 사용에 대한 경고 주석 및 Alias 가이드 추가.

---

## 3. Phase B-3: 전파 및 방어 (Propagation & Guarding)

*목표: 단일 진입점을 통한 데이터 접근 구조 고착화 및 구형 경로 차단*

### 상세 작업
1. **주변부 헬퍼 유틸리티 전환**
   - 대상: `src/shared-layout.js`, `src/owner-bindings.js` 등.
   - 비즈니스 로직 수정 없이 `import` 경로만 `postgres-client.js`로 변경.
2. **전역 객체 별칭 등록**
   - `window.postgresDB`를 병행 등록하여 개발자 콘솔 학습 유도.
3. **코드 리뷰 규칙 적용**
   - 신규 PR에서 구형 `firestore` 직접 참조 발견 시 alias 사용 권고 프로세스 가역.

---

## 4. 단계별 테스트 포인트

| 단계 | 테스트 항목 | 검증 방법 |
|:---|:---|:---|
| **B-1** | IDE 자동완성 작동 여부 | `postgresDB.` 입력 시 `collection`, `doc` 등 리스트업 확인 |
| **B-2** | AI 기능 런타임 검증 | `tree-ai.js` 호출 시 권한 체크(`isPostgresAdmin`) 정상 작동 확인 |
| **B-2** | 클라이언트 빌드 정상 여부 | `postgres-client.js` 참조 후 Netlify 빌드/배포 성공 확인 |
| **B-3** | 중복 Import 확인 | 한 파일 내에서 구형/신규 경로 중복 사용 여부 정적 분석 |

---

## 5. Rollback 포인트

1. **빌드 실패 시**: 신규 import 경로 계산 오류 발생 시 해당 모듈 `import` 구문을 즉합 `firebase-firestore-compat.js`로 원복.
2. **런타임 에러 시**: `postgres-client.js`나 `db-api.js`의 re-export 구문 오류 시 alias 파일 대신 원래 파일을 직접 참조하도록 수정.
3. **권한 오류**: `isPostgresAdmin` 등이 비정상 동작할 경우 `db-api.js` 매핑 즉시 점검.

---

> [!IMPORTANT]
> **작업 경계 명시 (한 번에 하면 안 되는 것)**
> - 비즈니스 로직(알고리즘) 수정과 `import` 경로 변경을 한 커밋에 섞지 마십시오.
> - 기존 `firestore-api.js` 파일은 Phase C 완료 전까지 절대 삭제하지 마십시오.
> - 스키마 변경(컬렉션 이름 변경 등)은 본 네이밍 마이그레이션과 분리하여 진행하십시오.
