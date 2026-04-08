# Firestore to Postgres Migration Guide

본 문서는 Firestore에서 Postgres로 데이터를 안전하게 이전하기 위한 절차와 검증 방법을 안내합니다.

## 1. 사전 준비 (Prerequisites)

- **Postgres Database**: 마이그레이션 대상 데이터베이스 준비 (Supabase, Neon, AWS RDS 등).
- **Service Account**: Firebase Admin SDK 권한이 있는 JSON 키 파일.
- **Node.js**: `firebase-admin`, `pg`, `dotenv` 패키지 설치 필요.

## 2. 환경 설정 (`.env` 예시)

`scripts/migration/.env` 파일 또는 시스템 환경 변수를 설정하세요.

```env
# Postgres Connection String
DATABASE_URL=postgres://user:password@localhost:5432/lovetree

# Firebase Admin SDK (Credential file path or JSON)
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json

# (Optional) Cloud SQL Proxy if needed
# DB_HOST=localhost
```

## 3. 마이그레이션 실행 순서

1.  **스키마 생성**: Postgres 대시보드 또는 CLI에서 `schema.sql`을 실행하여 테이블 구조를 생성합니다.
2.  **데이터 이전**:
    ```bash
    cd scripts/migration
    node migrate.js
    ```
    *   `users` -> `trees` -> `community_posts` 순서로 데이터가 이전됩니다 (FK 제약 조건 때문).
    *   서브컬렉션(댓글)은 자동으로 관련 테이블로 평탄화되어 저장됩니다.
3.  **데이터 검증**:
    ```bash
    node verify.js
    ```
    *   레코드 개수 불일치나 고아 데이터를 확인합니다.

## 4. 운영 전환 체크리스트 (Checklist)

- [ ] **Read-only Mode**: 마이그레이션 직전 Firestore 쓰기 권한을 차단하여 데이터 불일치 방지.
- [ ] **Auth 유지**: Firebase Auth 토큰을 그대로 사용하므로 백엔드에서 `admin.auth().verifyIdToken()`은 계속 사용 가능.
- [ ] **Environment Sync**: Netlify 또는 백엔드 서버의 환경 변수(`DATABASE_URL`)를 Postgres로 업데이트.
- [ ] **Backup**: 마이그레이션 완료 후 Postgres의 첫 번째 스냅샷 생성.

## 5. 위험 요소 및 수동 작업 (Risks & Manual Tasks)

1.  **서브컬렉션 ID 중복**: 서로 다른 게시글의 댓글 ID가 Firestore 전역에서 고유하지 않을 경우(드묾), PK 충돌이 발생할 수 있습니다. `migrate.js`에서는 `ON CONFLICT` 처리가 되어 있습니다.
2.  **데이터 정합성**: `likes` 카운트가 실시간 업데이트 중이었다면 약간의 오차가 발생할 수 있습니다. `verify.js`를 통해 샘플 체크를 수행하세요.
3.  **수동 작업**:
    *   Firestore 전용 트리거(Cloud Functions)가 있다면 Postgres 트리거 또는 백엔드 애플리케이션 로직으로 수동 이식해야 합니다.
    *   Storage 관련 URL(`thumbnailUrl`)은 변하지 않으므로 그대로 유지됩니다.

---
**주의**: 본 스크립트는 프론트엔드 코드를 수정하지 않습니다. 백엔드 API 엔드포인트가 Firestore SDK 대신 Postgres(pg/Prisma/Sequelize 등)를 사용하도록 업데이트된 후에 운영 환경에 배포하십시오.
