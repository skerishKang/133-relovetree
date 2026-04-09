# Postgres / Firestore-Compat Integration Review

검토 범위:
- `netlify/sql/001_initial_postgres_schema.sql`
- `netlify/functions/_lib/db.js`
- `netlify/functions/_lib/firebase-auth.js`
- `netlify/functions/_lib/http.js`
- `netlify/functions/_lib/document-store.js`
- `netlify/functions/_lib/repositories/tree-repository.js`
- `netlify/functions/firestore-api.js`
- `netlify/functions/tree-admin.js`
- `netlify/functions/tree-ai.js`
- `src/firebase-firestore-compat.js`

검토 기준:
- 현재 프런트의 Firestore 사용 패턴과의 실제 호환성
- 깨지는 기능
- 응답 포맷 불일치
- 인증/권한 누락
- 데이터 스키마 불일치
- 마이그레이션 시 손실 가능성

## 결론

현재 골격은 "일부 Firestore API를 흉내내는 최소 구현" 수준이며, 그대로 병합하면 관리자 기능과 커뮤니티의 일부 흐름은 실제로 깨지거나 데이터가 틀어질 수 있다. 특히 `users` 컬렉션 쓰기 권한, `runTransaction` 의미 불일치, `get()` 기본 50건 제한은 병합 전 차단이 필요하다.

## 치명

- `users` 문서에 대해 자기 자신의 `role`, `isDemo`, `isAiBot`, `isPro`를 임의 수정할 수 있다. 서버 권한 검사는 `users/{uid}`에 대해 "본인 문서면 허용"만 보고 필드 제한을 하지 않는다. 현재 프런트에는 결제 페이지에서 스스로 `role: 'pro'`를 올리는 코드가 있고, 같은 방식으로 `admin`까지도 올릴 수 있다. 근거: [`netlify/functions/_lib/firestore-api.js#L66`](./netlify/functions/_lib/firestore-api.js), [`src/payment.js#L103`](./src/payment.js), [`src/auth.js#L83`](./src/auth.js). 병합 전 필수 수정: `users` 쓰기 허용 필드를 서버에서 화이트리스트로 제한하고, 역할 변경은 관리자 전용 경로로 분리해야 한다.

- 서브컬렉션 문서 ID 충돌 시 부모가 다른 댓글이 같은 행으로 합쳐질 수 있다. SQL 스키마는 `tree_comments.id`, `community_comments.id`를 단일 PK로 잡고 있고, 저장 로직도 `ON CONFLICT (id)`만 사용한다. Firestore는 서로 다른 부모 문서 아래에서 같은 댓글 ID를 허용하므로, 동일 ID가 재사용되면 다른 `tree_id` 또는 `post_id`로 "이동"하거나 덮어써지는 데이터 오염이 발생한다. 근거: [`netlify/sql/001_initial_postgres_schema.sql#L43`](./netlify/sql/001_initial_postgres_schema.sql), [`netlify/sql/001_initial_postgres_schema.sql#L78`](./netlify/sql/001_initial_postgres_schema.sql), [`netlify/functions/_lib/document-store.js#L354`](./netlify/functions/_lib/document-store.js). 병합 전 필수 수정: 서브컬렉션 테이블은 `(parent_id, id)` 복합 유니크/PK로 바꾸고 upsert도 같은 키를 기준으로 해야 한다.

## 높음

- `runTransaction`이 Firestore의 읽기-후-쓰기 트랜잭션 semantics를 보장하지 않는다. 클라이언트 `tx.get()`은 먼저 일반 `getDoc` HTTP 호출을 하고, 그 뒤 큐에 쌓인 write만 별도 `runTransaction` 호출로 보낸다. 즉 읽기와 쓰기가 같은 서버 트랜잭션 안에 있지 않다. 현재 커뮤니티 댓글 소프트 삭제는 이 패턴에 의존해 `commentCount`를 감소시키므로 동시 요청 시 카운트 드리프트가 날 수 있다. 근거: [`src/firebase-firestore-compat.js#L300`](./src/firebase-firestore-compat.js), [`community.js#L296`](./community.js), [`netlify/functions/_lib/document-store.js#L478`](./netlify/functions/_lib/document-store.js). 병합 전 필수 수정: 최소한 서버 쪽 `runTransaction`에 `get`까지 포함하는 프로토콜을 추가하거나, 해당 기능을 서버 전용 엔드포인트로 옮겨 원자적으로 처리해야 한다.

- `collection().get()`이 Firestore처럼 "전부 조회"가 아니라 기본 50건으로 잘린다. 서버 구현은 `limit` 미지정 시 항상 50을 적용한다. 현재 관리자 화면은 `db.collection('users').get()`과 `db.collection('trees').get()`에 의존해 통계와 일괄 재계산을 수행하므로 51건 이상부터 결과가 조용히 틀어진다. 근거: [`netlify/functions/_lib/document-store.js#L459`](./netlify/functions/_lib/document-store.js), [`admin.js#L900`](./admin.js), [`admin.js#L1404`](./admin.js). 병합 전 필수 수정: `limit`이 없을 때는 제한을 두지 않거나, 호출부가 명시적으로 pagination/limit을 사용하도록 전면 수정해야 한다.

