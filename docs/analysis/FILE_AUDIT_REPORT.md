# Lovetree 파일/폴더 구조 분석 및 정리 제안서

현재 프로젝트의 루트 및 2단계 하위 폴더를 기준으로 파일과 폴더의 쓰임새를 분석하여 유지, 아카이브, 삭제, Git ignore 권장으로 분류했습니다. 

---

## 1. 종합 분류안

### 🟢 유지 (Keep)
운영 및 개발에 필수적인 핵심 소스코드와 설정 파일들입니다.

*   `src/`, `netlify/`, `scripts/`: 프론트엔드 및 백엔드 로직, 유지보수 스크립트
*   `*.html`, `*.js`, `*.css`: 루트 디렉토리에 있는 메인 웹 애플리케이션 파일
*   `firebase.json`, `firestore.rules`, `storage.rules`: Firebase 기본 설정 및 보안 규칙
*   `netlify.toml`, `package.json`, `package-lock.json`: 배포 및 패키지 설정
*   `README.md`, `docs/guides/TUTORIAL.md`, `docs/plans/TEST_PLAN.md`: 주요 문서 파일
*   **`.agent/`**: AI 워크플로우 관련 스크립트 및 설정 (유지 필요)
*   **`relovetree.local.fossil`**: 로컬 버전 관리에 사용 중인 Fossil 저장소 데이터베이스. (단, Git 혼용 시 반드시 Ignore 처리)
*   **`_FOSSIL_`**: Fossil 저장소의 현재 체크아웃 상태 정보 파일. (단, Git 혼용 시 반드시 Ignore 처리)
*   **`relovetree-firebase-adminsdk-fbsvc-d8d4c96f15.json`**: 백엔드/스크립트에서 사용하는 Firebase Admin 서비스 계정 키. (절대 Git에 커밋되지 않도록 안전한 곳에 유지해야 함)

### 🟡 아카이브 권장 (Archive)
당장 쓰이지는 않으나 참고용으로 남겨둘 가치가 있는 항목입니다. 메인 작업 디렉토리 바깥으로 옮기거나 `archive/` 폴더를 만들어 보관하는 것을 권장합니다.

*   **`simple-prototype/`**: Supabase를 사용했던 초기 프로토타입 소스 코드(`index.html`, `editor.html`, `supabase-client.js`). 현재의 Firebase/Netlify 구조와 다르지만 이전 구현 참고용으로 남겨둘 수 있습니다. 보류 후 아카이브 폴더로 이동을 권장합니다.

### 🔴 삭제 후보 (Delete)
프로젝트에 불필요하거나, 자동으로 재생성되어 로컬 공간만 차지하는 쓰레기(Garbage) 파일 및 폴더입니다. **바로 삭제해도 무방합니다.**

*   **`.next/`**: Next.js 프레임워크의 빌드/캐시 결과물. 현재 프로젝트는 순수 HTML/JS 및 Netlify Functions 기반이므로, 과거 Next.js 테스트의 잔재로 보입니다. 완전 삭제를 권장합니다.
*   **`functions/`**: 내부 확인 결과 `node_modules/` 외에 실제 코드가 존재하지 않습니다. 현재 백엔드 로직은 `netlify/functions/`에서 관리되고 있으므로, 이 빈 껍데기 폴더는 삭제하는 것이 깔끔합니다.
*   **`.codex`**: 0 byte의 빈 파일로, 특정 에디터 확장 플러그인(OpenAI Codex 등)이 남긴 찌꺼기로 추정됩니다. 삭제해도 무방합니다.

### ⚙️ Git ignore 권장 (Ignore)
로컬에는 존재해야 하지만 원격 저장소(Git)에는 절대 올라가서는 안 되는 파일들입니다.

