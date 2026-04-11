# 다음 개발 실행 큐 (NEXT BUILD QUEUE)

## 1. 개요

이 문서는 Lovetree의 서비스 완성을 위한 명확한 실행 순서를 정의합니다. `Flow A`의 안정화와 제품 정체성 구현을 최우선으로 합니다.

---

## 2. 이번 주 바로 할 작업 (STEP 1)

### 2.1 Flow A 프로덕션 신뢰성 확보

| 작업 | 영향 파일 | 검증 필요 | 유형 |
|------|-----------|-----------|------|
| **QA-01**: Flow A 핵심 흐름 브라우저 QA | `pages/*.html`, `src/*.js` | ✅ 수동 체크리스트 | 무료모델 적합 |
| **DATA-01**: timestamp 필드 및 데이터 정합성 보정 | `src/flow-shared.js`, `src/mobile-add-memory.js` | ✅ DB 실제 저장 확인 | 사람 직접 |
| **DATA-02**: 데이터 레이어 명칭 혼선 제거 (문서) | `docs/product/DATA_MODEL_DRAFT.md` | ✅ 문서 검사 | 사람 직접 |

**바로 실행 가능:**
1. `docs/ops/FLOW_A_QA_CHECKLIST.md` 기반 로컬/프로덕션 테스트
2. timestamp 입력 → DB 저장 확인
3. 문서 내 Firestore 용어 Postgres로统一

---

## 3. 다음 라운드 작업 (STEP 2)

### 3.1 UI/UX 고도화

| 작업 | 영향 파일 | 검증 필요 | 유형 |
|------|-----------|-----------|------|
| **UI-01**: mobile-tree 연결선 시각화 | `src/mobile-tree.js`, `.css` | ✅ 시각적 대조 | 무료모델 적합 |
| **UI-02**: 에디터 카드 디자인 고밀도 레이아웃 | `pages/editor.html`, `assets/css/editor-*.css` | ✅ 브라우저 캡처 | 무료모델 적합 |
| **UX-01**: 에디터 노드 자동 배치 알고리즘 | `src/flow-shared.js` | ✅ 노드 겹침 테스트 | 무료모델 적합 |

### 3.2 공유 및 탐색 (MVP 후반)

| 작업 | 영향 파일 | 검증 필요 | 유형 |
|------|-----------|-----------|------|
| **AUTH-01**: 읽기 전용/편집 모드 분기 | `src/editor-data.js` | ✅ 세션 전환 테스트 | 사람 직접 |
| **COMM-01**: community-tree-detail 전체 트리 뷰 | `pages/community-tree-detail.html` | ✅ 경로 흐름 확인 | 무료모델 적합 |
| **COMM-02**: 커뮤니티 트리 카드 그리드 | `pages/community.html` | ✅ 리스트 로딩 테스트 | 무료모델 적합 |

---

## 4. 보류 작업 (Backlog)

| 작업 | 이유 | 시기 |
|------|------|------|
| 굿즈/공연 정보 연동 | MVP 범위 아님 | MVP 완성 후 |
| AI 추천 시스템 | 기본 기록 루프 완성 후 | 나중에 논의 |
| 다중 트리 템플릿 | 확장 가능성 검토 | MVP 이후 |
| 결제/과금 시스템 | 기록 경험 완성 후 | 나중에 |

---

## 5. 무료모델 vs 사람 직접 작업 구분

### 5.1 무료모델에게 맡기기 좋은 작업

| 작업 | 이유 |
|------|------|
| QA 테스트 케이스 실행 | 명확한 체크리스트, 반복 작업 |
| CSS 스타일/시각화 적용 | 시안 기반, 변경 명확 |
| community-tree-detail 페이지 구현 | 시안参照, 독립적 작업 |
| 노드 자동 배치 알고리즘 | 알고리즘 작업, 명확한 요구사항 |

### 5.2 사람이 직접 확인해야 할 작업

| 작업 | 이유 |
|------|------|
| timestamp DB 저장 검증 | 실제 데이터 저장소 확인 필요 |
| 데이터 모델 보정 | 현재 코드 분석, 영향 범위 파악 |
| 읽기 전용 보안 | 접근 제어, 보안 관련 |
| 전체 QA 조정 | 여러 파일 통합, 통합 검증 |

---

## 6. 지금 하지 말아야 할 것

### 6.1 대규모 파일 rename
- `firebase-firestore-compat.js` → `postgres-client.js`
- `firestore-api.js` → `db-api.js`
- 이유: 현재 구현 안정성 우선, 장기 마이그레이션

### 6.2 과금/결제
- 이유: MVP 범위 아님

### 6.3 장터/굿즈/모임
- 이유: "입덕 → 연결 → 공유" 핵심 경험 먼저

### 6.4 AI 고도화
- 이유: 기본 기능 완성 후

---

**참조:**
- `docs/ops/FLOW_A_QA_CHECKLIST.md` - 즉시 실행 QA 기준
- `docs/product/FRONTEND_BASELINE.md` - UI 마이그레이션 기준
- `docs/product/MVP_SCOPE.md` - 전체 범위 기준
- `docs/product/DATA_MODEL_DRAFT.md` - 데이터 모델