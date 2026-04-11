# 공유 읽기 전용 범위 문서 (READONLY SHARE SCOPE)

## 1. 목적

이 문서는 Relovetree에서 "공유된 러브트리를 다른 팬이 감상하는" 읽기 전용 화면의 범위와 동작을 정의한다. 제품 정체성에 맞게 "사랑의 경로를 감상하는 경험"으로 설명한다.

---

## 2. 왜 이 기능이 MVP 다음 단계로 필요한지

### 2.1 제품 원칙에서必需

- **Private First, Share Second**: MVP에서 "내 기록 보기"를 완성한 후, "다른 팬과 공유" 단계로 자연스럽게 확장
- ** communaut principles**: 커뮤니티는 "게시판이 아니라 러브트리 감상 공간"

### 2.2 사용자 흐름에서必需

```
내 트리 만들기 → 기록 추가 → 트리 완성 → 다른 팬에게 공유 → 읽기 전용으로 감상
```

MVP는 "내 트리 보기/편집"까지만 구현. 그 다음 단계가 "남의 트리 감상"이다.

### 2.3 구현 복잡도

- 기존의 `ownerId !== currentUser.uid` 읽기 전용 로직을 확장하면 됨
- 별도의 권한 시스템이 아닌 URL 파라미터 기반
- 최소한의 화면 차이만 구현

---

## 3. 읽기 전용 공유의 핵심 사용자 흐름

```
1. 소유자가 내 트리에서 "공유" 버튼 클릭
2. 공유 링크 복사 (예: /pages/mobile-tree.html?treeId=XXX)
3. 다른 팬이 링크 클릭
4. 읽기 전용 모드로 트리 감상
5. 공감/댓글 가능 (선택적)
```

---

## 4. URL 예시

| 화면 | 읽기 전용 URL | 설명 |
|------|-------------|------|
| 모바일 트리 보기 | `/pages/mobile-tree.html?treeId={treeId}&mode=view` | 전체 트리 흐름 감상 |
| 순간 상세 보기 | `/pages/memory-detail.html?treeId={treeId}&nodeId={nodeId}&mode=view` | 특정 순간 상세 감상 |
| 커뮤니티 트리 상세 | `/pages/community-tree-detail.html?treeId={treeId}` | 커뮤니티에서 진입 |

---

## 5. 읽기 전용에서 가능한 것 / 불가능한 것

### 5.1 가능한 것 (Allowed)

| 기능 | 설명 |
|------|------|
| 트리 전체 보기 | nodes/edges 기반 트리 구조 감상 |
| 순간 상세 보기 | video embed, moments, 메모 감상 |
| 감정 태그 확인 | 각 순간에 붙은 감정 태그 보기 |
| 이전/다음 순간 이동 | 연결된 순간들 사이 탐색 |
| 공유 링크 복사 | 내 트리로 가져가지 않고 링크만 복사 |
| (선택) 공감/좋아요 | 트리 또는 순간에 좋아요 표시 |
| (선택) 댓글 | 특정 순간에 댓글 남기기 |

### 5.2 불가능한 것 (Not Allowed)

| 기능 | 이유 |
|------|------|
| 노드 추가 | 데이터 변경 방지 |
| 노드 편집 | 데이터 변경 방지 |
| 노드 삭제 | 데이터 변경 방지 |
| 연결 수정 | edges 변경 방지 |
| 트리 정보 수정 | name, visibility 변경 방지 |
| 감정 태그 수정 | moments 변경 방지 |
| 메모 수정 | description/text 변경 방지 |

---

## 6. 필요한 최소 데이터

### 6.1 Tree 데이터

```javascript
{
  _id: string,           // 트리 ID
  name: string,          // 트리 제목
  nodes: array,          // 순간 배열
  edges: array,          // 연결 배열
  ownerId: string,       // 소유자 UID (표시용)
  visibility: string,    // "public" | "private" | "link"
  // 읽기 전용에서는 이 값들을 변경 불가
}
```

### 6.2 노드 데이터 (변경 불가)

```javascript
{
  id: number|string,
  title: string,
  date: string,
  videoId: string,
  moments: array,
  description: string
}
```

