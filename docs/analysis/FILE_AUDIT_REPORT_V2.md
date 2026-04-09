# Relovetree 파일 구조 감사 보고서

**작성일**: 2026-04-08  
**목표**: 현재 프로젝트 폴더/파일을 분석하여 유지/이동/삭제/보류 분류안 제시

---

## 1. 종합 분류안

### 🟢 유지 (Keep)
프로젝트 운영 및 개발에 필수적인 핵심 파일들

| 항목 | 유형 | 근거 |
|------|------|------|
| `src/` | 폴더 | 메인 소스 코드 (auth.js, shared.js, firebase-firestore-compat.js, payment.js 등) |
| `netlify/` | 폴더 | 백엔드 함수 (ai-helper.js, tree-ai.js, tree-admin.js, firestore-api.js) 및 SQL 스키마 |
| `scripts/` | 폴더 | 유지보수용 스크립트 (create-test-accounts.js, list-trees.js, show-tree.js, migration/) |
| `pages/*.html`, `index.html` | 파일 | 메인 웹 애플리케이션 엔트리 |
| `src/entries/*.js` | 파일 | 클라이언트 엔트리 |
| `assets/css/*.css` | 파일 | 현재 plain CSS 자산 |
| `firebase.json`, `.firebaserc` | 파일 | Firebase 설정 |
| `firestore.rules`, `storage.rules` | 파일 | Firebase 보안 규칙 |
| `netlify.toml` | 파일 | Netlify 빌드 설정 |
| `package.json`, `package-lock.json` | 파일 | npm 의존성 |
| `README.md`, `docs/guides/TUTORIAL.md`, `docs/plans/TEST_PLAN.md`, `docs/migration/POSTGRES_MIGRATION.md` | 파일 | 프로젝트 문서 |
| `.agent/` | 폴더 | AI 워크플로우 설정 |
| `.vscode/` | 폴더 | VSCode 작업 공간 설정 |
| `.git/` | 폴더 | Git 저장소 메타데이터 |
| `.gitignore` | 파일 | Git 무시 규칙 |
| `.mdlrc`, `.markdownlint.json`, `.stylelintrc.json` | 파일 | lint 설정 |

### 🟡 아카이브 권장 (Archive)
참고용으로 남겨두되, 메인 디렉토리에서 격리 권장

| 항목 | 유형 | 크기 | 근거 |
|------|------|------|------|
| `simple-prototype/` | 폴DER | - | 초기 Supabase 프로토타입. 현재 Firebase/Netlify 스택과 다름. 참고용으로 archive/ 폴더로 이동 권장 |

### 🔴 삭제 후보 (Delete)
바로 삭제해도 무방한 항목

| 항목 | 유형 | 크기 | 근거 |
|------|------|------|------|
| `.next/` | 폴더 | - | Next.js 빌드 캐시. 현재 프로젝트는 바닐라 JS + Netlify이므로 불필요 |
| `.next/dev` | 폴더 | 빈 폴더 | 빌드 캐시 잔재 |
| `functions/` | 폴더 | - | 실제 코드 없이 node_modules만 존재. 실 백엔드는 `netlify/functions/` 사용 중 |
| `.codex` | 파일 | 0 byte | AI 플러그인(OpenAI Codex 등)이 생성한 빈 파일. 삭제 무방 |

### ⚙️ Git Ignore 권장
로컬 유지 필요하나 Git에 절대 커밋하지 않을 항목

| 항목 | 현재 상태 | 권장 조치 |
|------|----------|----------|
| `node_modules/` | ✅ 이미 적용 | 그대로 유지 |
| `.next/` | ✅ 이미 적용 | 그대로 유지 |
| `.netlify/` | ✅ 이미 적용 | 그대로 유지 |
| `.firebase/` | ⚠️ 부분 적용 | `hosting..cache`만 적용 → 폴더 전체로 확장 권장 |
| `relovetree-firebase-adminsdk-*.json` | ✅ 이미 적용 | 그대로 유지 |
| `relovetree.local.fossil` | ❌ 미적용 | **즉시 추가 필요** - Fossil DB (22MB) |
| `_FOSSIL_` | ❌ 미적용 | **즉시 추가 필요** - Fossil 상태 파일 (3.2MB) |
| `.codex` | ❌ 미적용 | **추가 권장** - 빈 파일이나 일관성 유지 |
| `.fslckout` | - | **추가 권장** - Fossil Windows 외 플랫폼 상태 파일 |

---

## 2. 우선 점검 대상 상세 분석

### `.next` (삭제 후보)
```
.total 8
drwxr-xr-x 1 limone 197612 0 Nov 28 13:21 .
drwxr-xr-x 1 limone 197612 0 Apr  8 12:57 ..
drwxr-xr-x 1 limone 197612 0 Nov 28 13:21 dev
```
- **분석**: 빈 dev 폴더만 존재하는 Next.js 빌드 캐시
- **결론**: 🔴 삭제 권장 - 현재 프로젝트 스택(바닐라 JS + Netlify Functions)과 무관

### `functions` (삭제 후보)
```
.total 36
drwxr-xr-x 1 limone 197612 0 Dec 15 16:04 .
drwxr-xr-x 1 limone 197612 0 Apr  8 12:57 ..
drwxr-xr-x 1 limone 197612 0 Dec  6 06:52 node_modules
```
- **분석**: 실제 코드 없이 node_modules만 존재하는 빈 껍데기
- **대비**: 실 백엔드 로직은 `netlify/functions/`에서 관리 중
- **결론**: 🔴 삭제 권장

