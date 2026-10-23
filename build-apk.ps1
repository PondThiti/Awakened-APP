$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$toolsDir = Join-Path $projectRoot ".build-tools"
$jdkDir = Join-Path $toolsDir "jdk"
$sdkDir = Join-Path $toolsDir "android-sdk"
$gradleHome = Join-Path $toolsDir ".gradle"

$env:JAVA_HOME = $jdkDir
$env:ANDROID_HOME = $sdkDir
$env:ANDROID_SDK_ROOT = $sdkDir
$env:GRADLE_USER_HOME = $gradleHome
$env:GRADLE_OPTS = "-Djava.net.preferIPv4Stack=true"
$env:PATH = "$jdkDir\bin;$sdkDir\platform-tools;$env:PATH"

Write-Host "Building Awakened - Life RPG Release APK (strictly isolated in project folder)..."
Push-Location (Join-Path $projectRoot "android")
try {
  .\gradlew.bat assembleRelease --no-daemon --console=plain
  if ($LASTEXITCODE -ne 0) {
    throw "Gradle assembleRelease failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

$apkSource = Join-Path $projectRoot "android\app\build\outputs\apk\release\app-release.apk"
$apkDest = Join-Path $projectRoot "Awakened-Life-RPG.apk"

if (Test-Path $apkSource) {
  Copy-Item -Path $apkSource -Destination $apkDest -Force
  $sizeMb = [Math]::Round((Get-Item $apkDest).Length / 1MB, 2)
  Write-Host "[OK] APK Built Successfully: $apkDest ($sizeMb MB)"
} else {
  throw "APK output not found at $apkSource"
}
