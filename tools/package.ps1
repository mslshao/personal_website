$ErrorActionPreference = 'Stop'
$siteRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$releaseRoot = Join-Path $siteRoot 'release'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$stage = Join-Path $siteRoot ".local\releases\$stamp\upload"
New-Item -ItemType Directory -Force -Path $stage,$releaseRoot | Out-Null

# Deliberate allowlist: archived code, originals, local notes, and tools stay local.
$files = @('index.html','styles.css','site.js','favicon-32.png','ms-resume.pdf',
    'google3e7e3594d3bac0bb.html','robots.txt','sitemap.xml')
foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path $siteRoot $file) -Destination (Join-Path $stage $file)
}
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'images') | Out-Null
Copy-Item -LiteralPath (Join-Path $siteRoot 'images\optimized') -Destination (Join-Path $stage 'images\optimized') -Recurse
Copy-Item -LiteralPath (Join-Path $siteRoot 'fonts') -Destination (Join-Path $stage 'fonts') -Recurse
$zip = Join-Path $releaseRoot 'site-upload.zip'
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
$manifest = Get-ChildItem -LiteralPath $stage -Recurse -File | ForEach-Object {
    [PSCustomObject]@{
        File = $_.FullName.Substring($stage.Length + 1).Replace('\','/')
        Bytes = $_.Length
        SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
    }
}
$manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $releaseRoot 'manifest.json') -Encoding UTF8
Write-Output "Upload package: $zip"
Write-Output "Files: $($manifest.Count); zip size: $((Get-Item -LiteralPath $zip).Length) bytes"
