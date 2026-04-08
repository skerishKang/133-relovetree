# Playwright E2E Expansion Plan

> 최종 업데이트: 2026-04-09
> 작성자: Claude

---

## 1. 현재 커버 범위

### smoke.spec.js 테스트 목록 (6개)

| # | 테스트 이름 | 페이지 | 검증 내용 |
|---|------------|--------|-----------|
| 1 | Home Page: Visual Consistency & Search presence | index | title, search/settings 버튼, 그리드 컨테이너 |
| 2 | Community Page: Result listing | community | posts 컨테이너 존재 |
| 3 | Owner Page: Management dashboard shell | owner | trees list, create 버튼 |
| 4 | Editor Page: Loading and Basic Interaction (TDZ Check) | editor | mode toggle 버튼, add node 버튼, 에러 없음 |
| 5 | Editor Page: Add node interaction | editor | add node 클릭, 에러 없음 |
| 6 | Admin Page: Login presence | admin | loginOverlay 존재 |

### 현재 특징

- ✅ Console error tracking 포함
- ✅ Page error tracking 포함
- ✅ 다중 브라우저 (Chrome/Firefox/Safari)
- ✅ Production URL 기준 (`https://lovetree.limone.dev`)

---

## 2. 페이지별 부족한 테스트

### index.html

| 부족한 테스트 | 우선순위 | 이유 |
|-------------|----------|------|
| 검색 모달 열기/검색어 입력 | **높음** | 핵심 사용자 플로우 |
| 검색 결과 선택 → editor 이동 | **높음** | 검색 결과 동작 확인 |
| 생성 모달 열기 | **높음** | 새 트리 생성 플로우 |
| 설정 모달 열기/탭 전환 | **중간** | 사용자 설정 |
| Pro 버튼 presence | **낮음** | 결제 관련, smoke에서는 생략 가능 |

### community.html

| 부족한 테스트 | 우선순위 | 이유 |
|-------------|----------|------|
| 게시글 상세 보기 클릭 | **높음** | 핵심 플로우 |
| 댓글 입력/작성 | **높음** | 커뮤니티 핵심 기능 |
| 글 작성 모달 열기 | **높음** | 새 게시글 |
| media (이미지/동영상) 로드 | **중간** | 시각적 검증 |

### owner.html

| 부족한 테스트 | 우선순위 | 이유 |
|-------------|----------|------|
| 트리 카드 클릭 → editor 이동 | **높음** | 핵심 플로우 |
| rename dialog 열기/저장 | **높음** | 관리자 핵심 기능 |
| delete dialog 열기/확인 | **높음** | 데이터 삭제 |
| 필터/검색 작동 | **중간** | 목록 탐색 |
| fork 상태 표시 확인 | **낮음** | 부가 기능 |

### editor.html

| 부족한 테스트 | 우선순위 | 이유 |
|-------------|----------|------|
| 노드 추가 후 저장 | **높음** | 핵심 편집 기능 |
| timeline mode 전환 | **높음** | 주요 UI 전환 |
| 상세 모달 열기 | **높음** | 노드 편집 |
| 드래그/줌 동작 | **중간** | 시각적 검증,脆弱할 수 있음 |
| 좋아요/댓글 버튼 | **낮음** | 로그인 필요, smoke에서는 생략 |

### admin.html

| 부족한 테스트 | 우선순위 | 이유 |
|-------------|----------|------|
| 로그인 후 대시보드 로드 | **높음** | admin 진입 |
| 탭 전환 (trees/users/stats/AI) | **높음** | 관리자 핵심 기능 |
| 사용자 목록 확인 | **높음** | 사용자 관리 |
| 통계 표시 확인 | **중간** | stats 탭 |
| AI 로그 확인 | **낮음** | 부가 기능 |

---

## 3. Selector 개선 후보

### 현재 문제점

