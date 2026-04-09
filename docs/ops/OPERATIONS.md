# Relovetree Operations Guide

> 최종 업데이트: 2026-04-09

## Production Environment

- **URL**: https://lovetree.limone.dev
- **Platform**: Netlify
- **Database**: Neon (PostgreSQL)
- **Auth**: Firebase Auth
- **Backend**: Netlify Functions (Node.js)
- **Runbook**: [docs/ops/RUNBOOK.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/ops/RUNBOOK.md)

### 데이터 흐름 이해 (중요)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        클라이언트 (브라우저)                          │
│                                                                      │
│  ┌─────────────┐    ┌──────────────────────────────────────┐         │
│  │ Firebase    │    │ Firestore 호환 레이어                │         │
│  │ Auth SDK    │    │ (firebase-firestore-compat.js)       │         │
│  │             │    │ - Firestore API와 동일한 인터페이스    │         │
│  │ 로그인/세션  │    │ - 실제로는 Netlify Functions 호출    │         │
│  └──────┬──────┘    └──────────────┬───────────────────────┘         │
│         │                        │                                  │
│         │ ID Token               │ POST /.netlify/functions/...    │
│         │                        ▼                                  │
└─────────┼──────────────────────────────────────────────────────────┘
          │                        │
          ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Netlify Functions                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ firestore-api.js                                            │     │
│  │ - Firebase ID Token 검증 (Auth 확인)                       │     │
│  │ - 권한 판정 (admin/free/pro role)                           │     │
│  │ - document-store.js 호출                                    │     │
│  └─────────────────────┬───────────────────────────────────────┘     │
│                        │                                             │
│                        ▼ SQL 쿼리                                   │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ document-store.js                                           │     │
│  │ - Postgres CRUD 구현                                        │     │
│  │ - Firestore FieldValue 변환 (serverTimestamp, increment 등) │     │
│  └─────────────────────┬───────────────────────────────────────┘     │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Neon (PostgreSQL)                              │
│                                                                      │
│  Tables: users, trees, tree_comments, community_posts,              │
│          community_comments, ai_logs, ...                             │
│                                                                      │
│  - 실제 데이터는 payload (jsonb) 컬럼에 저장                          │
│  - 인덱싱 필드는 dedicated columns (id, role, name 등)               │
└──────────────────────────────────────────────────────────────────────┘
```

### 중요: "Firestore처럼 보이지만 Neon으로 간다"

| 단계 | 뭐가 보이나 | 실제로 무엇 |
|------|------------|------------|
| **1. 클라이언트 코드** | `firebase.firestore().collection('trees').get()` | Firestore 호환 레이어가 fetch로 변환 |
| **2. API 호출** | POST `/.netlify/functions/firestore-api` | Netlify Function 실행 |
| **3. 인증** | Firebase ID Token 검증 | Firebase Auth만 사용 |
| **4. 데이터** | Firestore 문서처럼 보임 | **Neon Postgres의 row** |

**왜 이렇게 했나요?**
- 원래 Firestore를 사용했으나 Neon/Postgres로 마이그레이션함
- 프론트엔드 코드 변경을 최소화하기 위해 Firestore API 호환 레이어 유지
- 새 기여자는 `firebase-firestore-compat.js`를 보면서 "아, 이건 어댑터구나"로 이해

**신규 코드 작성 규칙 (필수)**

신규 코드에서는 alias 경로를 우선 사용합니다:
- **클라이언트**: `import { db } from './postgres-client.js'` (기존 `firebase-firestore-compat.js` 직접 import 금지)
- **서버**: `const { queryPostgresCollection, getPostgresDoc } = require('./db-api')` (기존 `firestore-api` 직접 require 금지)
- 기존 코드는 변경하지 않으며, Phase C에서 단계 전환 예정

상세 규칙: [docs/plans/DATABASE_NAMING_MIGRATION_PLAN.md §4](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/plans/DATABASE_NAMING_MIGRATION_PLAN.md)

**상세 분석**: [docs/analysis/FIRESTORE_COMPAT_ANALYSIS.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/analysis/FIRESTORE_COMPAT_ANALYSIS.md)

---

## Netlify Required Environment Variables

### Production Context (필수)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ✅ | Firebase service account for admin SDK |
| `GEMINI_API_KEYS` | Fallback | Google Gemini API keys (comma-separated) |
| `AI_PROVIDER` | Optional | AI provider: `groq` (default) or `gemini` |
| `GROQ_API_KEY` | Optional | Groq API key (primary when AI_PROVIDER=groq) |
| `YOUTUBE_API_KEY` | ✅ | YouTube Data API v3 key |
| `YOUTUBE_API_REFERER` | Recommended | Referer header for YouTube API |
| `TOSS_SECRET_KEY` | For payment | Toss Payments secret key (production) |
| `TOSS_PRO_AMOUNT` | Optional | Server-side expected amount for Pro verification |
| `ADMIN_EMAILS` | Legacy only | Historical allowlist env (current server 권한은 DB role 기준) |

### 확인 방법

```bash
netlify env:list
```

### 설정 방법

```bash
# Production context에 설정
netlify env:set DATABASE_URL "postgresql://..." --context production

