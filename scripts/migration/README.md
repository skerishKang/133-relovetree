# Firestore to PostgreSQL 마이그레이션 가이드

이 문서는 기존 Firestore의 데이터를 Firebase Auth를 유지한 상태로 PostgreSQL로 이전하는 과정과 규칙을 정의합니다.

## 1. SQL 적재 규칙 (Data Mapping Rules)

- **ID (Primary Key)**: Firestore 문서 ID(랜덤 문자열)를 그대로 `VARCHAR(128) PRIMARY KEY`로 사용합니다. 이를 통해 기존 관계를 온전히 유지합니다.
- **Timestamp**: Firestore의 `Timestamp` 객체는 자바스크립트 `Date`로 변환된 후 Postgres의 `TIMESTAMPTZ` 타입으로 저장됩니다.
- **서브컬렉션 (Subcollections)**: 
  - `trees/{id}/comments` -> `tree_comments` 테이블로 분리, `tree_id` (FK) 연동.
  - `community_posts/{id}/comments` -> `community_comments` 테이블로 분리, `post_id` (FK) 연동.
- **파생/집계 필드**: `likes`, `nodeCount`, `commentCount` 등은 `INTEGER DEFAULT 0`로 매핑됩니다.
- **구조화되지 않은 데이터**: 트리 내부 노드 정보(`data`)는 Postgres의 `JSONB` 타입으로 저장되어 스키마 유연성을 보장합니다.
- **관계 (Relations)**: `users` 테이블의 `uid`를 참조하는 `owner_id`, `author_id` 등에 `ON DELETE CASCADE` 또는 `SET NULL`을 적용하여 데이터 정합성을 유지합니다.

---

## 2. 마이그레이션 실행 절차

1. **사전 준비**
   - 대상 PostgreSQL 데이터베이스(Supabase, AWS RDS 등) 프로비저닝.
   - `.env.example`을 참고하여 `.env` 파일 생성 및 `DATABASE_URL`, `GOOGLE_APPLICATION_CREDENTIALS` 기입.
   - 필수 패키지 설치: `npm install firebase-admin pg dotenv`

2. **스키마 적용**
   - DB 클라이언트나 GUI 툴을 사용하여 `schema.sql` 전체 스크립트를 실행합니다.

3. **데이터 복사**
   ```bash
   cd scripts/migration
   node migrate.js
   ```
   *참고: 스크립트는 멱등성(Idempotency)을 가지도록 작성되어 중간에 실패하더라도 재실행이 가능합니다 (UPSERT).*

4. **데이터 검증**
   ```bash
   node verify.js
   ```
   *모든 컬렉션의 Row Count가 일치하고 고아 데이터(Orphan)가 0건인지 확인합니다.*

---

## 3. 운영 전환 체크리스트

- [ ] **Read-Only 적용**: 데이터 불일치 방지를 위해 마이그레이션 직전 프론트엔드의 쓰기 작업을 막거나 Firestore Rules를 읽기 전용으로 수정.
- [ ] **인증 토큰 유효성**: Auth는 Firebase를 유지하므로, 서버의 검증 로직(`admin.auth().verifyIdToken()`)이 정상 작동하는지 확인.
- [ ] **환경 변수 갱신**: 배포 환경(Netlify 등)의 환경 변수에 `DATABASE_URL`을 주입.
- [ ] **백엔드 배포**: Firestore 대신 PostgreSQL을 바라보도록 변경된 API 코드 배포.
- [ ] **초기 백업**: 라이브 트래픽 인입 전 Postgres의 첫 스냅샷(백업) 생성.

---

## 4. 위험 요소 및 수동 작업 사항 (Risks & Manual Tasks)

### ⚠️ 남은 수동 작업
1. **API/백엔드 로직 수정**: Netlify Functions(`tree-admin.js`, `tree-ai.js` 등)의 데이터 접근 코드를 `firebase-admin`에서 `pg` 쿼리(또는 ORM)로 완전히 교체해야 합니다. 프론트엔드는 수정하지 않지만 백엔드 인터페이스는 유지해야 합니다.
2. **트리거 이관**: Firestore 트리거(`onCreate`, `onUpdate` 등)를 사용 중이었다면 Postgres DB 트리거 또는 애플리케이션 계층 이벤트로 수동 이관해야 합니다.
3. **Storage 유지**: 이미지/에셋용 Firebase Storage는 마이그레이션 대상이 아닙니다. 기존 저장소와 URL 로직을 그대로 사용합니다.

### 🚨 위험 요소
1. **동시성 문제**: 마이그레이션 도중 사용자가 데이터를 수정하면 델타(Delta) 데이터가 유실될 수 있습니다. 반드시 마이그레이션 중에는 유지보수 모드(Read-only)를 권장합니다.
2. **서브컬렉션 고유 ID**: Firestore에서 문서 ID는 컬렉션 내에서 고유합니다. 극히 드물지만 `tree_comments`와 `community_comments`의 각 하위 문서 ID가 전역으로 고유하지 않을 경우 PK 충돌이 날 수 있습니다. (`migrate.js`가 에러 로그로 이를 잡아냅니다.)
3. **연쇄 삭제(Cascade)**: 테스트/마이그레이션 중 `users` 테이블의 관리자를 지우면 `CASCADE` 옵션에 의해 연관된 게시글, 트리가 모두 삭제되므로 DB 조작 시 주의가 필요합니다.