---

## 7. 현재 Flow A와의 연결 지점

### 7.1 기존 읽기 전용 로직

`src/editor-data.js:46-52`에 이미 존재:
```javascript
if (runtime.currentUser && data.ownerId && data.ownerId !== runtime.currentUser.uid) {
  runtime.isReadOnly = true;
  runtime.showToast('읽기 전용 모드입니다.');
}
```

### 7.2 확장 필요점

| 현재 | 필요한 확장 |
|------|------------|
| 에디터만 | 모바일 트리/상세로 확장 |
| 편집 버튼 숨김 | 추가: 노드 클릭 시 편집 모달 대신 상세만 표시 |
| Fork 버튼 표시 | 읽기 전용에서 "내 트리로 가져오기" 옵션 |

---

## 8. 필요한 화면/UI 차이

### 8.1 소유자 뷰 vs 읽기 전용 뷰

| 구분 | 소유자 (편집 가능) | 읽기 전용 (타인) |
|------|------------------|-----------------|
| 상단 바 | 편집/삭제/공유 버튼 | 공유/복사 버튼만 |
| 노드 클릭 | 편집 모달 열림 | 상세 보기만 |
| 하단 네비게이션 | 편집/설정 | 감상/공감만 |
| Fork 버튼 | 없음 | "내 트리로 가져오기" 표시 |

### 8.2 모바일 트리 (mobile-tree.html)

| 현재 | 읽기 전용 |
|------|----------|
| "+" 버튼으로 순간 추가 | "+" 버튼 숨김 |
| 편집 모달 | 상세 보기만 |
| 트리 정보 편집 | 편집 버튼 숨김 |

### 8.3 순간 상세 (memory-detail.html)

| 현재 | 읽기 전용 |
|------|----------|
| 편집 버튼 | 편집 버튼 숨김 |
| 삭제 버튼 | 삭제 버튼 숨김 |
| 감정 태그 편집 | 편집 불가, 보기만 |

---

## 9. 구현 시 리스크

### 9.1 권한 우회 리스크
- **위험**: URL 파라미터로 `mode=view` 조작 시 데이터 수정 시도
- **방지**: 서버 측에서 ownerId != currentUserUid时请 求은 mutation 못하게 validation

### 9.2 데이터 노출 리스크
- **위험**: 비공개 트리도 URL로 접근 가능해지는 경우
- **방지**: visibility = "private"인 트리는 공유 불가하게 validation

### 9.3 UX 혼란
- **위험**: 소유자와 읽기 전용의 구분이 모호함
- **방지**: "읽기 전용입니다" 배너 또는 뱃지 명확히 표시

---

## 10. 다음 라운드 최소 구현 범위

### 10.1 Phase 1: 읽기 전용 트리 감상 (MVP 후반 1)

| 항목 | 설명 |
|------|------|
| URL 파라미터 | `?mode=view` 또는 자동 감지 |
| 뷰切り替え | 소유자/타인 구분 UI |
| 노드 편집 차단 | 편집 버튼 숨김 |
| 상세 보기 | 읽기 전용 상세 페이지 |
| 공유 링크 복사 | Navigator.share 또는 클립보드 복사 |

### 10.2 Phase 2: 공감/댓글 (MVP 후반 2)

| 항목 | 설명 |
|------|------|
| 좋아요 | 트리 또는 순간별 좋아요 |
| 댓글 | 순간별 댓글 (선택적) |
| 표시 | "N명의 팬이 감상 중" 같은 sociais 증거 |

### 10.3 Phase 3: Fork (추후)

| 항목 | 설명 |
|------|------|
| 가져오기 | 읽기 전용 트리를 내 트리로 복제 |
| 연결 표시 | " forked from Original" 표시 |

---

**참조:**
- `docs/product/PRODUCT_IDENTITY.md` - 제품 정체성
- `docs/product/USER_FLOW.md` - 사용자 흐름
- `docs/plans/NEXT_BUILD_QUEUE.md` - 실행 큐
- `frontend-concept-v2/community-tree-detail.html` - 시안