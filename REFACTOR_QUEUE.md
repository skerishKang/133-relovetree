# Next Refactor Queue

**작성**: 2026-04-08

---

## 1순위: editor.html (3269줄)

가장 큼 + 에디터 핵심.从这里부터.

**떼어낼 것 (순서)**:
1. **Video Player** (`startVideo`, YouTube iframe 로직)
2. **AI Helper** (`callAiHelperApi`, OpenAI/Gemini 호출)
3. **Data I/O** (`loadData`, `saveDataImmediate`, Firestore 통신)

→ `src/editor/` 폴더로

---

## 2순위: admin.js (2105줄)

통계/사용자 관리. 에디터보다 단순 but 보안 중요.

**떼어낼 것**:
1. **Stats/Analytics** (`loadAdminStats`, 대시보드 데이터)
2. **User Management** (`loadAllUsers`, 사용자 CRUD)
3. **Demo Seeder** (`createDemoData`)

→ `src/admin/` 폴더로

---

## 3순위: community.js (1532줄)

비즈니스 로직 많음. admin보다 낮음.

**떼어낼 것**:
1. **Post/Comment CRUD** (`loadCommunityPosts`, `loadCommunityComments`)
2. **Tree Picker** (`loadMyTreesForCommunity`)
3. **Moderation Logging**

→ `src/community/` 폴더로

---

## 4순위: owner.js (1243줄)

가장 작음. community와 중복 로직 많음.

**떼어낼 것**:
1. **Fork Manager** (포크 업데이트/동기화)
2. **Tree CRUD** (트리 생성/삭제/이름변경)

→ `src/owner/` 또는 `src/backup/` (fork는 백업 영역)

---

## 실행순서

```
editor.html → admin.js → community.js → owner.js
```

每 파일당 2~3개 모듈 떼어내면 1~2주 작업 분량.