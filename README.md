# Relovetree - 나의 덕질 기록 📚❤️

> K-pop 팬을 위한 타임라인 앱으로 사랑하는 아티스트의 모든 순간을 기록하세요!

## 🌟 개선된 기능

### ✨ 주요 개선사항 (v1.0.0 → v1.1.0)

#### 🎯 사용자 경험 개선

- **접근성 강화**: 스크린 리더 지원, 키보드 네비게이션, ARIA 라벨 추가
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 모든 기기에서 최적화된 경험
- **성능 최적화**: 이미지 지연 로딩, 애니메이션 최적화, 코드 분할
- **SEO 개선**: 메타 태그, Open Graph, Twitter Card 완전 지원

#### 🛠 기술적 개선

- **에러 처리 강화**: 전역 에러 핸들러, 사용자 친화적 오류 메시지
- **코드 구조화**: 모듈화된 JavaScript, 재사용 가능한 유틸리티
- **성능 최적화**: debounce/throttle, 이미지 최적화, CSS 애니메이션
- **검증 시스템**: 입력값 검증, YouTube URL 파싱, 시간 포맷 검증

#### 📱 반응형 디자인

- **모바일 퍼스트**: 태블릿(640px+), 데스크톱(1024px+) 대응
- **접근성**: `prefers-reduced-motion` 지원, 키보드 포커스 관리
- **사용자 친화적**: 터치 최적화, 읽기 전용 텍스트 크기 조정

#### 🚀 성능 최적화

- **이미지 최적화**: `loading="lazy"`, 에러 처리, Fallback 이미지
- **애니메이션**: CSS transforms 활용, `will-change` 최적화
- **코드 분할**: 공유 모듈 분리, 재사용 가능한 함수들

## 📁 프로젝트 구조

```text
133-relovetree/
├── 📄 index.html          # 메인 페이지
├── 📄 editor.html         # 에디터 페이지  
├── 📄 package.json        # 프로젝트 설정
├── 📄 tailwind.config.js  # Tailwind CSS 설정
├── 📄 postcss.config.js   # PostCSS 설정
├── 📄 run_lovetree.bat    # Windows 실행 파일
├── 📄 output.css          # 빌드된 CSS (auto-generated)
├── 📁 src/
│   ├── 📄 input.css       # 소스 CSS 파일
│   ├── 📄 shared.js       # 공유 유틸리티 모듈
│   └── 📁 js/             # JavaScript 모듈들
└── 📄 README.md           # 이 문서
```

## 🛠 개발 환경 설정

### 📋 요구사항

- Node.js 16+ (패키지 관리용)
- Python 3.7+ (로컬 서버용, 선택사항)

### 🚀 빠른 시작

1. **의존성 설치**

   ```bash
   npm install
   ```

2. **개발 모드 (CSS 워치 모드)**

   ```bash
   npm run dev
   ```

3. **프로덕션 빌드**

   ```bash
   npm run build
   ```

4. **로컬 서버 실행**

   ```bash
   npm run serve
   # 또는
   python -m http.server 3133
   ```

5. **웹 브라우저에서 열기**

   ```text
   http://localhost:3133/index.html
   ```

### 📜 사용 가능한 스크립트

```json
{
  "dev": "tailwindcss -i ./src/input.css -o ./output.css --watch",
  "build": "tailwindcss -i ./src/input.css -o ./output.css --minify", 
  "serve": "python -m http.server 3133",
  "clean": "rm -f output.css"
}
```

## 🎨 디자인 시스템

### 🎨 색상 팔레트

```css
--brand-50: #fff1f2   /* 가장 연한 핑크 */
--brand-100: #ffe4e6  /* 연한 핑크 */
--brand-500: #f43f5e  /* 메인 브랜드 색상 */
--brand-600: #e11d48  /* 진한 핑크 */
```

### 📏 타이포그래피

- **한글**: Noto Sans KR (300, 400, 500, 700)
- **영문**: Outfit (300, 400, 600, 800)

### 📐 스페이싱

