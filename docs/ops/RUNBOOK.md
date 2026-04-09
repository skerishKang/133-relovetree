# Relovetree Runbook

> 최종 업데이트: 2026-04-09

## 1. 저장소/배포 기준점

- **GitHub 원격**: `origin -> git@github.com-padiem:skerishKang/133-relovetree.git`
- **운영 도메인**: `https://lovetree.limone.dev`
- **Netlify Site ID**: `5aaf0176-4c32-43f3-8e10-fc209e5c17fa`
- **Fossil**: 로컬 병행 사용, Git 배포와는 별도

### ⚠️ 데이터 아키텍처 주의사항

**신규 기여자가 가장 많이 혼란스러워하는 부분입니다.**

```
┌─────────────────────────────────────────────────────────────────┐
│ 클라이언트는 Firestore 코드를 쓰지만, 데이터는 Neon Postgres에 저장됨 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   클라이언트 코드          │  실제 저장소                        │
│   ─────────────────────────────────────────────────────────    │
│   db.collection('trees')   │  Neon/PostgreSQL                    │
│   .where(...)            │  tables: users, trees, ...          │
│   .get()                 │                                     │
│                          │  Firestore에는 실제 데이터가 없음    │
│                          │  - Auth만 Firebase                  │
│                          │  - 모든 앱 데이터는 Neon            │
└─────────────────────────────────────────────────────────────────┘
```

**왜 이런 구조인가?**
1. 원래 Firebase (Auth + Firestore)로 시작
2. 이후 Neon/Postgres로 마이그레이션
3. 프론트 코드 변경 최소화를 위해 Firestore 호환 레이어(`firebase-firestore-compat.js`) 유지

**기여 시 기억할 것**
- `firestore-api.js` → Neon Postgres로 연결됨
- `firebase.firestore()` 호출 → 실제로는 compat 레이어가 중재
- 데이터 조회/저장 문제 → Postgres 테이블/쿼리 확인
- 인증 문제 → Firebase Auth 확인
- **신규 코드는 alias 경로 우선**: 클라이언트 → `postgres-client.js`, 서버 → `db-api.js`
- 기존 `firebase-firestore-compat.js` / `firestore-api.js` 직접 import는 신규 코드에서 금지

**자세한 분석**: [docs/analysis/FIRESTORE_COMPAT_ANALYSIS.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/analysis/FIRESTORE_COMPAT_ANALYSIS.md)

## 2. Git 작업

### 상태 확인

```bash
git status --short
git log --oneline -5
```

### 커밋

```bash
git add -A
git commit -m "type: short summary"
```

### 푸시

```bash
git push origin main
```

### 주의

- `_FOSSIL_`, `relovetree.local.fossil`은 Fossil 메타입니다.
- Git 커밋에는 보통 포함하지 않습니다.

## 3. Netlify 연결/확인

### 현재 링크 상태 확인

```bash
netlify status
```

출력에서 확인할 것:
- Current project: `133-relovetree`
- Project URL: `https://lovetree.limone.dev`
- Project Id: `5aaf0176-4c32-43f3-8e10-fc209e5c17fa`

### 환경변수 확인

```bash
netlify env:list
```

필수 서버 env:
- `DATABASE_URL`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `GEMINI_API_KEYS` (fallback)
- `GROQ_API_KEY` (primary)
- `AI_PROVIDER` (기본: groq)
- `ADMIN_EMAILS`

선택/기능별 env:
- `YOUTUBE_API_KEY`
- `YOUTUBE_API_REFERER`
- `TOSS_SECRET_KEY`
- `TOSS_PRO_AMOUNT`

## 4. Netlify 배포

### 프로덕션 배포

```bash
netlify deploy --prod
```

### 배포 후 확인

1. `https://lovetree.limone.dev`
2. `https://lovetree.limone.dev/pages/community.html`
3. `https://lovetree.limone.dev/pages/owner.html`
4. `https://lovetree.limone.dev/pages/editor.html`
5. `https://lovetree.limone.dev/pages/admin.html`

## 5. 런타임 설정

### 클라이언트 런타임 메타

각 페이지에는 아래 메타가 들어갈 수 있습니다.

- `relovetree-payment-client-key`
- `relovetree-app-check-site-key`

현재 코드:
- 값이 없으면 결제 비활성
- 값이 없으면 App Check 초기화 안 함

즉 운영에서 실제 값을 넣기 전까지는 안전한 비활성 상태입니다.

## 6. Firebase / App Check

### 현재 상태

- 코드상 선택적 초기화만 구현됨
- 실제 활성화는 Firebase Console에서 별도 작업 필요

### 실제로 필요한 것

1. Firebase Console에서 App Check 활성화
2. 사이트 키 발급
3. `relovetree-app-check-site-key`에 주입

## 7. 결제

### 현재 상태

- 코드 구현 완료
- 기본값은 비활성

### 실제 활성화 조건

1. 서버:
   - `TOSS_SECRET_KEY`
   - `TOSS_PRO_AMOUNT`
2. 클라이언트:
   - `relovetree-payment-client-key`

## 8. Fossil 작업

### Windows PowerShell 권장

```powershell
cd G:\Ddrive\BatangD\task\workdiary\133-relovetree
fossil info
fossil changes
fossil status
fossil diff --brief
```

### 커밋

```powershell
fossil commit -m "type: short summary"
```

### 주의

- WSL에서는 Fossil 상태 명령이 느리거나 멈출 수 있습니다.
- Fossil 정리는 Windows 네이티브에서 하는 쪽이 더 안정적입니다.

## 9. 최종 QA

### Playwright smoke

```bash
npm run test
```

### 실도메인 수동 QA

확인할 것:
- 홈 검색/설정 모달
- 커뮤니티 목록/상세
- 오너 테이블/정렬
- 에디터 로드/모드 토글
- 어드민 로그인 오버레이/대시보드

## 10. 세션 넘길 때 남길 정보

다음 세션에 최소한 이 4개는 남겨두면 좋습니다.

1. 마지막 Git 커밋 해시
2. Netlify 배포 반영 여부
3. Fossil 커밋 여부
4. 아직 안 넣은 운영값
   - payment client key
   - app check site key

## 11. 테스트 계정 운영 원칙

유지 중인 QA 계정:

| 계정 | 가상 아이디 | 용도 |
|------|-------------|------|
| `qa.relovetree.20260409@gmail.com` | 테스트 러버 A | 반복 QA |
| `qa-playwright-2@example.com` | 테스트 러버 B | 반복 QA |
| `qa-subagent-test@limone.dev` | 테스트 러버 C | 에이전트 테스트 |

이 계정들은 반복 검증용으로 유지합니다. 삭제보다 재사용을 우선합니다.

### 공개 참여 규칙

- 커뮤니티 글/댓글/트리 생성 등 실제 사이트 참여 시에는 **실이메일을 직접 노출하지 않습니다.**
- 테스트 계정은 항상 **가상 아이디(`displayName`)를 먼저 지정한 뒤** 사용합니다.
- 권장 형식:
  - `테스트 러버 A`
  - `테스트 러버 B`
  - `테스트 러버 C`

### 이유

- 현재 일부 화면은 `displayName`이 없으면 `email`을 fallback으로 표시할 수 있습니다.
- 따라서 QA 계정으로 실제 사용자 흐름을 검증할 때도, 공개 표시는 가상 아이디 기준으로 맞춰 두는 것이 안전합니다.