# Runtime만 필요 (functions용)
netlify env:set DATABASE_URL "postgresql://..." --scope runtime
```

---

## Local Dev vs Production Differences

### Local Development

```bash
# .env 파일 기준
netlify dev
# → env_file = ".env" 사용
# → DATABASE_URL = .env의 값
```

### Production

```bash
netlify deploy --prod
# → Netlify Dashboard env 사용
# → .env는 빌드 시에만 사용 (env_file = ".env")
```

### 구체적 차이 예시

| 항목 | Local (.env) | Production (Dashboard) |
|------|-------------|------------------------|
| `DATABASE_URL` | `postgresql://...neondb?sslmode=require` | 동일해야 함 |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 로컬 JSON 파일 | Netlify env에 동일 내용 |
| `ADMIN_EMAILS` | Optional legacy | 더 이상 권한 판정 source of truth 아님 |
| `TOSS_PRO_AMOUNT` | Optional | `9900` |
| env_file 참조 | netlify.toml의 `env_file = ".env"` | 무시됨 |

### ⚠️ 주의사항

- **env_file은 local build용**: production에서는 Dashboard env가 source
- **local에서没问题不等于 production没问题**: 항상 production 검증 필수
- **preview deploy**: production env 상속 여부 확인 필요

---

## Admin Account Operations

### 현재 운영 계정

- **Primary admin**: `skerish@naver.com`
- **Role source of truth**: DB `users.role = 'admin'`

### 테스트 유지 계정

| 계정 | 가상 아이디 | 용도 |
|------|-------------|------|
| `qa.relovetree.20260409@gmail.com` | 테스트 러버 A | 반복 QA |
| `qa-playwright-2@example.com` | 테스트 러버 B | 반복 QA |
| `qa-subagent-test@limone.dev` | 테스트 러버 C | 에이전트 테스트 |

**가상 아이디 규칙**:
- 실제 사이트에서 이메일 대신 표시
- PostgreSQL `users.display_name`에 저장
- Firebase Auth `displayName`도 동일하게 설정
- 패턴: `테스트 러버 {A,B,C,...}`

**운영 원칙**:
- 삭제보다 재사용 우선
- 테스트 시 displayName 먼저 확인
- 계정 생성 시 displayName 필수 지정

### Admin 판정 로직

**서버 (firestore-api.js)**:
1. DB `users.role = 'admin'` check

**클라이언트 (auth.js / admin entry)**:
1. DB `users.role = 'admin'` check
2. 서버 판정은 DB role 재확인

### 권장 운영 방식

1. DB `users.role`로 실제 admin 권한 관리
2. 클라이언트는 서버 ACL을 대체하지 않음
3. `ADMIN_EMAILS`는 과거 호환용 문서 항목으로만 유지하거나 제거 검토

### Role 종류

- `free`: 일반 사용자
- `pro`: Pro 사용자 (결제 완료)
- `admin`: 관리자

### 테스트 계정 공개 참여 원칙

- 테스트 계정이 커뮤니티/댓글/트리 작성에 참여할 때는 **실이메일을 직접 노출하지 않고 가상 아이디(`displayName`)를 사용**합니다.
- 기본 원칙:
  - 로그인 이메일 = 내부 QA 식별자
  - 화면 표시 이름 = 공개용 가상 아이디
- 권장 예시:
  - `테스트 러버 A`
  - `테스트 러버 B`
  - `QA Fan 1`

### 운영 메모