- 기본 단위: `0.25rem (4px)`
- 컨테이너 최대 폭: `80rem (1280px)`

## 🔧 기술 스택

### 🎯 프론트엔드

- **HTML5**: 시맨틱 마크업, 접근성 지원
- **CSS3**: Tailwind CSS, 커스텀 애니메이션
- **JavaScript ES6+**: 모듈 시스템, async/await

### 📚 라이브러리

- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크
- **PostCSS**: CSS 처리 도구
- **Autoprefixer**: 자동 접두사 추가

### 🌐 외부 API

- **YouTube API**: 비디오 검색/정보 조회 및 자막 기반 순간(moments) 생성
- **Google Fonts**: 웹 폰트 로딩

## 🤖 AI 실제 콘텐츠 생성

이 프로젝트의 AI 도우미는 단순한 더미 텍스트가 아니라, 실제 YouTube 영상을 검색하고(YouTube Data API), 가능한 경우 자막(YouTube timedtext)을 기반으로 타임스탬프가 포함된 순간(moments)을 생성합니다. 최종 요약/구성은 Gemini를 사용합니다.

### ✅ 필요한 환경변수

- **`GEMINI_API_KEYS`**
  - 쉼표로 구분된 Gemini API Key 목록
  - 예: `GEMINI_API_KEYS=key1,key2`
- **`YOUTUBE_API_KEY`**
  - YouTube Data API v3 키

### 🧪 로컬 실행 방법 (권장: Netlify Functions 포함)

`netlify/functions/ai-helper.js`를 사용하려면 정적 서버가 아니라 Netlify 로컬 개발 서버로 실행하는 것이 가장 간단합니다.

1. 환경변수 설정
   - Windows PowerShell 예시
     - `setx GEMINI_API_KEYS "key1,key2"`
     - `setx YOUTUBE_API_KEY "YOUR_YOUTUBE_API_KEY"`

2. Netlify 로컬 서버 실행
   - `npx netlify dev --port 8888`

3. 접속
   - `http://localhost:8888/editor.html`

### 🧪 로컬 실행 방법 (정적 서버만 실행)

정적 서버(`python -m http.server` 등)로 `editor.html`만 띄우면 `/.netlify/functions/*`가 없기 때문에, 프론트의 AI 호출은 기본적으로 프로덕션 엔드포인트로 폴백합니다.

## 📊 성능 지표

### ⚡ 개선된 성능

- **이미지 지연 로딩**: 초기 로드 시간 단축
- **코드 분할**: JavaScript 번들 크기 최적화
- **CSS 최적화**: 사용하지 않는 스타일 제거

### 📱 반응형 지원

| 기기 | 화면 크기 | 특징 |
|------|-----------|------|
| 모바일 | < 640px | 1열 레이아웃, 터치 최적화 |
| 태블릿 | 640px - 1024px | 2열 레이아웃, 사이드바 숨김 |
| 데스크톱 | > 1024px | 3열 레이아웃, 사이드바 표시 |

## ♿ 접근성 기능

### 🎯 WCAG 2.1 AA 준수

- **키보드 네비게이션**: 모든 기능 키보드 접근 가능
- **스크린 리더**: ARIA 라벨, 의미론적 HTML
- **색상 대비**: 최소 4.5:1 비율 충족
- **포커스 관리**: 시각적 포커스 표시기

### 🔊 보조 기술 지원

- **NVDA/JAWS**: Windows 스크린 리더 완전 지원
- **VoiceOver**: macOS 스크린 리더 지원
- **Switch Control**: 스위치 디바이스 지원

## 🔍 SEO 최적화

### 📝 메타 태그

```html
<title>Relovetree - 나의 덕질 기록 | K-pop 팬을 위한 타임라인</title>
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

- **문서**: 이 README.md 파일 참조
- **FAQ**: GitHub Wiki 확인
- **커뮤니티**: GitHub Discussions

## 📄 라이선스

이 프로젝트는 ISC 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

---

**Made with ❤️ for K-pop fans worldwide**

*당신의 덕질 여정이 더욱 아름다워지길 바랍니다! ✨*
