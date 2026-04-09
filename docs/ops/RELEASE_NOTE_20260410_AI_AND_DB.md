# 릴리즈 노트: AI Helper 모듈화 및 DB 통합 마이그레이션 (세션 2026-04-10)

핵심 맥락: "AI 도우미의 아키텍처를 계층화하고, 레거시 Firestore 호출을 새로운 데이터베이스 별칭 시스템으로 완전히 통합함"

## 1. 이번 라운드 완료 사항 (커밋 전 기준)

### **A. AI Helper 서버리스 함수 모듈화 (Phase 1~5)**
- `netlify/functions/ai-helper.js`를 거대 파일에서 린(Lean)한 라우터로 리팩토링함.
- **분리된 라이브러리:**
    - `_lib/ai-helper-utils.js`: 기본 유틸리티 (truncate, JSON parse 등)
    - `_lib/youtube-client.js`: YouTube Data API 통신 래퍼
    - `_lib/youtube-transcript.js`: 자막 추출 및 파싱 로직
    - `_lib/gemini-client.js`: Gemini API 호출 및 다중 키/재시도 로직
    - `_lib/ai-prompts.js`: 모드별 프롬프트 템플릿 및 응답 가공 로직
- **효과:** 코드 가독성 대폭 향상 및 향후 Groq 등 다른 AI 프로바이더 확장이 용이해짐.

### **B. 데이터베이스 통합 마이그레이션 (Alias Adoption)**
- **Auth 시스템:** `src/auth.js` 내의 모든 Firestore 직접 호출을 `window.postgresDB` 별칭으로 전환. 실도메인 인증 회귀 테스트(가입/로그인/권한/로그아웃) 통과.
- **에디터 부트스트랩:** `src/editor-bootstrap.js` 및 `src/admin-bootstrap.js`의 `runtime.db` 초기화를 레거시 SDK에서 `window.postgresDB`로 교체 완료.

### **C. QA 및 안정성 검증**
- 실도메인(`lovetree.limone.dev`)에서 테스트 계정의 displayName 처리 및 RBAC(역할 기반 접근 제어) 정상 작동 확인.
- 수정된 모든 서버리스 함수 및 클라이언트 스크립트에 대해 `node -c` 구문 검사 완료.

## 2. 현재 안정 상태
- **인증(Auth):** 실도메인 가입/로그인 기능 안정적임. `users` 문서 상태 업데이트 정상.
- **AI 도우미:** Gemini API 기반의 비디오 분석 및 노드 생성 기능 정상. 내부 코드가 모듈화되어 있으나 외부 인터페이스는 유지됨.
- **에디터:** 새로운 DB 별칭 시스템 하에서 데이터 로딩 준비 완료.

## 3. 남은 후속 작업 및 다음 세션 시작점
- **AI Orchestrator 분리 (Phase 6):** `ai-helper.js`의 핸들러 내 분기 로직을 별도 모듈로 빼서 엔트리포인트를 극도로 단순화.
- **문서 보강:** `OPERATIONS.md` 및 `RUNBOOK.md`에 `AI_PROVIDER` 및 `GROQ_API_KEY` 관련 설정 가이드 실제 반영.
- **Groq 통합:** 모듈화된 구조 위에 Groq 모델을 실제 프로바이더로 추가.

---
*참고: 현재 작업분은 로컬에 적용되어 있으며, 배포 전 커밋 및 Netlify 반영이 필요함.*