- 현재 UI는 `displayName`이 비어 있으면 `email`을 fallback으로 표시할 수 있습니다.
- 따라서 테스트 계정을 실제 사이트에서 활동시키려면, **반드시 `displayName`을 먼저 지정한 뒤** 글/댓글/트리를 생성하는 것을 권장합니다.
- 테스트 계정 정리 대상은 "삭제"보다 **공개 표시 이름 관리**를 우선합니다.

---

## Deployment Verification Checklist

### 1. 빌드 검증

```bash
npm run build
```

### 2. 함수 smoke 테스트

```bash
# queryCollection 테스트
curl -s -X POST https://lovetree.limone.dev/.netlify/functions/firestore-api \
  -H "Content-Type: application/json" \
  -d '{"op":"queryCollection","path":"trees","constraints":{"limit":1}}'

# 예상: {"ok":true,"docs":[...]}
```

```bash
# bogus token 테스트
curl -s -X POST https://lovetree.limone.dev/.netlify/functions/firestore-api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer bogus" \
  -d '{"op":"queryCollection","path":"trees","constraints":{"limit":1}}'

# 예상: {"error":"Authentication required","status":401}
```

### 3. 페이지 로드 검증

| Page | URL | Expected |
|------|-----|----------|
| index.html | https://lovetree.limone.dev/index.html | 200 OK, console error 없음 |
| community.html | https://lovetree.limone.dev/pages/community.html | 200 OK |
| owner.html | https://lovetree.limone.dev/pages/owner.html | 200 OK |
| editor.html | https://lovetree.limone.dev/pages/editor.html | 200 OK |
| admin.html | https://lovetree.limone.dev/pages/admin.html | 200 OK |

### 4. 브라우저 검증 (선택)

```bash
# Playwright로 콘솔 에러 확인
node scripts/dev/test-browser.js
```

### 검증 순서 (권장)

1. **빌드** → npm run build
2. **함수 smoke** → firestore-api queryCollection/getDoc/bogus token
3. **페이지 HTTP** → 5개 HTML 전부 200
4. **브라우저** → console error 없음 (선택)
5. **핵심 기능** → 로그인 → 트리 생성 → 에디터 열기 (수동)

---

## Known Issues Fixed

| Issue | Status | Date |
|-------|--------|------|
| DATABASE_URL 누락 | ✅ 해결 | 2026-04-09 |
| editorMode TDZ 버그 | ✅ 해결 | 2026-04-09 |
| payment server verification | ✅ 구현 | 2026-04-09 |
| admin-tree module 분리 | ✅ 완료 | 2026-04-08 |
| admin-users module 분리 | ✅ 완료 | 2026-04-08 |
| index 모달 분리 | ✅ 완료 | 2026-04-08 |
| index 렌더 분리 | ✅ 완료 | 2026-04-08 |
| index-runtime.js 분리 | ✅ 완료 | 2026-04-09 |
| Playwright smoke 강화 | ✅ 완료 | 2026-04-09 |
| index.html 2차 분석 | ✅ 완료 | 2026-04-09 |
| Fossil Windows 정상 | ✅ 확인됨 | 2026-04-09 |

---

## Quick Commands

```bash
# Production 배포
netlify deploy --prod

#-env 확인
netlify env:list

# 함수 로그 확인
netlify functions:log firestore-api

# 함수 직접 호출
netlify functions:invoke firestore-api --payload '{"op":"getDoc","path":"trees/test"}'
```

---

## Version Control Notes

- **Git** is the deployment source of truth.
- **Fossil** is maintained separately for local/history workflows.
- `_FOSSIL_`, `relovetree.local.fossil` are Fossil metadata and should not normally be included in Git commits.
- Git/Netlify/Fossil step-by-step workflow is documented in [docs/ops/RUNBOOK.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/ops/RUNBOOK.md).

---

## AI Helper (Groq + Gemini)

### 사용처

- **트리 AI 생성**: tree-ai.js (admin만 사용)
- **노드 설명 생성**: admin-tree.js의 "AI로 설명 채우기"
- **ai-helper.js**: Groq + Gemini fallback + YouTube Data API v3

### Provider 우선순위

1. **기본**: Groq (`llama-3.1-70b-versatile`)
2. **Fallback**: Gemini 2.5 Flash (Groq 실패 시 자동 전환)

### 필요한 Env

| Variable | Required | 설명 |
|----------|----------|------|
| `AI_PROVIDER` | Optional | `groq` (기본) 또는 `gemini` |
| `GROQ_API_KEY` | Optional | Groq API key (primary) |
| `GEMINI_API_KEYS` | Fallback | Comma-separated keys (fallback용) |
| `YOUTUBE_API_KEY` | ✅ | YouTube Data API v3 |

