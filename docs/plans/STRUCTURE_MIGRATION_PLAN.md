# Relovetree 구조 개편 마이그레이션 계획서

작성일: 2026-04-09

## 1. 목적

현재 프로젝트는 기능 안정화와 모듈 분리는 상당 부분 진행되었지만, 루트 디렉토리에 엔트리 HTML/JS, 설정 파일, 문서, 분석 리포트가 함께 모여 있어 구조가 복잡하게 보입니다.

이 계획서는 다음 목표를 위한 **순차 실행용 TODO 문서**입니다.

1. 루트 디렉토리의 잡다한 파일을 줄인다
2. 기존 URL과 배포 동작을 최대한 유지한다
3. HTML/JS/CSS/문서의 책임을 더 명확하게 나눈다
4. 전면 개편 중에도 실서비스를 깨지 않도록 단계별 검증을 강제한다

중요:

- 이 작업은 단순 리팩토링이 아니라 **구조 마이그레이션**이다
- 한 번에 끝내는 방식이 아니라 **단계별 완료 후 검증** 방식으로만 진행한다
- 출시 직전에는 실행하지 않고, 안정화 라운드에서 진행하는 것이 기본 원칙이다

---

## 2. 최종 목표 구조

```text
133-relovetree/
├── index.html
├── README.md
├── package.json
├── netlify.toml
├── firebase.json
├── firestore.rules
├── storage.rules
├── pages/
│   ├── admin.html
│   ├── community.html
│   ├── owner.html
│   ├── editor.html
│   └── login.html
├── assets/
│   ├── css/
│   └── ...
├── src/
│   └── ...
├── docs/
│   ├── analysis/
│   ├── guides/
│   ├── migration/
│   ├── ops/
│   └── plans/
├── scripts/
│   ├── dev/
│   ├── migration/
│   └── ...
├── tests/
└── netlify/
    └── functions/
```

주의:

- 위 구조는 **목표 상태**다
- 실제 적용은 전부 한 번에 하지 않는다
- `index.html`은 최종적으로도 루트 유지가 기본 전제다

---

## 3. 반드시 지켜야 할 원칙

1. 기존 공유 URL을 함부로 깨지 않는다
2. 각 단계는 독립 커밋 가능해야 한다
3. HTML 엔트리 이동은 가장 나중에 한다
4. Tailwind 제거와 구조 이동을 동시에 하지 않는다
5. 서비스워커/캐시/상대경로 검증 없이 다음 단계로 넘어가지 않는다

금지:

- 엔트리 HTML, 엔트리 JS, CSS 경로를 한 번에 동시에 바꾸는 작업
- redirect 전략 없이 `admin.html`, `community.html`, `owner.html`, `editor.html`, `login.html`를 바로 이동하는 작업
- 대형 CSS 추출과 Tailwind debt 제거를 구조 이동과 같이 처리하는 작업

---

## 4. 단계별 실행 순서

### Phase 0. 준비 및 베이스라인

목표:

- 현재 구조를 기준으로 테스트/배포/경로 상태를 고정한다

작업:

1. 현재 production URL 목록 정리
2. 내부 링크와 직접 접근하는 `.html` URL 목록 정리
3. Playwright smoke 테스트 기준점 확보
4. 서비스워커 캐시 대상 점검
5. 루트 폴더 파일 인벤토리 확정

완료 조건:

- `npm run build` 통과
- `npx playwright test --list` 통과
- 엔트리 페이지 URL 목록 문서화 완료

리스크:

- 없음

권장 커밋 메시지:

- `docs: baseline route and structure inventory`

---

### Phase 1. 문서/임시 스크립트/산출물 정리

목표:

- 앱 동작에 영향 없는 파일을 루트에서 밀어낸다

작업:

1. 문서 파일을 `docs/`로 이동
2. 임시 브라우저/개발 스크립트를 `scripts/dev/`로 이동
3. `.gitignore` 보강
4. 문서 내부 참조 보정

완료 조건:

- 루트 `.md`는 `README.md`만 남음
- 잡파일은 `.gitignore` 처리됨
- 앱 경로 영향 없음

상태:

- 상당 부분 완료

권장 커밋 메시지:

- `chore: reorganize docs and dev artifacts`

---

### Phase 2. 엔트리 JS 정리

목표:

- 페이지 진입점만 루트에 남기고, 보조 모듈은 가능한 한 `src/` 아래로 정리한다

작업:

1. `index.js`, `community.js`, `owner.js`, `admin.js`, `editor_ai.js`를 엔트리 역할로만 유지
2. 반복 보조/헬퍼/렌더/데이터 로드는 `src/` 하위로 이동
3. 페이지별 로드 순서 문서화

완료 조건:

- 엔트리 JS는 오케스트레이션 중심
- 보조 파일은 `src/`에서 책임별로 유지

주의:

- 엔트리 JS 파일 자체를 루트 밖으로 보내는 것은 후순위다
- 페이지 HTML이 직접 참조하는 구조를 지금 깨지 않는다

상태:

- 대부분 완료

권장 커밋 메시지:

- `refactor: keep root entry scripts thin`

---

### Phase 3. CSS 구조 정리

목표:

- 인라인 CSS와 반복 스타일 부채를 줄이되, 배포 경로는 안정적으로 유지한다

