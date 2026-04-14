# DOCUMENT_RESTRUCTURE_EXECUTION_NOTE

본 문서는 Lovetree 프로젝트의 문서 체계 정상화 및 효율적 관리를 위한 실행 설계안입니다.

---

## 1. 현재 문서 체계 문제 진단
*   **Encoding Problem**: `docs/product/` 내 5개 핵심 문서 및 `docs/ops/` 일부 문서가 EUC-KR로 저장되어 UTF-8 환경에서 깨짐 발생.
*   **Design Gap**: 프로젝트의 디자인 원칙을 통합적으로 담은 `UI_DESIGN_SYSTEM.md`가 존재하지 않음.
*   **Tree Disarray**: 기능별 분류가 아닌 생성 시점별 분류로 인해 개발자 및 AI 에이전트의 문서 탐색 효율 저하.

## 2. 새 docs 트리 제안 (5축 분류 체계)
```
docs/
├── product/              # 제품 기획 (비전, 범위, 유저 플로우)
│   ├── PRODUCT_IDENTITY.md
│   ├── MVP_SCOPE.md
│   ├── USER_FLOW.md
│   └── DATA_NAMING_RULE.md
│
├── design/               # 디자인/UI 규칙 (신설)
│   ├── UI_DESIGN_SYSTEM.md
│   └── CSS_ARCHITECTURE.md
│
├── engineering/          # 기술/구현 (기존 ops에서 이식)
│   ├── PR_CHECKLIST.md
│   ├── CACHE_POLICY.md
│   └── EDITOR_ARCHITECTURE.md
│
├── operations/           # 운영/배포/릴리스
│   ├── DEPLOYMENT.md (OPS+RUNBOOK 통합)
│   └── RELEASE_NOTES/
│
└── archive/              # 레거시/과거분석
    ├── legacy/
    └── old_plans/
```

## 3. 5일 실행 계획 (Restoration Roadmap)

| 요일 | 목표 | 상세 작업 |
| :--- | :--- | :--- |
| **Day 1** | **Identity 수복** | `PRODUCT_IDENTITY.md` 인코딩 수리 및 내용 최신화 (완료) |
| **Day 2** | **핵심 기획 복구** | `MVP_SCOPE`, `USER_FLOW`, `DATA_NAMING_RULE` 수리 |
| **Day 3** | **운영 통합** | `OPERATIONS.md`와 `RUNBOOK.md`를 `DEPLOYMENT.md`로 통합 재작성 |
| **Day 4** | **디자인 시스템** | `UI_DESIGN_SYSTEM.md` 정밀화 및 `CSS_ARCHITECTURE` 신설 |
| **Day 5** | **물리적 트리 재편** | 폴더 생성 및 파일 이동, `archive/` 정리 |

## 4. 즉시 실행 사항
- [x] `PRODUCT_IDENTITY.md` 작성
- [x] `UI_DESIGN_SYSTEM.md` 작성
- [x] `DOCUMENT_RESTRUCTURE_EXECUTION_NOTE.md` 작성

---

## 5. 다음 단계 추천 (Next Step)
본 문서의 계획에 따라 **`MVP_SCOPE.md`**와 **`USER_FLOW.md`**의 인코딩 수리 및 내용 동기화를 다음 작업으로 진행할 것을 추천합니다. 
이를 통해 제품의 비전(Identity)과 디자인(UI)이 실제 구현 범위(Scope)와 어떻게 연결되는지 정의할 수 있습니다.