- 관리자/로그인 사용자의 모든 Firestore-compat 요청은 Firebase Admin 서비스 계정이 없으면 실패한다. compat 레이어는 매 요청마다 ID 토큰을 검증하고, 서비스 계정 환경변수가 없으면 인증 전체가 깨진다. 현재 로그인 직후 `syncUserToDatabase()`(기존 `saveUserToFirestore`)가 곧바로 `users/{uid}`를 읽고 쓰므로, 환경 설정이 누락된 배포는 로그인 후 사용자 저장부터 막힌다. 근거: [`netlify/functions/_lib/firebase-auth.js#L13`](./netlify/functions/_lib/firebase-auth.js), [`src/auth.js#L83`](./src/auth.js). 병합 전 필수 수정: 배포 필수 env를 명시하고, 없을 때는 조기 실패 메시지를 분리하거나 배포 차단 체크를 둬야 한다.

- 트리 댓글 권한 모델과 실제 데이터 필드가 어긋난다. 권한 검사는 트리 댓글에 대해 `authorId`를 기준으로 소유자를 판단하지만, 실제 프런트는 `userId`, `userName`으로 저장한다. 지금은 댓글 생성만 있어서 즉시 폭발하지 않지만, 이후 수정/삭제 권한이나 운영 툴을 붙이면 소유권 판별이 틀어진다. 근거: [`netlify/functions/_lib/firestore-api.js#L72`](./netlify/functions/_lib/firestore-api.js), [`editor.html#L1508`](./editor.html), [`admin.js#L1937`](./admin.js), [`netlify/functions/_lib/document-store.js#L43`](./netlify/functions/_lib/document-store.js). 병합 전 필수 수정: 트리 댓글 필드를 현재 프런트 모델(`userId`, `userName`, `text`, `isAiBot`) 기준으로 정리하거나, 프런트 저장 스키마를 서버 권한 모델과 맞춰야 한다.

## 중간

- `onSnapshot`은 실시간 스트림이 아니라 4초 polling이다. 기능 자체는 돌아가지만 댓글 UI와 같이 "즉시 반영"을 기대하는 화면에서 지연과 중복 fetch가 생긴다. 근거: [`src/firebase-firestore-compat.js#L340`](./src/firebase-firestore-compat.js), [`editor.html#L1427`](./editor.html). 병합 전 필수 수정은 아니지만, 실시간성 저하를 릴리즈 노트에 명시하거나 polling interval/visibility 제어가 필요하다.

- 댓글/포스트/로그의 typed column 커버리지가 현재 payload보다 좁다. 예를 들어 `community_posts`에는 `content`, `mediaUrl`, `mediaType`, 삭제 메타가 payload에만 있고 별도 인덱스는 없다. 데이터는 저장되지만 이후 SQL 직접 조회나 운영 쿼리에서 기대한 필드가 안 보일 수 있다. 근거: [`netlify/functions/_lib/document-store.js#L57`](./netlify/functions/_lib/document-store.js), [`community.js#L892`](./community.js). 마이그레이션 시 주의: 운영/리포트 요구가 있다면 payload 내부 필드까지 컬럼화 대상 재검토가 필요하다.

- `likeCount`, `nodeCount`, `commentCount` 같은 집계 필드는 원본 배열/서브컬렉션과 별개로 저장된다. 기존 Firestore 데이터 중 집계 필드가 비어 있거나 오래된 문서가 있으면, 홈/관리자 정렬이 실제 데이터와 달라질 수 있다. 근거: [`index.js#L301`](./index.js), [`community.js#L747`](./community.js), [`netlify/sql/001_initial_postgres_schema.sql#L28`](./netlify/sql/001_initial_postgres_schema.sql). 마이그레이션 전후로 backfill/recalc 작업이 필요하다.

## 패턴별 호환성 체크

- `collection/doc/get/set/update/delete`: 기본 동작은 대부분 맞지만, `get()` 기본 limit 50, `users` 권한 과다, 서비스 계정 의존성이 있다.
- `add`: 동작한다. 다만 서브컬렉션 ID 충돌 설계가 안전하지 않다.
- `where/orderBy/limit/get`: 현재 사용 중인 `==`, 정렬, limit는 대체로 지원된다. Firestore 고유 제약과 정확히 같지는 않다.
- `subcollection comments`: 경로 해석은 `trees/{id}/comments`, `community_posts/{id}/comments`만 지원한다.
- `onSnapshot`: polling 기반 대체 구현이다.
- `runTransaction`: 읽기-쓰기 원자성은 호환되지 않는다.
- `FieldValue.serverTimestamp/increment/arrayUnion/delete`: 현재 프런트 사용 범위는 대부분 처리된다.

## 병합 전 필수 수정 항목

- `users` 컬렉션에 대한 서버측 필드별 ACL 추가
- 서브컬렉션 댓글 테이블 PK/유니크 키를 부모 포함 복합키로 수정
- `runTransaction`을 실제 read-write transaction으로 보강하거나, 커뮤니티 삭제 같은 흐름을 서버 전용 엔드포인트로 이동
- `queryCollection`의 무제한 조회 semantics 재설계
- 배포 필수 환경변수(`FIREBASE_SERVICE_ACCOUNT_JSON` 또는 동등값) 체크 추가
- 트리 댓글 스키마와 권한 기준 필드명 정렬

## 메모

- 이번 검토에서는 코드 수정은 하지 않았다.
- 작업 트리에 기존 변경이 많아 리뷰 문서만 추가했다.
