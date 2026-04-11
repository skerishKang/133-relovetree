# Flow A: 핵심 유저 흐름 QA 체크리스트

## 1. 개요 (QA Intent)

Lovetree의 핵심인 `Flow A`("입덕의 경로 기록")가 의도된 제품 경험을 제공하는지 검증합니다. 단순한 기능 동작 여부를 넘어, **"사랑의 연결이 느껴지는가"**라는 정체성을 기준으로 확인합니다.

---

## 2. 필수 시나리오 및 기대 결과 (Product Experience)

### SC-01: 내 첫 번째 입덕 순간 기록하기
- **과정**: `my-trees.html`에서 트리 생성 -> `mobile-add-memory.html` 진입 -> 영상 URL 및 감정 메모 입력 -> 저장
- **핵심 체크**: 
  - [ ] 첫 노드 생성 시 "루트 노드"임을 인지할 수 있는가?
  - [ ] 감정 태그가 내 현재 상태(설렘, 감동 등)를 잘 대변하는가?
  - [ ] timestamp 입력 시 실제 DB에 저장되는가?
- **기대 결과**: 저장 후 `mobile-tree.html`로 자동 이동하며, 내가 방금 남긴 첫 순간이 큼직하게 노출.
- **확인 지점**: `src/flow-shared.js`의 `addMemoryToTree` 함수, `nodes` 배열 첫 요소 확인

### SC-02: 감정의 경로 연결하기 (두 번째 순간)
- **과정**: 기존 트리가 있는 상태에서 "순간 추가" -> 이전 노드를 선택 -> 새 영상과 메모 입력 -> 저장
- **핵심 체크**:
  - [ ] 이전 순간과 지금 순간의 인과관계가 시각적으로 느껴지는가?
  - [ ] "이후에 연결됨"이라는 정보가 명확히 보이는가?
  - [ ] `edges` 배열에 `{from: parentId, to: newNodeId}` 형태로 저장되는가?
- **기대 결과**: `mobile-tree.html`에서 두 노드가 연결선(가지)으로 이어져 "경로"가 생성.
- **확인 지점**: DevTools > Application > IndexedDB 또는 Network 요청으로 edges 확인

### SC-03: 생성된 러브트리 다시 감상하기
- **과정**: `mobile-tree.html`에서 흐름 확인 -> 특정 노드 클릭 -> `memory-detail.html` 감상
- **핵심 체크**:
  - [ ] 영상 플레이어가 지정된 `timestamp`부터 재생되는가? (예: 1:30 → `&start=90`)
  - [ ] 상세 화면에서 내가 남긴 감정 메모와 태그가 감동적으로 전달되는가?
  - [ ] 연결된 이전/다음 순간으로 이동 가능한가?
- **기대 결과**: 영상과 감정 메모가 조화롭게 배치되어, 그때의 반했던 감정이 다시 느껴져야 함.
- **확인 지점**: `src/memory-detail.js`의 `renderVideo`, `renderMemo` 함수

---

## 3. 실패 시 진단 가이드 (Failure Analysis)

| 증상 | 우선 확인 지점 | 기술적 체크 사항 |
|------|--------------|-----------------|
| 저장이 되지 않음 | `src/flow-shared.js` | `addMemoryToTree` 함수 호출 시 `db` 객체 유효성 확인 |
| 연결선이 보이지 않음 | `mobile-tree.html` | `edges` 배열에 `from/to` 페어가 정상적으로 저장되었는지 확인 |
| 영상 재생이 안 됨 | `memory-detail.js` | `videoId` 파싱 로직 및 `iframe` 허용 정책 확인 |
| 권한 에러 발생 | `src/auth.js` | Firebase Auth 세션 유지 및 `ownerId` 일치 여부 확인 |

---

## 4. 최소 회귀 테스트 및 자동화 후보 (QA Ops)

### 4.1 회귀 테스트 최소 세트 (수동 필수)
- [ ] 로그인 상태 변경 시 본인 트리 노출 여부
- [ ] YouTube URL 패턴별 파싱 정확도
- [ ] 모바일 기기에서의 스크롤 및 클릭 편의성

### 4.2 Playwright 자동화 우선순위
1.  **Level 1 (Smoke)**: 로그인 후 '나의 러브트리' 목록 로딩 여부.
2.  **Level 2 (CRUD)**: 트리 생성 및 첫 노드 저장 성공 여부.
3.  **Level 3 (Logic)**: `timestamp` 입력 시 영상 시작 파라미터(`&t=`) 정상 생성 여부.

---

## 5. 실사용 검증 기록 (Test Log)

| 날짜 | 환경 | 시나리오 | 결과 | 비고 |
|------|------|----------|------|------|
| 2026-04-12 | Local | SC-01 | [Pass/Fail] | |
| 2026-04-12 | Prod | SC-02 | [Pass/Fail] | |

---

**참조 문서:**
- `docs/product/USER_FLOW.md` - 정의된 표준 흐름
- `docs/product/PRODUCT_IDENTITY.md` - 제품 평가 기준
- `src/flow-shared.js` - 검증 대상 핵심 로직