작업:

1. 페이지별 CSS를 `assets/css/` 아래로 유지
2. 위험한 인라인 CSS는 2차 보류 목록으로 유지
3. 반복 스타일 조합은 공통 클래스로 계속 승격
4. plain CSS 파일을 직접 수정하는 구조를 유지

완료 조건:

- 인라인 CSS의 dead/low-risk 구간 감소
- `assets/css/*.css`가 실제 스타일 소스가 됨

주의:

- `mobile-preview`, canvas/editor 핵심 레이아웃, fallback CSS는 별도 검증 없이는 이동 금지

권장 커밋 메시지:

- `refactor: centralize safe shared styles`

---

### Phase 4. 정적 자산 정리

목표:

- 정적 이미지/아이콘/보조 자산을 `assets/` 또는 `public/` 계열로 정리한다

작업:

1. 현재 루트 자산 인벤토리 작성
2. 이동 가능한 정적 자산만 `assets/`로 이동
3. 경로 참조와 서비스워커 캐시 수정

완료 조건:

- 루트의 비코드 자산 수 감소
- 참조 경로 및 캐시 경로 검증 완료

주의:

- favicon 계열은 경로 변경 시 참조 영향만 확인

권장 커밋 메시지:

- `chore: move static assets under assets`

---

### Phase 5. 보조 엔트리 HTML 이동

목표:

- `admin.html`, `community.html`, `owner.html`, `editor.html`, `login.html`를 `pages/` 하위로 이동할지 결정하고, 필요하면 기존 URL 유지 장치와 함께 적용한다

작업:

1. 실제 이동 전 기존 링크와 외부 접근 경로 정리
2. 이동 방식 결정
   - A. 실제 파일 이동 + 루트 얇은 브리지 파일 유지
   - B. Netlify redirect로 기존 URL 유지
   - C. 이동하지 않고 루트 유지
3. 이동 후 상대경로 전부 수정
4. 서비스워커/캐시/직접 링크 재검증

완료 조건:

- `/admin.html`, `/community.html`, `/owner.html`, `/editor.html`, `/login.html` 기존 접근성이 유지됨
- 내부 링크/브라우저 북마크/배포 URL 문제 없음

주의:

- 이 단계가 실제 구조 개편의 최고위험 구간이다
- 출시 직전에는 수행하지 않는다

권장 커밋 메시지:

- `refactor: relocate secondary page entries with compatibility paths`

---

### Phase 6. 최종 Tailwind debt 정리

목표:

- 구조 이동이 끝난 뒤 남은 Tailwind 반복 조합과 인라인 스타일 debt를 마지막으로 정리한다

작업:

1. 반복 조합을 공통 클래스로 승격
2. dead utility 제거
3. 잔여 인라인 CSS 중 안전한 것 추가 흡수

완료 조건:

- 남은 Tailwind는 동적/의도적 사용 위주
- CSS debt가 “후순위만 남은 상태”가 됨

주의:

- Tailwind 자체를 제거하는 작업은 범위 밖
- 이 프로젝트는 Tailwind 기반을 유지한다

권장 커밋 메시지:

- `refactor: reduce remaining tailwind and inline style debt`

---

## 5. 출시 전 / 출시 후 구분

### 출시 전

허용:

- 문서 정리
- 임시 스크립트 정리
- dead-only cleanup
- Playwright smoke 강화
- 운영 문서 정리

금지:

- 보조 엔트리 HTML 이동
- CSS 경로 재배치
- static asset 대규모 이동
- redirect 없는 URL 변경

### 출시 후 안정화 라운드

허용:

- `assets/` 정리
- `pages/` 이동 여부 검토
- HTML 엔트리 이동 + 호환 경로 유지
- 최종 Tailwind debt 정리

---

## 6. 검증 체크리스트

각 단계 완료 후 최소 검증:

1. `npm run build`
2. `node --check` 대상 엔트리/모듈
3. `npx playwright test --list`
4. 주요 smoke 대상 수동 확인
   - `/`
   - `/community.html`
   - `/owner.html`
   - `/editor.html?id=bts`
   - `/admin.html`
5. 서비스워커/캐시 영향이 있는 경우 hard reload 확인

---

## 7. 현재 판단

현재 시점에서 바로 실행 가능한 단계:

1. Phase 1 문서/산출물 정리
2. Phase 2 엔트리 JS 얇게 유지
3. Phase 3의 안전한 CSS 정리

지금 보류해야 하는 단계:

1. Phase 4 자산 대이동
2. Phase 5 보조 HTML 이동
3. Phase 6 Tailwind 최종 정리

---

## 8. 결론

루트 폴더를 더 깔끔하게 만드는 것은 가능하다.  
다만 지금 필요한 것은 “전부 한 번에 옮기는 작업”이 아니라, **단계별로 격리하면서 URL과 배포를 보호하는 마이그레이션**이다.

즉, 이 계획서는 다음 원칙으로 실행한다.

1. 문서/스크립트/잡파일부터 이동
2. JS는 엔트리만 남기고 보조를 `src/`로 유지
3. CSS는 `assets/css/` 중심으로 정리
4. HTML 이동은 가장 마지막에, 호환 전략과 함께
