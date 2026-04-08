# Relovetree Operations Guide

> 최종 업데이트: 2026-04-09

## Production Environment

- **URL**: https://lovetree.limone.dev
- **Platform**: Netlify
- **Database**: Neon (PostgreSQL)
- **Auth**: Firebase Auth
- **Backend**: Netlify Functions (Node.js)

---

## Netlify Required Environment Variables

### Production Context (필수)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ✅ | Firebase service account for admin SDK |
| `GEMINI_API_KEYS` | ✅ | Google Gemini API keys (comma-separated) |
| `YOUTUBE_API_KEY` | ✅ | YouTube Data API v3 key |
| `YOUTUBE_API_REFERER` | Recommended | Referer header for YouTube API |
| `TOSS_SECRET_KEY` | For payment | Toss Payments secret key (production) |
| `ADMIN_EMAILS` | Recommended | Comma-separated admin emails (server fallback allowlist) |

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
| `ADMIN_EMAILS` | Dashboard 값 사용 | `skerish@naver.com,padiemipu@gmail.com` |
| env_file 참조 | netlify.toml의 `env_file = ".env"` | 무시됨 |

### ⚠️ 주의사항

- **env_file은 local build용**: production에서는 Dashboard env가 source
- **local에서没问题不等于 production没问题**: 항상 production 검증 필수
- **preview deploy**: production env 상속 여부 확인 필요

---

## Admin Account Operations

### 현재 운영 계정

- **Admin allowlist env**: `skerish@naver.com,padiemipu@gmail.com`
- **Primary admin**: `skerish@naver.com`
- **Role source of truth**: DB `users.role = 'admin'`

### Admin 판정 로직

**서버 (firestore-api.js)**:
1. `ADMIN_EMAILS` env check
2. DB `users.role = 'admin'` check

**클라이언트 (auth.js / admin entry)**:
1. DB `users.role = 'admin'` check
2. 서버 판정은 항상 Netlify env + DB role 재확인

### 권장 운영 방식

1. `ADMIN_EMAILS` env를 Netlify에 유지 (서버 allowlist fallback)
2. DB `users.role`로 실제 admin 권한 관리
3. 클라이언트는 서버 ACL을 대체하지 않음

### Role 종류

- `free`: 일반 사용자
- `pro`: Pro 사용자 (결제 완료)
- `admin`: 관리자

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

## AI Helper (Gemini + YouTube)

### 사용처

- **트리 AI 생성**: tree-ai.js (admin만 사용)
- **노드 설명 생성**: admin-tree.js의 "AI로 설명 채우기"
- **ai-helper.js**: Gemini 2.5 Flash + YouTube Data API v3

### 필요한 Env

| Variable | Required | 설명 |
|----------|----------|------|
| `GEMINI_API_KEYS` | ✅ | Comma-separated keys (여러 개면 순차 사용) |
| `GEMINI_API_KEY` | Alternative | 단일 키 |
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
