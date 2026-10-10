# Carrega .env/.env.local no processo e sobe vercel dev (API + Vite).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$envFile = if (Test-Path ".env") { ".env" } elseif (Test-Path ".env.local") { ".env.local" } else {
  throw "Nenhum arquivo .env ou .env.local encontrado."
}

Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
  $i = $line.IndexOf("=")
  $key = $line.Substring(0, $i).Trim()
  $value = $line.Substring($i + 1).Trim()
  if (
    ($value.StartsWith('"') -and $value.EndsWith('"')) -or
    ($value.StartsWith("'") -and $value.EndsWith("'"))
  ) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  Set-Item -Path "Env:$key" -Value $value
}

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL ausente em $envFile"
}

npx.cmd vercel dev --listen 3000 --yes
