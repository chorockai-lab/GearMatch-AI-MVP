# Safe key entry for the PostHog dashboards: hidden prompt, key kept only in this process, removed at the end.
# Run:  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\posthog\run-dashboard.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\..')

Write-Host ''
Write-Host '[1/2] PostHog API compatibility check (no key needed)'
npm run posthog:check
if ($LASTEXITCODE -ne 0) { Write-Host 'Compatibility check FAILED - dashboards were NOT created.'; exit 1 }

Write-Host ''
Write-Host '[2/2] Copy the key in PostHog first, then paste it here (phx_...) and press Enter.'
Write-Host '      Input is hidden. It is kept only in this process memory and is not saved to history or files.'
for ($try = 1; $try -le 3; $try++) {
  $secure = Read-Host 'PostHog Personal API key' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $env:POSTHOG_PERSONAL_API_KEY = ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)).Trim()
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
  if ($env:POSTHOG_PERSONAL_API_KEY -cmatch '^phx_[A-Za-z0-9]+$') { break }
  Remove-Item Env:POSTHOG_PERSONAL_API_KEY -ErrorAction SilentlyContinue
  Write-Host '      Not a personal API key (must start with phx_, one line, no spaces). Nothing was sent.'
  if ($try -lt 3) { Write-Host ('      Try again (' + ($try + 1) + '/3).') }
}
if (-not $env:POSTHOG_PERSONAL_API_KEY) { Write-Host 'No valid key - dashboards were NOT created.'; exit 2 }

try {
  npm run posthog:dashboard
  $code = $LASTEXITCODE
} finally {
  Remove-Item Env:POSTHOG_PERSONAL_API_KEY -ErrorAction SilentlyContinue
  $secure = $null
  Write-Host ''
  Write-Host 'Key removed from this process.'
}
Write-Host ('DONE exit=' + $code)
exit $code