### `simple-prototype` (아카이브 권장)
```
.editor.html    (37KB)
.index.html     (13KB)
.js/supabase-client.js  (6KB)
```
- **분석**: 초기 Supabase 기반 프로토타입 소스 코드
- **대비**: 현재는 Firebase + Netlify Functions 사용 중
- **결론**: 🟡 아카이브 권장 -メ인 디렉토리 바깥 `archive/` 폴더로 이동 권장

### `_FOSSIL_` (유지 + Git Ignore 필요)
- **분석**: Fossil SCM 체크아웃 상태 파일 (3.2MB)
- **용도**: Fossil 로컬 저장소
- **결론**: 🟢 로컬 유지, ⚙️ `.gitignore`에 추가 필수

### `relovetree.local.fossil` (유지 + Git Ignore 필요)
- **분석**: Fossil SCM 전체 데이터베이스 파일 (22MB)
- **용도**: Fossil 로컬 저장소
- **결론**: 🟢 로컬 유지, ⚙️ `.gitignore`에 추가 필수

### `.codex` (삭제 후보)
- **분석**: 0 byte 빈 파일 - AI 플러그인(Cline 등)이 생성한 찌꺼기
- **결론**: 🔴 삭제 권장

### `.firebase` (Ignore 또는 삭제)
```
total 84
.firebase/hosting..cache  (76KB)
```
- **분석**: Firebase CLI 배포 캐시 파일
- **결론**: ⚙️ `.gitignore`에 `.firebase/` 폴더 전체 추가 권장

### `.netlify` (Ignore 또는 삭제)
```
total 9
.netlify/state.json (54B)
```
- **분석**: Netlify CLI 상태 캐시
- **결론**: ⚙️ 이미 `.gitignore`에 포함되어 있음 (유지)

### `node_modules` (유지 + Git Ignore)
- **분석**: npm 패키지 의존성 (약 460개 패키지)
- **결론**: 🟢 로컬 유지, ⚙️ 이미 `.gitignore`에 포함 (유지)

### `relovetree-firebase-adminsdk-fbsvc-d8d4c96f15.json` (유지 + Git Ignore)
- **분석**: Firebase Admin 서비스 계정 키 (2.3KB)
- **중요**: 절대 삭제하지 말 것. 절대 Git/Fossil 원격에 올리지 말 것
- **결론**: 🟢 로컬 유지, ⚙️ 이미 `.gitignore`에 `relovetree-firebase-adminsdk-*.json`으로 적용 (유지)

---

## 3. `.gitignore` 개선안

현재 `.gitignore`에 누락된 항목을 추가한 개선안입니다.

```gitignore
# Fossil 공통 제외 - 바이너리 문서
*.pdf
*.hwp
*.hwpx
*.docx
*.xlsx
*.pptx

# Fossil 공통 제외 - 이미지
*.jpg
*.jpeg
*.png
*.gif
*.webp
*.svg
*.ico

# Fossil 공통 제외 - 영상/오디오
*.mp4
*.mov
*.avi
*.mp3
*.wav
*.m4a
*.flac

# Fossil 공통 제외 - 압축파일
*.zip
*.7z
*.rar
*.tar
*.gz

# 의존성 및 빌드 캐시
node_modules/
.next/
.netlify/

# Firebase
.env
.DS_Store
Thumbs.db
.firebase/        # <-- 변경: hosting..cache → 전체 폴더
relovetree-firebase-adminsdk-*.json

# Fossil SCM (Git/Fossil 병행 사용 시)
*.fossil          # Fossil 데이터베이스 파일
_FOSSIL_          # Fossil 체크아웃 상태
.fslckout         # Fossil 잠금 파일

# 에디터 임시 파일
.codex            # <-- 추가: AI 플러그인 찌꺼기
```

---

## 4. 즉시 정리 가능한 항목 vs 보류 항목

### ✅ 즉시 삭제해도 안전한 항목
- `.next/` (빈 빌드 캐시)
- `functions/` (빈 껍데기, 실제 코드는 `netlify/functions/`)
- `.codex` (0 byte 빈 파일)

### ⏸️ 보류해야 할 항목
- `simple-prototype/` (다른 작업자의 이전 작업일 수 있음 → 확인 후 아카이브)
- Fossil 관련 파일들 (`_FOSSIL_`, `relovetree.local.fossil`) - 사용 중인지 확인 필요

### 📋 확인 필요
- `.agent/workflows/` - 어떤 워크플로우가 있는지 확인 권장

---

## 5. 요약

| 분류 | 항목 수 | 비고 |
|------|---------|------|
| 🟢 유지 | 다수 | 핵심 소스코드 및 설정 |
| 🟡 아카이브 | 1개 | simple-prototype/ |
| 🔴 삭제 | 3개 | .next, functions, .codex |
| ⚙️ Git Ignore 추가 필요 | 3개 | _FOSSIL_, relovetree.local.fossil, .codex |

**권장 조치**: 삭제候选人 3개 (.next, functions, .codex)를 즉시 삭제하고, `.gitignore`에 Fossil 관련 항목 2개와 .firebase 폴더 전체를 추가하면 프로젝트 루트가 깔끔해집니다.
