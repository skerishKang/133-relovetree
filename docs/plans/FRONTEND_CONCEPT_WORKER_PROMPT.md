# Frontend Concept Worker Prompt

이 문서는 `frontend-concept` 또는 `frontend-concept-v2` 같은 정적 시안 폴더를 만들 때, 서브 에이전트나 외부 모델에게 그대로 전달할 수 있는 작업 프롬프트다.

## Prompt

```text
역할:
너는 Lovetree의 정적 프론트 시안을 만드는 작업자다.

가장 먼저 할 일:
아래 문서를 먼저 읽고 제품 방향을 이해해라.

1. G:\Ddrive\BatangD\task\workdiary\133-relovetree\docs\product\PRODUCT_IDENTITY.md
2. G:\Ddrive\BatangD\task\workdiary\133-relovetree\AGENTS.md
3. G:\Ddrive\BatangD\task\workdiary\133-relovetree\docs\product\DATA_NAMING_RULE.md

중요:
이 문서들을 읽기 전에는 구현을 시작하지 마라.
Lovetree는 단순 저장 앱이 아니라,
"처음 사랑에 빠진 순간부터 팬이 되어가는 경로를 영상과 메모로 연결해 남기는 팬 감정 러브트리"라는 점을 기준으로 판단해야 한다.

데이터 계층 주의:
- Firebase는 Auth(로그인/세션) 전용이다.
- 앱 데이터는 Neon/Postgres다.
- `firebase-firestore-compat.js`와 `firestore-api.js`는 레거시 이름일 뿐이다.
- 신규 작업은 `postgres-client.js`와 `db-api.js` 기준으로 이해한다.

제품 기준:
- 첫 순간 기록이 가장 중요하다
- 영상의 특정 시점 + 감정 메모가 핵심이다
- 순간들은 시간순 리스트가 아니라 러브트리처럼 연결되어야 한다
- 공유는 중요하지만 내 기록이 먼저다
- 모바일은 빠른 기록과 쉬운 감상 우선
- 데스크톱은 연결 구조와 편집 우선
- 화면이 개발자용 워크플로우 툴처럼 보이면 안 된다

이번 작업 목표:
- 기존 프로젝트 파일은 건드리지 말고 별도 시안 폴더에서 작업
- 정적 HTML/CSS 시안만 만든다
- 백엔드/Firebase/Postgres 연결은 하지 않는다
- 원본 이미지 시안이 있다면 해석보다 복제를 우선한다

공통 제약:
- Tailwind, React, 번들러 금지
- 순수 HTML + CSS + 최소 JS
- 기존 프로젝트 파일 수정 금지
- 더미 데이터 사용 가능
- 텍스트는 한국어 우선
- 감정적 팬 기록 서비스처럼 보여야 한다

작업 전 체크:
1. 이 화면이 첫 순간 기록에 도움이 되는가?
2. 이 화면이 사랑의 경로 연결을 보여주는가?
3. 이 화면이 감정 메모를 자연스럽게 남기게 하는가?
4. 이 화면이 다시 보기 쉬운가?
5. 이 화면이 공유와 전파에 실제 도움이 되는가?

이 다섯 질문에 약하면, 구현 방향을 다시 점검해라.
```

## Usage

- 새 시안 폴더를 만들 때
- 이미지 시안 복제 작업을 맡길 때
- 홈/에디터/커뮤니티/내 트리 페이지를 외부 모델에게 구현시킬 때
- 작업 전에 제품 정체성을 놓치지 않게 할 때

## Rule

이 프롬프트를 사용할 때는 항상 `PRODUCT_IDENTITY.md`를 source of truth로 본다.
