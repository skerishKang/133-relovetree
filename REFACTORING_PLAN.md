# Relovetree 리팩토링 분할안

## 1. 현재 대형 파일 분석 요약

| 파일 | 라인 수 | 주요 기능 영역 |
|------|---------|----------------|
| `index.js` | ~1800+ | 검색, 사용자 인증, 트리 로딩/렌더링, 인기 아티스트, 언어 설정, 모달, 로딩/성능, 모바일 메뉴 |
| `admin.js` | ~2000+ | 관리자 인증, 트리 관리(목록/상세/노드 편집), 사용자 관리(CRUD/역할/필터), 데모 데이터 생성, 통계, AI 로그 |
| `community.js` | ~1500+ | 게시글 CRUD, 댓글 관리, 트리 선택기, 필터/정렬, moderation 로깅, 트리 포크 |
| `owner.js` | ~1250+ | 트리 관리 CRUD, 포크 시스템(업데이트 확인/동기화), UI 상태 관리(검색/정렬/페이지네이션), 알림 |
| `src/shared.js` | ~894 | 설정, 유틸리티(debounce/throttle), 전역 레이아웃 주입, 검증 함수, DOM 유틸, YouTube 도우미, 로컬스토리지, Firebase 초기화 |
| `editor.html` (인라인) | ~2000+ | 캔버스 렌더링, 노드/엣지 관리, 영상 플레이어, 모먼트 시스템, AI 도우미, 미니맵, 줌/패닝 |

---

## 2. 권장 분할 단위

### 2.1 API/Data Access Layer (`src/api/`)

**목적**: Firestore와 통신하는 모든 로직을 캡슐화

```
src/api/
├── tree-api.js        # 트리 CRUD (trees 컬렉션)
├── user-api.js        # 사용자 정보 조회/업데이트
├── auth-api.js        # 인증 관련 API (공유)
└── community-api.js   # 커뮤니티 posts/comments
```

**추출 대상**:
- Firestore 쿼리 (`db.collection('trees').where(...)`)
- 데이터 정규화 로직 (`normalizeTreeItem`, `normalizeCommunityTreeItem`)
- 페이지네이션 로직

---

### 2.2 Auth/Session Helpers (`src/auth/`)

**목적**: 인증 상태 관리 및 세션 유틸리티 분리

```
src/auth/
├── auth-helpers.js    # getCurrentUser, ensureLoggedIn, waitForAuth
├── session-manager.js # 세션 상태 관리 (owner.js의 ownerUser 패턴)
└── role-helper.js     # 권한 확인 (isAdminUserForCommunity, checkAdminRole)
```

**추출 대상**:
- `getCurrentUser()`, `ensureLoggedIn()` (index.js)
- `getCurrentUserForCommunity()` (community.js)
- `isAdminUserForCommunity()` (community.js)

---

### 2.3 Modal UI Components (`src/components/`)

**목적**: 재사용 가능한 모달 및 UI 컴포넌트

```
src/components/
├── modal-utils.js     # closeModal, openModal 유틸
├── toast.js           # showToast, ownerShowToast 통합
├── loading.js         # showLoading, hideLoading
└── error-display.js   # showError, hideError (shared.js에서 이동)
```

**현재 상태**: 이미 `shared.js`에 부분적으로 존재하지만, 파일별 중복 발견:
- `showError()`: index.js와 shared.js 양쪽에 존재 가능성
- `showToast()`: index.js와 owner.js에 각각 다른 구현

---

### 2.4 Theme/Background Settings (`src/theme/`)

**목적**: 배경 테마 설정 관리

```
src/theme/
├── background-manager.js  # 배경 이미지/색상 설정
└── theme-preferences.js   # 사용자 테마偏好 저장
```

**추출 대상** (shared.js):
- `applyGlobalBackgroundPreference()`
- `bindGlobalBackgroundPreferenceSync()`
- `safeLocalStorageGet('relovetree_background')`

