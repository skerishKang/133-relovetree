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
| `ADMIN_EMAILS` | Optional | Comma-separated admin emails ( fallback) |

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

### 주의사항

- **env_file은 local build용**: production에서는 Dashboard env가 source
- **preview deploy**: production env 상속 여부 확인 필요
- **local에서没问题不等于 production没问题**: 항상 production 검증 필수

---

## Admin Account Operations

### 현재 운영 계정

- **Email**: skerish@naver.com
- **Role**: admin (DB users.role = 'admin')

### Admin 판정 로직

**서버 (firestore-api.js)**:
1. `ADMIN_EMAILS` env check
2. DB `users.role = 'admin'` check

**클라이언트 (auth.js)**:
1. 하드코딩된 `AUTH_CONFIG.adminEmails` check
2. DB `users.role = 'admin'` check

### 권장 운영 방식

1. ADMIN_EMAILS env를 Netlify에 설정 (서버 판정용)
2. DB role 필드로 admin 관리 (권장)
3. 클라이언트 하드코딩은 UI 표시용으로만 사용

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
| community.html | https://lovetree.limone.dev/community.html | 200 OK |
| owner.html | https://lovetree.limone.dev/owner.html | 200 OK |
| editor.html | https://lovetree.limone.dev/editor.html | 200 OK |
| admin.html | https://lovetree.limone.dev/admin.html | 200 OK |

### 4. 브라우저 검증 (선택)

```bash
# Playwright로 콘솔 에러 확인
node test-browser.js
```

---

## Known Issues Fixed

| Issue | Status | Date |
|-------|--------|------|
| DATABASE_URL 누락 | ✅ 해결 | 2026-04-09 |
| editorMode TDZ 버그 | ✅ 해결 | 2026-04-09 |
| payment-server TODO | ✅ 해결 | 2026-04-09 |
| admin-tree module 분리 | ✅ 완료 | 2026-04-08 |
| admin-users module 분리 | ✅ 완료 | 2026-04-08 |
| index 모달 분리 | ✅ 완료 | 2026-04-08 |
| index 렌더 분리 | ✅ 완료 | 2026-04-08 |

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

## Emergency Contacts

- **Netlify Dashboard**: https://app.netlify.com/sites/133-relovetree
- **Neon Console**: https://console.neon.tech/app
- **Firebase Console**: https://console.firebase.google.com/project/relovetree

---

## TODO (남은 문서화)

- [ ] Payment verification 상세 가이드
- [ ] AI helper (Gemini/YouTube) API 설정 가이드
- [ ] Disaster recovery plan (Neon 백업 복원)
- [ ] Rate limiting 설정