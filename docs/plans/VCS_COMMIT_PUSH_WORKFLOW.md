# VCS Commit / Push Workflow

## 목적

이 저장소에서 Fossil 로컬 스냅샷과 Git/GitHub 공유 커밋을 일관되게 처리하기 위한 작업 절차를 정의한다.

## 현재 저장소 상태

- Fossil checkout: 활성
- Fossil repository: `relovetree.local.fossil`
- Git branch: `main`
- Git remote: `origin -> git@github.com-padiem:skerishKang/133-relovetree.git`

즉, 이 저장소는 다음 두 층을 가진다.

- Fossil: 로컬 스냅샷 히스토리
- Git: 공유용 히스토리 / GitHub push

## 원칙

1. 먼저 Fossil에 로컬 스냅샷을 남긴다.
2. 그 다음 Git 커밋을 만든다.
3. 공유 준비가 된 경우에만 GitHub로 push 한다.

## Fossil 단계

Git에 올리지 않을 파일까지 포함해 로컬 복구 지점을 남기고 싶을 때 먼저 Fossil을 쓴다.

기본 명령:

```bash
fossil status
fossil addremove
fossil commit -m "local snapshot: summarize the work"
```

주의:

- Fossil commit은 로컬 복구용이다.
- Fossil 메시지는 짧아도 되지만 작업 블록이 무엇인지 명확해야 한다.

## Git 단계

GitHub에 공유할 변경이 준비됐으면 Git 커밋을 만든다.

기본 명령:

```bash
git status --short
git add -A
git commit -m "..."
```

권장:

- 커밋 전에 `git status --short`로 변경 파일을 확인한다.
- 커밋 메시지는 기능/의도를 바로 알 수 있게 쓴다.

## GitHub Push 단계

현재 remote는 SSH alias 기반이다.

```bash
git remote -v
```

현재 기준:

```bash
origin  git@github.com-padiem:skerishKang/133-relovetree.git
```

즉, 로컬 SSH 설정이 이미 되어 있다면 토큰 없이도 다음 명령으로 push 가능하다.

```bash
git push origin main
```

## 토큰 관련 정리

이 저장소의 현재 remote는 HTTPS 토큰 방식이 아니라 SSH 방식이다.

따라서:

- SSH alias `github.com-padiem` 이 로컬에 설정되어 있으면 토큰이 없어도 push 가능
- SSH가 안 되면 그때만 HTTPS + token 방식을 별도로 구성해야 함

즉, 다른 모델이 무조건 토큰을 찾을 필요는 없다.
먼저 `git remote -v` 를 보고 SSH인지 확인해야 한다.

## 작업자 기본 점검 순서

1. 현재 브랜치 확인

```bash
git branch --show-current
```

2. Git 변경 확인

```bash
git status --short
```

3. Fossil checkout 확인

```bash
fossil info
```

4. Fossil 로컬 스냅샷

```bash
fossil addremove
fossil commit -m "local snapshot: ..."
```

5. Git 커밋

```bash
git add -A
git commit -m "..."
```

6. GitHub push

```bash
git push origin main
```

## 작업자에게 중요한 주의사항

- Fossil commit과 Git commit은 역할이 다르다.
- Fossil은 로컬 복구 지점이다.
- Git은 공유용이다.
- push 전에 반드시 `git status --short`로 포함 파일을 확인한다.
- 자동 생성 산출물, 임시 스크린샷, 테스트 파일은 의도적으로 포함할지 먼저 판단한다.

## 지금 단계에서 다른 모델에게 기대하는 것

다른 모델은 다음을 먼저 판단해야 한다.

1. 지금 변경이 Fossil snapshot만 필요한지
2. Git commit까지 갈 준비가 됐는지
3. GitHub push까지 해도 되는 상태인지

이 3가지를 구분하지 못하면 커밋/푸시를 바로 하면 안 된다.