---

### 2.5 Backup/Import/Export (`src/backup/`)

**목적**: 데이터 백업 및 마이그레이션

```
src/backup/
├── local-migration.js  # migrateLocalTreesToAccount (index.js)
├── fork-manager.js     # 포크 시스템 (owner.js에서 이동)
│                      # - checkForkUpdateStatus
│                      # - forkSync
│                      # - runOwnerForkAutoCheck
└── data-export.js     #今後のエクスポート機能用
```

---

### 2.6 Tree Editor Core (`src/editor/`)

**목적**: 에디터 핵심 기능 분리 (가장 큰 변경 필요)

```
src/editor/
├── canvas-renderer.js  # 캔버스 렌더링, 노드/엣지 그리기
├── node-manager.js     # 노드 CRUD (createNewNode, deleteNode)
├── moment-system.js    # 모먼트 추가/편집/삭제
├── video-player.js     # YouTube 영상 플레이어 관리
├── ai-helper-client.js # AI 도우미 API 호출
├── minimap.js         # 미니맵 기능
└── state-manager.js   # state 객체 관리 (transform, nodes, edges)
```

**현재 상태**: `editor.html` 인라인 스크립트 전체 (~2000줄)
- 별도 파일로 분리 시 `index.html`에서 로드 필요

---

### 2.7 Community Features (`src/community/`)

**목적**: 커뮤니티 관련 기능 캡슐화

```
src/community/
├── post-manager.js    # 게시글 CRUD (community.js에서)
├── comment-manager.js # 댓글 CRUD
├── tree-picker.js     # 트리 선택기 로직
├── moderation.js      # moderation 로깅
└── filter-sort.js     # 검색/필터/정렬 로직
```

---

### 2.8 Admin Features (`src/admin/`)

**목적**: 관리자 기능 캡살화

```
src/admin/
├── dashboard-stats.js  # 통계 로딩/표시
├── user-manager.js     # 사용자 관리 CRUD
├── tree-manager.js     # 관리자용 트리 관리
├── demo-seeder.js      # 데모 데이터 생성
└── ai-log-viewer.js    # AI 로그 조회
```

---

## 3. 우선순위 권장사항

### 🔴 P0 - 지금 당장 쪼개야するもの (즉시 작업)

| 모듈 | 이유 | 영향도 |
|------|------|--------|
| **shared.js 유틸리티 통합** | 중복 코드 제거, 일관성 확보 | 높음 |
| **Modal/Error/toast 통합** | UX 불일치 해결 | 중간 |
| **tree-api.js 추출** | DB 마이그레이션 필수 선행 | 높음 |

### 🟠 P1 - DB 마이그레이션 직전에 쪼개면 되는 것

