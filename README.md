# Lovetree - 나의 덕질 기록

> K-pop 팬을 위한 타임라인 기록 앱

## 제품 정체성 먼저 보기

이 저장소에서 기능/화면/디자인 작업을 시작하기 전에 아래 문서를 먼저 보는 것을 권장합니다.

- 제품 기준 문서: [docs/product/PRODUCT_IDENTITY.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/product/PRODUCT_IDENTITY.md)
- MVP 범위: [docs/product/MVP_SCOPE.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/product/MVP_SCOPE.md)
- 핵심 사용자 흐름: [docs/product/USER_FLOW.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/product/USER_FLOW.md)
- 데이터 명칭 규칙: [docs/product/DATA_NAMING_RULE.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/product/DATA_NAMING_RULE.md)
- 작업자 규칙: [AGENTS.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/AGENTS.md)

핵심 문장:

> Lovetree는 처음 사랑에 빠진 순간부터 팬이 되어가는 경로를 영상과 메모로 연결해 남기는 팬 감정 러브트리다.

## 프로젝트 개요

- **운영 URL**: https://lovetree.limone.dev
- **정적 프론트엔드**: plain HTML + plain CSS + 브라우저 JS
- **백엔드**: Netlify Functions
- **테스트**: Playwright smoke / production QA

### 아키텍처 개요 (중요)

```
클라이언트                    Netlify Functions              저장소
┌──────────────┐             ┌──────────────────┐          ┌──────────────┐
│ Firebase Auth│ ─────────── │ db-api.js        │ ──────── │ Neon/Postgres│
│ (로그인/세션)│   ID Token  │ (Postgres API)   │   SQL    │ (실제 데이터)│
└──────────────┘             └──────────────────┘          └──────────────┘
       │                              │
       ▼                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ PostgreSQL 클라이언트 (postgres-client.js)                                 │
│ - 클라이언트 코드는 Firestore API처럼 사용 가능 (하위 호환)                 │
│ - 실제 데이터는 Netlify Functions → Postgres 로 전달됨                    │
└──────────────────────────────────────────────────────────────────────────┘
```

| 구성 요소 | 용도 | 실제 저장소 / 진입점 |
|-----------|------|-------------|
| **Firebase Auth** | 로그인/세션 관리 | Firebase (Auth만) |
| **PostgreSQL 클라이언트** | 프론트엔드 데이터 접근 | `postgres-client.js` |
| **Netlify Functions** | API 엔드포인트/권한 | `db-api.js` |
| **Neon/PostgreSQL** | 실제 앱 데이터 저장 | ✅ `trees`, `users`, `posts` 등 |

**핵심**: 클라이언트는 Firestore와 유사한 API를 호출하지만, 모든 데이터는 **Neon PostgreSQL**에 저장됩니다. 신규 코드는 반드시 `postgres-client.js`와 `db-api.js`를 사용해야 합니다.

## 프로젝트 구조

```text
133-relovetree/
├── index.html
├── netlify.toml
├── package.json
├── assets/
│   └── css/
├── pages/
├── src/
│   ├── entries/
│   └── ...
├── netlify/
│   └── functions/
├── scripts/
├── docs/
│   ├── ops/
│   ├── plans/
│   ├── analysis/
│   └── migration/
└── README.md
```

## 로컬 실행

### 요구사항

- Node.js 18+
- Python 3.7+ 또는 동등한 정적 서버

### 빠른 시작

1. 의존성 설치

```bash
npm install
```

2. 로컬 정적 서버 실행

```bash
npm run dev
# 또는
python -m http.server 3133
```

3. 브라우저 열기

```text
http://localhost:3133/index.html
```

### 현재 스크립트

```bash
npm run dev
npm run serve
npm run build
npm run test
```

### CSS 운영 방식

- 앱은 `assets/css/*.css`를 직접 사용합니다.
- Tailwind/PostCSS 빌드 체인은 제거됐습니다.
- `npm run build`는 실질적인 CSS 컴파일을 하지 않습니다.

