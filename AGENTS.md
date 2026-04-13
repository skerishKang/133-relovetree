# AGENTS.md

## First Read

이 저장소에서 제품/화면/기능 작업을 시작하기 전에 반드시 아래 문서를 먼저 읽는다.

- [PRODUCT_IDENTITY.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/product/PRODUCT_IDENTITY.md)
- [MVP_SCOPE.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/product/MVP_SCOPE.md)
- [USER_FLOW.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/product/USER_FLOW.md)
- [DATA_NAMING_RULE.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/product/DATA_NAMING_RULE.md)

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
  - 클라이언트: `src/postgres-client.js`
  - 서버(Netlify Functions): `netlify/functions/_lib/db-api.js`
- ⚠️ 신규 코드에서 `firebase-firestore-compat.js`나 `firestore-api.js`를 직접 참조하는 것을 금지한다.
- 새 페이지나 새 기능을 만들 때는 “이게 첫 순간 기록과 사랑의 경로 연결에 실제 도움이 되나”를 먼저 따진다.

## Data / Architecture Reminder

- Firebase Auth는 로그인/세션 전용
- 실제 앱 데이터는 Netlify Functions를 거쳐 Neon/Postgres에 저장
- Firestore 스타일 API 명칭은 호환 레이어일 뿐, 실제 저장소는 Postgres다