### 운영자 참고

- **Gemini는 제거된 것이 아니라 fallback입니다** - Groq 실패 시 자동 사용
- 키는 코드에 넣지 않고 Netlify env로 관리합니다
- 확인 절차: `netlify env:list` 후 AI 기능 smoke test

---

## Payment Runtime Note

- 클라이언트 결제 버튼은 `window.RELOVETREE_PAYMENT_CONFIG`가 설정된 경우에만 활성 동작합니다.
- 최소 필요 값:
  - `clientKey`
  - `amount`
- 서버 검증은 `TOSS_SECRET_KEY`와 `TOSS_PRO_AMOUNT`를 사용합니다.
- 설정이 없으면 결제 기능은 의도적으로 비활성화됩니다.

---

## Firebase App Check

- 클라이언트는 `window.RELOVETREE_APP_CHECK_CONFIG.siteKey`가 설정된 경우에만 App Check를 초기화합니다.
- 현재 코드는 선택적 초기화만 추가된 상태이며, 실제 활성화에는 Firebase Console 설정과 사이트 키 등록이 필요합니다.
| `YOUTUBE_API_KEY` | ✅ | YouTube Data API v3 |
| `YOUTUBE_API_REFERER` | Recommended | Referer 헤더 (localhost/netlify URL) |

### env 예시

```bash
# 여러 Gemini 키 (순차 사용, quota 소진 시 다음 키로)
netlify env:set GEMINI_API_KEYS "AIzaSyxxx1,AIzaSyxxx2,AIzaSyxxx3"

# YouTube API
netlify env:set YOUTUBE_API_KEY "AIzaSy..."

# Referer (local + production)
netlify env:set YOUTUBE_API_REFERER "https://lovetree.limone.dev"
```

### 주요 로직 (ai-helper.js 기준)

- `gemini-2.5-flash` 모델 사용
- 다중 키 순차调用 (quota 소진 시 다음 키로 자동 전환)
- YouTube Data API v3로 영상 메타데이터 조회
- Tree/Comment/QA 모드 지원

---

## Payment

Payment 검증 함수(`payment-verify.js`)는 구현되어 있습니다. 다만 production 결제는 `TOSS_SECRET_KEY` 설정과 실제 결제 테스트 전까지 비활성/보류 상태로 유지하는 것이 안전합니다.

**필요한 Env (설정 후 활성화)**:
- `TOSS_SECRET_KEY`: Toss Payments 시크릿 키 (production용)

---

## Emergency Contacts

- **Netlify Dashboard**: https://app.netlify.com/sites/133-relovetree
- **Neon Console**: https://console.neon.tech/app
- **Firebase Console**: https://console.firebase.google.com/project/relovetree

---

## 남은 운영 메모

- Disaster recovery plan은 별도 문서로 분리하는 것이 좋음
- ai-helper rate limiting은 Netlify 설정 또는 별도 저장소 기반 제한으로 운영 반영 필요

---

## Rate Limiting 권장

### ai-helper 함수 (고비용)

ai-helper는 Gemini API 호출로 비용이 발생하므로 rate limiting 권장:

```bash
# Netlify rate limit (사이트 단위)
# 방법: Netlify Dashboard → Functions → ai-helper → Settings → Limits

# 권장 설정:
# - Max invocations: 100/hour (필요시 조정)
# - Timeout: 10s
```

### 구현된 rate limit 확인

현재 코드에 rate limiting이 구현되어 있는지 확인:

```bash
# ai-helper.js에서 rate limit 관련 코드 확인
grep -n "rate" netlify/functions/ai-helper.js
```

### 참고

- Netlify built-in rate limiting은 사이트 단위 적용
- 함수별 개별 rate limit은 별도 구현 필요 (Redis 등)
- 현재는 GEMINI_API_KEYS 다중 키로 quota 소진 시 자동 전환됨


## Runtime Config Injection

- `src/runtime-config.js`가 클라이언트 런타임 설정 진입점입니다.
- 결제를 활성화하려면 `meta[name="relovetree-payment-client-key"]`에 Toss client key를 넣어야 합니다.
- App Check를 활성화하려면 `meta[name="relovetree-app-check-site-key"]`에 Firebase App Check site key를 넣어야 합니다.