## 테스트

```bash
npm run test
npx playwright test --config ./config/playwright.config.js
```

- Playwright smoke는 핵심 페이지 회귀 확인용입니다.
- 최종 QA는 실도메인 `https://lovetree.limone.dev` 기준 수동 확인도 병행합니다.

## 운영 문서

- 운영 가이드: [docs/ops/OPERATIONS.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/ops/OPERATIONS.md)
- 연결/배포/버전관리 런북: [docs/ops/RUNBOOK.md](/mnt/g/ddrive/batangd/task/workdiary/133-relovetree/docs/ops/RUNBOOK.md)
- 마이그레이션/분석 문서: `docs/migration`, `docs/analysis`

## 주의

- 결제는 `window.RELOVETREE_PAYMENT_CONFIG`가 실제로 주입될 때만 활성화됩니다.
- App Check는 `window.RELOVETREE_APP_CHECK_CONFIG.siteKey`가 실제로 주입될 때만 활성화됩니다.
- 서버 환경변수는 Netlify Dashboard의 Environment variables가 source of truth입니다.

```html
<title>Lovetree - 나의 덕질 기록 | K-pop 팬을 위한 타임라인</title>
<meta name="description" content="...">
<meta name="keywords" content="러브트리, 덕질, K-pop, 타임라인">
```

### 🌐 소셜 미디어 최적화

- **Open Graph**: Facebook, LinkedIn 미리보기
- **Twitter Card**: Twitter 미리보기 카드
- **구조화된 데이터**: JSON-LD 마크업 (향후 지원 예정)

## 🐛 버그 수정사항

### 🛠 주요 수정

- **HTML 구조 손상**: editor.html 태그 에러 수정
- **접근성 누락**: ARIA 라벨, 키보드 이벤트 추가
- **에러 처리**: 전역 에러 핸들러, 사용자 친화적 메시지
- **성능 최적화**: 불필요한 리플로우 방지, 이미지 최적화

## 🚀 향후 계획

### 🔄 v1.2.0 개발 중

- [ ] **PWA 지원**: 오프라인 기능, 앱 설치
- [ ] **다크 모드**: 시스템 설정 감지, 토글 기능
- [ ] **다국어 확장**: 일본어, 중국어 지원
- [ ] **데이터 백업**: 클라우드 저장소 동기화

### 📈 성능 목표

- [ ] **LCP (Largest Contentful Paint)**: < 2.5초
- [ ] **FID (First Input Delay)**: < 100ms
- [ ] **CLS (Cumulative Layout Shift)**: < 0.1

### 🎯 새로운 기능

- [ ] **AI 추천**: 러브모먼트 자동 태깅
- [ ] **공유 기능**: SNS 공유, 링크 생성
- [ ] **통계 대시보드**: 활동 분석, 인사이트

## 🤝 기여하기

### 🐛 버그 리포팅

```bash
# GitHub Issues 사용
https://github.com/skerishKang/133-relovetree/issues
```

### 💡 기능 제안

- 기존 이슈 확인 후 새로운 이슈 생성
- 명확한 사용 사례와 기대 결과 작성

### 🔧 개발 참여

1. Fork该项目
2. 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치 푸시 (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

## 📞 지원

### 📧 연락처

- **이메일**: <skerishKang@example.com>
- **GitHub**: [@skerishKang](https://github.com/skerishKang)

### 🆘 도움말

- **문서**: `README.md`, `docs/ops/OPERATIONS.md`, `docs/guides/TUTORIAL.md`
- **FAQ**: GitHub Wiki 확인
- **커뮤니티**: GitHub Discussions

## 📄 라이선스

이 프로젝트는 ISC 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

---

**Made with ❤️ for K-pop fans worldwide**

*당신의 덕질 여정이 더욱 아름다워지길 바랍니다! ✨*
