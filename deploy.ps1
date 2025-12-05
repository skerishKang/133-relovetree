# relovetree 프로젝트 전용 Firebase 배포 스크립트
# 사용 방법 예시:
#   .\deploy.ps1 -Token "1//...FirebaseCIToken..."
# 또는 PowerShell 세션에서 먼저:
#   $env:FIREBASE_TOKEN = "1//...FirebaseCIToken..."
#   .\deploy.ps1

npm run build

# relovetree 프로젝트로 배포
npx firebase-tools deploy --only hosting --project relovetree