| 모듈 | 이유 | 영향도 |
|------|------|--------|
| **src/auth/** | Auth provider 변경 시 영향 최소화 | 높음 |
| **src/editor/** | UI 로직과 데이터 로직 분리 필수 | 높음 |
| **src/community/** | 커뮤니티 기능 독립화 | 중간 |

### 🟡 P2 - 나중에 해도 되는 것

| 모듈 | 이유 | 영향도 |
|------|------|--------|
| **src/theme/** | 시각적 기능,紧急성 낮음 | 낮음 |
| **src/backup/** | 백업 기능은 핵심 아님 | 중간 |
| **src/admin/** | 관리자 페이지, 사용자 영향 없음 | 낮음 |

---

## 4. 제안 폴더 구조

```
133-relovetree/
├── index.html          # 홈 (필요시 src/pages/home.js 로드)
├── admin.html          # 관리자
├── community.html      # 커뮤니티
├── owner.html          # 오너 콘솔
├── editor.html         # 에디터
│
├── src/
│   ├── shared.js       # 핵심 공유 (APP_CONFIG, 기본 유틸)
│   │
│   ├── api/           # 데이터 접근 계층 (P0/P1)
│   │   ├── tree-api.js
│   │   ├── user-api.js
│   │   └── community-api.js
│   │
│   ├── auth/          # 인증 계층 (P1)
│   │   ├── auth-helpers.js
│   │   └── session-manager.js
│   │
│   ├── components/    # UI 컴포넌트 (P0)
│   │   ├── modal.js
│   │   ├── toast.js
│   │   └── loading.js
│   │
│   ├── editor/        # 에디터 핵심 (P1)
│   │   ├── canvas-renderer.js
│   │   ├── node-manager.js
│   │   ├── video-player.js
│   │   └── moment-system.js
│   │
│   ├── community/     # 커뮤니티 (P1)
│   │   ├── post-manager.js
│   │   └── comment-manager.js
│   │
│   ├── theme/         # 테마 (P2)
│   │   └── background.js
│   │
│   ├── admin/         # 관리자 (P2)
│   │   └── dashboard.js
│   │
│   └── backup/        # 백업/마이그레이션 (P2)
│       └── fork-manager.js
│
└── netlify/functions/  # 기존 백엔드 (유지)
```

---

## 5. 파일 이동 계획

### Phase 1: shared.js 확장이 아닌 분리 (가장 안전)

1. **shared.js에서 유틸리티 분리**
   - `src/utils/debounce.js` (이미 유틸리티는 있으나 확장)
   - `src/utils/time.js` (formatRelativeTime, formatDateTimeFull)
   - `src/utils/storage.js` (safeLocalStorage* 모음)

2. **index.js에서 추출**
   - → `src/api/tree-api.js` (검색, 로딩 관련)
   - → `src/components/toast.js` (showToast 통합)

3. **owner.js에서 추출**
   - → `src/backup/fork-manager.js`
   - → `src/utils/time.js` (이미 owner.js에 날짜 포맷 로직 다수)

### Phase 2: editor.html 인라인 분리 (변경사항 큼)

1. **editor.html에서 `<script>` 블록들을 별도 파일로**
   - `src/editor/core.js` - state, render, event handlers
   - `src/editor/video.js` - YouTube player 관련
   - `src/editor/ai.js` - AI helper 관련

2. **index.html에 script 로드 추가**

### Phase 3: 기능 모듈화

1. **community.js → src/community/**
2. **admin.js → src/admin/** (필요시)

---

## 6. 위험 포인트

| 위험 요소 | 완화 방안 |
|-----------|-----------|
| **전역 함수 중복** | 사용처를 모두 확인한 후 한 곳으로 통합 |
| **Firestore 의존성** | API layer를 통해 추상화 (DB 마이그레이션 시 유연성) |
| **기존 로직 변경** | 동작 변경 없이 파일 이동만 수행 (apply_patch 기준) |
| **인라인 스크립트 변경** | editor.html 구조를 유지하면서 script src만 추가 |
| **테스트 부재** | 통합 테스트 수행 전까지 기능 변경 금지 |

---

## 7. 실행하지 않을 것 (제약사항)

- ❌ React/Next.js 전환
- ❌ 바닐라 JS 구조 근본적 변경
- ❌ 기존 다른 작업자의 변경 되돌리기
- ❌ 기능 변경 (리팩토링만 수행)
- ❌ 스타일 변경

---

## 8. 다음 단계 (필요시)

1. **Phase 1 구현 시**:
   - `src/utils/` 폴더 생성
   - shared.js에서 중복 유틸리티 추출
   - 각 페이지 JS 로드 경로 조정

2. **Phase 2 구현 시**:
   - editor.html 구조 변경 필요
   - HTML 스크립트 로드 순서 중요
   - 테스트 필수

3. **DB 마이그레이션 준비 시**:
   - `src/api/` 계층을 먼저 구현
   - Firestore 호출을 추상화하여 Supabase 등으로 교체 용이하게