*   **`node_modules/`** (이미 적용됨)
*   **`.netlify/`** (이미 적용됨)
*   **`.firebase/`**: 캐시 폴더. 현재 `.gitignore`에 `.firebase/hosting..cache`만 등록되어 있으나 폴더 전체를 무시하는 것이 좋습니다.
*   **`relovetree-firebase-adminsdk-*.json`** (이미 적용됨)
*   **`relovetree.local.fossil`**, **`_FOSSIL_`**: Fossil SCM을 Git과 병행 사용한다면 반드시 `.gitignore`에 추가해야 합니다.

---

## 2. 우선 점검 대상 상세 분석 (근거 및 조치)

| 파일/폴더명 | 상태 분류 | 조치 권고 | 근거 |
| :--- | :--- | :--- | :--- |
| **`.next`** | 🔴 삭제 후보 | **즉시 삭제** | 프로젝트 스택(바닐라 JS + Netlify)과 맞지 않는 Next.js 캐시 잔재. |
| **`functions`** | 🔴 삭제 후보 | **즉시 삭제** | 내부 코드 없이 `node_modules`만 존재하는 찌꺼기 폴더. 실 백엔드는 `netlify/functions` 사용 중. |
| **`simple-prototype`** | 🟡 아카이브 권장 | **보류 및 이동** | 과거 Supabase 기반 테스트 코드로 현재 스택과 무관. 다만 참고용으로 `archive/`로 격리. |
| **`_FOSSIL_`** | 🟢 유지 & ⚙️ Ignore | **유지 (Git은 무시)** | Fossil SCM 체크아웃 상태 파일이므로 Fossil 사용을 위해 유지. 단, Git 저장소에는 올라가지 않도록 해야 함. |
| **`relovetree.local.fossil`** | 🟢 유지 & ⚙️ Ignore | **유지 (Git은 무시)** | Fossil SCM의 전체 데이터베이스 파일. 중요 자산이나 Git 커밋 대상은 아님. |
| **`.codex`** | 🔴 삭제 후보 | **즉시 삭제** | 0 byte 파일, AI 플러그인 등 외부 툴이 임시로 생성한 무의미한 파일. |
| **`.firebase`** | ⚙️ Ignore | **삭제해도 무방** | Firebase CLI 배포/캐시 파일이므로 지워도 다시 생성됨. |
| **`.netlify`** | ⚙️ Ignore | **삭제해도 무방** | Netlify CLI 구동 캐시 파일이므로 지워도 다시 생성됨. |
| **`node_modules`** | 🟢 유지 & ⚙️ Ignore | **유지 (로컬용)** | 패키지 의존성. 용량 확보를 위해 지울 수 있으나 `npm install`로 다시 받아야 하므로 로컬 유지. |
| **`relovetree-...d8d4c96f15.json`** | 🟢 유지 & ⚙️ Ignore | **유지 (절대 보안)** | 백엔드 어드민 키. 절대 지우지 말고, 반대로 절대 Git/Fossil 원격 서버에 올리지 않도록 주의. |

---

## 3. `.gitignore` 개선안 제안

기존 `.gitignore`에 누락되어 있거나 개선할 수 있는 부분을 반영한 예시입니다. (실제 수정은 하지 않음)

```gitignore
# 기존 설정 유지 (바이너리, 미디어 제외 등)
...

# 의존성 및 빌드 캐시
node_modules/
.next/
.netlify/
.firebase/        # (개선) 내부 캐시 파일뿐만 아니라 폴더 전체를 무시

# 보안 및 환경 변수
.env
relovetree-firebase-adminsdk-*.json

# OS 및 에디터 임시 파일
.DS_Store
Thumbs.db
.codex            # (추가) 에디터 플러그인 찌꺼기

# Fossil SCM 혼용 시 Git에서 제외할 항목
*.fossil          # (추가) Fossil DB 파일
_FOSSIL_          # (추가) Fossil 상태 파일
.fslckout         # (추가) Windows 외 환경 Fossil 상태 파일
```

이 문서를 바탕으로 즉시 삭제할 폴더(`.next`, `functions`, `.codex`)는 지우고, 프로토타입은 아카이브하여 프로젝트 루트를 깔끔하게 관리하시길 권장합니다.
