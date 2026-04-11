# Lovetree MVP Scope

## Goal

초기 MVP의 목표는 아래 하나다.

사용자가 처음 사랑에 빠진 순간부터 팬이 되어가는 경로를 영상과 메모로 빠르게 기록하고, 그것을 연결된 러브트리로 다시 볼 수 있게 만드는 것.

이 문서는 "지금 당장 만들어야 할 것"과 "나중에 미뤄도 되는 것"을 구분하기 위한 기준 문서다.

## MVP Definition

Lovetree MVP는 아래 경험이 한 흐름으로 이어지면 성립한다.

1. 영상 링크를 가져온다
2. 특정 순간을 기록한다
3. 감정 메모를 남긴다
4. 이전 순간과 연결한다
5. 완성된 러브트리를 다시 본다
6. 원하면 다른 팬에게 공유한다

이 6단계가 흔들리면 다른 기능을 추가하지 않는다.

## In Scope

### 1. Auth

- Firebase Auth 기반 로그인/세션
- 이메일/소셜 로그인 유지
- 최소 프로필 정보 동기화

### 2. Tree

- 새 러브트리 생성
- 내 러브트리 목록 보기
- 트리 제목, 공개 범위, 수정일 확인
- 트리 열기 / 삭제 / 공유 기본 액션

### 3. Memory Node

- 영상 URL 저장
- 특정 시점(timestamp) 저장
- 짧은 제목 저장
- 감정 태그 저장
- 짧은 메모 저장
- 트리 안에서 노드 연결

### 4. Viewing

- 데스크톱에서 연결형 러브트리 보기
- 모바일에서 단순화된 연결 흐름 보기
- 특정 메모리 상세 보기
- 연결된 다음 순간 / 이전 순간 감상

### 5. Sharing

- 러브트리 링크 공유
- 공개/비공개/링크 공유 범위 설정
- 공유된 러브트리 읽기 전용 감상

### 6. Community Minimum

- 공유된 러브트리 둘러보기
- 공감 / 댓글 / 저장 같은 최소 반응
- 게시판이 아니라 러브트리 감상 중심 구조 유지

## Out of Scope For MVP

아래 항목은 아이디어로는 유효하지만 MVP에서는 제외한다.

- 굿즈 / 공연 / 구독 / 장터 / 모임 확장
- 프리미엄 과금 설계
- 고급 랭킹 시스템
- 복잡한 추천 알고리즘
- AI 자동 태깅 고도화
- 고급 협업 기능
- 다중 트리 템플릿 시스템
- 영상 플랫폼별 깊은 수집 자동화

## Page Priority

실제 구현 우선순위는 아래 순서다.

1. `editor-desktop`
2. `mobile-add-memory`
3. `mobile-tree`
4. `memory-detail`
5. `my-trees`
6. `home`
7. `community-tree-detail`
8. `community`
9. `settings`
10. `login`

이 순서는 곧바로 제품 가치에 연결되는 정도를 기준으로 한다.

## Must-Have Data

MVP 구현 전에 아래 데이터가 저장/조회 가능해야 한다.

- `tree.id`
- `tree.title`
- `tree.ownerId`
- `tree.visibility`
- `tree.updatedAt`
- `memory.id`
- `memory.treeId`
- `memory.sourceUrl`
- `memory.sourceType`
- `memory.timestamp`
- `memory.title`
- `memory.memo`
- `memory.emotionTags`
- `memory.parentId` 또는 연결 정보

## Must-Have UI States

아래 상태는 반드시 고려한다.

- 첫 러브트리 없음
- 러브트리 있음
- 메모리 없음
- 메모리 선택됨
- 공유용 읽기 전용
- 로그인 전 / 로그인 후

## Quality Bar Before Real Integration

정적 시안을 실제 기능 개발 기준안으로 넘기기 전에 아래 조건을 만족해야 한다.

1. 핵심 4페이지의 문구가 자연스럽다
2. 모바일 / 데스크톱 역할 구분이 명확하다
3. 러브트리가 "기술 노드 툴"처럼 보이지 않는다
4. 첫 순간 기록 흐름이 한 화면에서 설명 가능하다
5. 공유 화면이 "영상 하나"가 아니라 "사랑의 경로 전체"를 보여준다

## Handoff Rule

개발 작업을 외부 모델이나 무료 모델에게 맡길 때는 아래 순서를 지킨다.

1. `docs/product/PRODUCT_IDENTITY.md`
2. `docs/product/MVP_SCOPE.md`
3. 필요한 경우 `docs/product/USER_FLOW.md`
4. 그 다음에만 구현 프롬프트 전달

문서 없이 바로 구현 프롬프트를 던지지 않는다.
