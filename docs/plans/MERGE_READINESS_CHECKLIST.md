# 병합 준비 체크리스트 (Merge Readiness Checklist)

작성일: 2026-04-08
대상 문서 및 작업: `docs/analysis/FILE_AUDIT_REPORT_V2.md`, `docs/plans/MODAL_UX_IMPROVEMENT_PLAN.md`, Postgres/Firestore 마이그레이션 및 Compat 레이어 작업

---

## 1. 지금 병합 가능한 것 (Ready to Merge)
운영 환경에 직접적인 영향을 주지 않는 분석 문서와 독립적인 마이그레이션 스크립트는 즉시 병합 가능합니다.

*   **문서류**: 
    *   `docs/analysis/FILE_AUDIT_REPORT.md` / `docs/analysis/FILE_AUDIT_REPORT_V2.md`
    *   `docs/plans/MODAL_UX_IMPROVEMENT_PLAN.md`
    *   `docs/migration/POSTGRES_MIGRATION.md`
    *   `docs/analysis/INTEGRATION_REVIEW_POSTGRES_FIRESTORE_COMPAT.md`
*   **마이그레이션 도구**: 
    *   `scripts/migration/` 하위 파일 일체 (`schema.sql`, `migrate.js`, `verify.js`, `README.md`, `.env.example`)
    *   *이유*: 프론트엔드/백엔드 메인 코드와 독립적으로 실행되는 스크립트이므로 안전합니다.

---

## 2. 수정 후 병합 가능한 것 (Mergeable After Fixes)
**Postgres/Firestore-Compat 백엔드 구현물** (`netlify/functions/_lib/*`, `src/firebase-firestore-compat.js` 등)
현재 상태로 병합할 경우 치명적인 데이터 오염 및 보안 이슈가 발생할 수 있습니다. `INTEGRATION_REVIEW` 문서에 지적된 **치명/높음** 이슈를 반드시 해결한 후 병합해야 합니다.

*   **[필수] 보안**: `users` 컬렉션 쓰기 권한을 화이트리스트로 제한. (현재 클라이언트에서 `role: 'admin'`, `isPro: true` 등 임의 조작 가능)
*   **[필수] 데이터 무결성**: 서브컬렉션(댓글) SQL 테이블의 PK를 단일 `id`에서 복합키(`parent_id`, `id`)로 변경. (현재 다른 부모의 동일 ID 댓글이 덮어써지는 버그 존재)
*   **[필수] 트랜잭션**: `runTransaction`의 원자성(Read-after-Write) 보장 로직 구현. (현재 커뮤니티 카운트 동시성 문제 발생 가능)
*   **[필수] 한도 제한**: `collection().get()`의 기본 50건 제한 제거 또는 명시적 페이징 처리. (현재 관리자 페이지 통계 및 목록 조회 시 51건부터 누락됨)

---

## 3. 병합 금지 항목 (DO NOT Merge)
원격 저장소(Git)나 메인 브랜치에 절대 포함되어서는 안 되는 파일들입니다. PR(Pull Request)에서 이 항목들이 포함되어 있다면 반드시 제외해야 합니다.

*   **보안 자격 증명**: `relovetree-firebase-adminsdk-fbsvc-d8d4c96f15.json` (Firebase 서비스 계정 키)
*   **로컬 버전 관리 파일**: `relovetree.local.fossil`, `_FOSSIL_`
*   **로컬 캐시 및 에디터 찌꺼기**: `.firebase/`, `.netlify/`, `.codex`
*   **수정되지 않은 호환성 코드**: 위 2번의 치명적 결함이 수정되지 않은 `firebase-firestore-compat.js` 및 관련 서버리스 함수들.

---

## 4. 병합 후 바로 해야 할 정리 작업 (Immediate Post-Merge Cleanup)
파일 구조 감사 결과에 따라 프로젝트 환경을 깨끗하게 정리합니다.

1.  **가비지 파일 즉시 삭제**:
    *   `.next/` 폴더 전체 삭제
    *   `functions/` 폴더 (내부 빈 `node_modules` 포함) 전체 삭제
    *   `.codex` 파일 삭제
2.  **아카이브 이동**:
    *   `simple-prototype/` 폴더를 루트에서 분리하여 `archive/` 등의 디렉토리로 격리 (또는 프로젝트 구조 가독성을 위해 압축 후 삭제)
3.  **`.gitignore` 강화**:
    *   보고서의 개선안을 참고하여 누락된 찌꺼기 파일 및 Fossil 관련 파일 제외 규칙 추가.
4.  **배포 환경 설정 점검**:
    *   백엔드 배포 전 `.env`에 `DATABASE_URL` 및 서비스 계정 키 환경 변수가 올바르게 설정되어 있는지 확인 (미설정 시 서버 런타임에서 즉시 크래시 나도록 안전장치 필요).

---

## 5. 병합 후 UI 작업 순서 (Post-Merge UI Tasks)
`docs/plans/MODAL_UX_IMPROVEMENT_PLAN.md`에 명시된 작업 단위에 따라 설정 모달(Settings Modal) 개선을 진행합니다.

*   **1순위 (즉시 실행 - 마크업/스타일 중심)**
    *   메뉴 아이콘(SVG) 추가로 직관성 개선
    *   테마 이미지의 영어 `alt` 텍스트를 한국어('해변', '우주' 등)로 변경
    *   Pro 멤버십 설명을 불릿 리스트 혜택으로 명확하게 수정
    *   계정/메뉴/배경/백업 섹션 헤더의 위계 및 간격(UI) 강화
*   **2순위 (후순위 실행 - JS 상태/로직 연동 중심)**
    *   현재 사용 중인 배경(테마/단색)의 버튼 활성화(Active/Ring) 상태 표시
    *   파괴적 액션('로그아웃', '초기화', '불러오기') 실행 시 안전 확인(Confirm) 다이얼로그 추가
    *   커스텀 배경 드롭존 드래그-오버 시각적 피드백 및 선택 파일명 표시 로직 구현
