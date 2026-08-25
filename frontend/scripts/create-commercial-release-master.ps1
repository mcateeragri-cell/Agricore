param([string]$Source="C:\projects\Agricore",[string]$Destination="$env:USERPROFILE\Downloads\AgriCore-Commercial-Release-Master.zip")
$stage=Join-Path ([System.IO.Path]::GetTempPath()) "agricore-commercial-release-stage"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $Destination -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $stage | Out-Null
robocopy $Source $stage /E /XD node_modules .next .git .vercel build dist .gradle .idea /XF .env .env.local .env.development.local .env.production.local keystore.properties *.jks *.keystore *.pem *.p12 *.pfx *.log
if($LASTEXITCODE -gt 7){throw "Robocopy failed with exit code $LASTEXITCODE"}
$sensitive=Get-ChildItem $stage -Recurse -Force -File | Where-Object {$_.Name -match '^(keystore\.properties|\.env(\..*)?)$' -or $_.Extension -in @('.jks','.keystore','.p12','.pfx','.pem')}
if($sensitive){$names=($sensitive.FullName -join "`n");Remove-Item $stage -Recurse -Force;throw "Sensitive files found in staged release archive:`n$names"}
Compress-Archive -Path "$stage\*" -DestinationPath $Destination -CompressionLevel Optimal
Remove-Item $stage -Recurse -Force
Write-Host "Commercial release ZIP created safely: $Destination"
