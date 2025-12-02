# relovetree 프로젝트 전용 Firebase 배포 스크립트
# 사용 방법 예시:
#   .\deploy.ps1 -Token "1//...FirebaseCIToken..."
# 또는 PowerShell 세션에서 먼저:
#   $env:FIREBASE_TOKEN = "1//...FirebaseCIToken..."
#   .\deploy.ps1

param(
    [string]$Token = $env:FIREBASE_TOKEN
)

if (-not $Token) {
    Write-Host "FIREBASE_TOKEN 이 설정되어 있지 않습니다. Firebase CI 토큰을 입력해 주세요." -ForegroundColor Yellow
    $Token = Read-Host "Firebase CI Token"
}

$env:FIREBASE_TOKEN = $Token

npm run build

# relovetree 프로젝트로 배포
npx firebase-tools deploy --only hosting --project relovetree
