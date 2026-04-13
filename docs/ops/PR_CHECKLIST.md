# Lovetree PR 체크리스트

## 1. 공통 필수 체크리스트 (모든 PR)

### Before PR
- [ ] 변경된 파일이 의도한 범위인지 확인
- [ ] console.log / debug 코드 제거 여부 확인
- [ ] 커밋 메시지가 작업 내용을 명확히 설명하는가

### Description 필수 항목
```
## 변경 요약
- 무엇을 변경했는가

## 변경된 파일
- src/xxx.js
- pages/xxx.html

## 테스트
- [ ] smoke 테스트 통과 확인
- [ ] 로컬에서 수동 테스트 완료 (해당 시)
```

---

## 2. Editor 변경 시 체크리스트

### 필수 테스트 실행
```bash
npm run test -- --grep "Editor"
```
**통과 기준**: 10개 이상 테스트 통과

### 테스트 파일 상태 확인
- `tests/editor-smoke.spec.js` - shell init, permission, navigation
- `tests/editor-fieldvalue.spec.js` - FieldValue 패턴 검증

### Editor 변경 시 주의사항
- ⚠️ editor-runtime.js, editor-data.js 변경 시 반드시 smoke 테스트 통과 확인
- ⚠️ FieldValue 관련 변경 시 editor-fieldvalue.spec.js 테스트 확인
- ⚠️ shared-layout.js 의존 시 shared 변경 체크리스트도 확인

### 검수 포인트
- [ ] editor-shell 초기화 정상 동작 확인
- [ ] 로그인/비로그인 시 권한 동작 확인
- [ ] 에디터 내비게이션 (home/back) 정상 동작 확인

---

## 3. Shared/Standard Page 변경 시 체크리스트

### 필수 테스트 실행
```bash
npm run test -- --grep "Lovetree"
```
**통과 기준**: smoke.spec.js 핵심 시나리오 통과

### 테스트 파일 상태 확인
- `tests/smoke.spec.js` - home, community, my-trees, login
- `tests/editor-smoke.spec.js` - editor shell (공용 의존성 확인용)

### 영향받는 페이지
- index.html
- pages/lovetree.html
- pages/community.html
- pages/my-trees.html

### 검수 포인트
- [ ] 모든 표준 페이지에서 auth UI 정상 동작
- [ ] "로그인" → "내 트리" 전환 정상
- [ ] 로그아웃 버튼 show/hide 정상
- [ ] initStandardAuthUI 옵션 변경 시 페이지별 동작 확인

---

## 4. Merge Gate 제안

### Merge 가능 조건 (모두 충족)
1. ✅ CI/CD 파이프라인 통과 (Smoke 테스트)
2. ✅ PR description 필수 항목 포함
3. ✅ 최소 1명 Approve 획득
4. ✅ 테스트 실패 관련 코멘트 해결 완료

### Smoke 테스트 실패 시 처리 원칙
1. **Flaky 판단**: 같은 테스트가 2회 연속 실패 시 재진행
2. **핵심 테스트**: editor-shell, auth-flow 실패 시 merge 차단
3. **UI 테스트**: 시각적 표시 실패는 수동 확인 후 Approve 가능
4. **백로그**: 실패 시 이슈로 등록하고 우선순위 판단

### Merge Gate 명령어
```bash
# 전체 테스트
npm run test

# Editor 전용
npm run test -- --grep "Editor"

# Smoke 전용  
npm run test -- --grep "Smoke"
```

---

## 5. 테스트 우선순위

| 우선순위 | 테스트 | 통과 기준 |
|----------|--------|-----------|
| 1 | editor-shell-init | 필수 |
| 2 | editor-permission | 필수 |
| 3 | auth-flow-정상 | 필수 |
| 4 | standard-page-load | 필수 |
| 5 | FieldValue-pattern | 권장 |
| 6 | visual-render | 선택 |

---

## 6. 빠른 참조 명령어

```bash
# 전체 테스트
npm run test

# Editor 테스트
npm run test -- --grep "Editor"

# Standard Page 테스트
npm run test -- --grep "Lovetree"

# FieldValue 검증
npm run test -- --grep "FieldValue"
```