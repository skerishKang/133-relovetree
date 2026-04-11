# VCS Commit / Push Worker Prompt

아래 프롬프트를 다른 모델에게 그대로 전달하면 된다.

```text
이번 작업은 코드 수정이 아니라 VCS 정리 작업이다.

반드시 먼저 읽을 문서:
1. docs/plans/VCS_COMMIT_PUSH_WORKFLOW.md
2. AGENTS.md

이번 저장소의 VCS 구조:
- Fossil = 로컬 스냅샷
- Git = 공유용 커밋
- GitHub push는 현재 SSH remote 기준

중요:
- 무조건 바로 push 하지 말 것
- 먼저 현재 변경 상태를 점검하고,
  Fossil snapshot / Git commit / Git push 중 어디까지 할지 판단해야 한다

반드시 먼저 실행할 것:
1. `git branch --show-current`
2. `git status --short`
3. `git remote -v`
4. `fossil info`
5. `fossil status`

그 다음 아래를 먼저 출력:
1. 현재 브랜치
2. Git 변경 파일 요약
3. Fossil checkout 활성 여부
4. remote가 SSH인지 HTTPS인지
5. 지금 단계에서 Fossil snapshot만 해야 하는지, Git commit까지 해야 하는지, push까지 가능한지 판단

작업 규칙:
- Fossil snapshot은 먼저 한다
- Git commit은 공유 가능한 변경일 때만 한다
- Git push는 사용자가 명시적으로 원하거나, 현재 작업이 공유 준비 상태일 때만 한다
- 커밋 메시지는 작업 내용을 반영해 구체적으로 쓴다
- 비대화형 명령만 사용한다

표준 명령:
- Fossil:
  - `fossil addremove`
  - `fossil commit -m "local snapshot: ..."`
- Git:
  - `git add -A`
  - `git commit -m "..."`
  - `git push origin main`

주의:
- 이 저장소의 remote가 SSH면 토큰을 찾지 말고 SSH push 가능 여부를 먼저 본다
- 무의미한 스크린샷/임시 파일까지 자동으로 올리지 말고 `git status --short` 결과를 보고 판단한다

최종 보고 형식:
1. 실행한 명령
2. Fossil snapshot 여부
3. Git commit 여부
4. Git push 여부
5. 커밋 메시지
6. 남은 리스크 또는 보류 이유
```
