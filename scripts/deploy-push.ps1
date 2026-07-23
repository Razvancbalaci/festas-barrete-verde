# Deploy da Edge Function send-push + secrets VAPID
# Corre no PowerShell, na pasta do projeto:
#   .\scripts\deploy-push.ps1
#
# Precisas de estar autenticado: npx supabase login

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path .env)) {
  Write-Error "Falta o ficheiro .env"
}

Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $pair = $_.Split('=', 2)
  if ($pair.Length -eq 2) {
    [Environment]::SetEnvironmentVariable($pair[0].Trim(), $pair[1].Trim(), 'Process')
  }
}

$pub = $env:VITE_VAPID_PUBLIC_KEY
$priv = $env:VAPID_PRIVATE_KEY
$subj = $env:VAPID_SUBJECT
if (-not $subj) { $subj = "mailto:admin@festasbarreteverde.pt" }

if (-not $pub -or -not $priv) {
  Write-Error "Faltam VITE_VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY no .env"
}

Write-Host "A ligar ao projeto..."
npx supabase link --project-ref lhfyrbqlsrqbrqggyajh

Write-Host "A definir secrets..."
npx supabase secrets set `
  "VAPID_PUBLIC_KEY=$pub" `
  "VAPID_PRIVATE_KEY=$priv" `
  "VAPID_SUBJECT=$subj"

Write-Host "A fazer deploy de send-push..."
npx supabase functions deploy send-push --no-verify-jwt

Write-Host ""
Write-Host "Feito. Testa no admin → Avisos → Enviar a todos."