| 현재 Selector | 문제 | 개선 제안 |
|--------------|------|----------|
| `#search-btn, [aria-label*="검색"]` | 복수 선택자, 첫 번째 요소 의존 | `#search-btn` 단일 사용 권장 |
| `button:has-text("만들기")` | 텍스트 기반, 비 inúmer이 Localization | `data-testid="create-tree"` 추가 |
| `[class*="grid"]` | 너무 넓은 매칭, 다른 grid 요소 포함 가능 | `#artist-cards-container` 사용 |
| `[data-testid="trees-list"]` | 존재하지 않음 | 실제 DOM에서 확인 필요 |

### 권장 접근

```javascript
// Bad
page.locator('button:has-text("추가")')

// Good  
page.locator('#add-node-btn')

// Best - HTML에 data-testid 추가
page.locator('[data-testid="add-node"]')
```

### HTML 수정 필요 (앱 코드 변경)

index.html, editor.html 등에 다음 data-testid 추가 권장:
- `#search-btn` → 이미 ID 존재
- `#settings-btn` → 이미 ID 존재
- 생성 버튼 → `data-testid="create-tree"`
- 추가 버튼 → `data-testid="add-node"`
- 모드 토글 → `data-testid="toggle-mode"`

---

## 4. 우선순위 1~5 (ROI 기준)

### Priority 1: 가장 높은 ROI (즉시 추가 권장)

1. **index: 검색 모달 열기** - 사용자 진입 핵심
2. **index: 생성 모달 열기** - 핵심 기능
3. **editor: 노드 추가 후 저장** - 트리 편집 필수

### Priority 2: 높음 (다음 스프린트)

4. **community: 글 작성** - 커뮤니티 핵심
5. **owner: rename/delete dialog** - 관리자 필수

### Priority 3: 중간 (차후)

6. **editor: timeline mode 전환** - 주요 UI
7. **admin: 탭 전환** - 관리자 필수

### Priority 4: 낮음 (조건부)

8. **community: 댓글 입력** - 로그인 필요
9. **editor: 드래그/줌** - 불안정할 수 있음

### Priority 5: 생략 가능 ( Smoke에서 )

10. **Pro 버튼** - 결제 플로우, 별도 테스트 필요
11. **좋아요/댓글** - 로그인 필요, 별도 시나리오

---

## 5. 테스트 코드 예시 (구현 시 참고)

```javascript
// 예시: 검색 모달 테스트
test('Home Page: Open search modal', async ({ page }) => {
  await page.goto('/');
  
  const searchBtn = page.locator('#search-btn');
  await searchBtn.click();
  
  // 모달 열림 확인
  const modal = page.locator('#search-modal, [role="dialog"]:has-text("검색")');
  await expect(modal).toBeVisible();
  
  // 검색어 입력
  const input = page.locator('#search-input, input[placeholder*="검색"]');
  await input.fill('BTS');
  await input.press('Enter');
  
  // 결과 존재 확인 (선택)
  await page.waitForTimeout(1000);
});

// 예시: 생성 모달
test('Home Page: Open create modal', async ({ page }) => {
  await page.goto('/');
  
  // 로그인 필요할 수 있음
  const createBtn = page.locator('#btn-create, #create-btn');
  await createBtn.click();
  
  const modal = page.locator('#create-modal, [role="dialog"]:has-text("누구")');
  await expect(modal).toBeVisible();
});
```

---

## 6. 실행 메모

### 로컬에서 테스트 실행

```bash
npx playwright test
# 또는 특정 파일
npx playwright test tests/smoke.spec.js
```

### 특정 브라우저만

```bash
npx playwright test --project=chromium
```

###_TRACE_

```bash
npx playwright test --trace on
```

---

## 7. 다음 작업

1. **앱 코드 수정 없이** selector 안정화 (있는 ID 사용)
2. **Priority 1** 테스트 3개 구현
3. **Priority 2** 테스트 2개 구현 (다음 스프린트)
4. 필요 시 HTML에 data-testid 추가 요청 (앱 팀)

---

## 8. 참고

- `tests/smoke.spec.js` - 현재 테스트
- `playwright.config.js` - 설정 (production URL)
- `docs/analysis/FIRESTORE_COMPAT_ANALYSIS.md` - onSnapshot polling 고려 (실시간 테스트 제외)
