# Build and publish dist/ to the gh-pages branch.
#
# Used instead of a GitHub Actions workflow because the gh CLI token lacks `workflow` scope.
# To switch to build-on-push later:
#   gh auth refresh -s workflow
#   mkdir .github\workflows; move scripts\github-pages-workflow.yml.txt .github\workflows\deploy.yml
#   git add .github; git commit -m "Deploy via Actions"; git push
#
# Usage:  npm run deploy
#
# Note: git writes progress to stderr, which PowerShell surfaces as an error record. Never pipe
# native commands through 2>&1 here; check $LASTEXITCODE instead.
$ErrorActionPreference = 'Continue'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Invoke-Step($what, [scriptblock]$block) {
  & $block
  if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE)" }
}

Write-Host '== building' -ForegroundColor Cyan
Invoke-Step 'build' { npx vite build --outDir dist }

# .nojekyll stops GitHub Pages from dropping files and folders that begin with an underscore.
New-Item -ItemType File -Path dist/.nojekyll -Force | Out-Null

$stamp = Get-Random
$work = Join-Path $env:TEMP "dr-gh-pages-$stamp"
$tmpBranch = "deploy-$stamp"   # throwaway, so a local gh-pages ref can never collide
Write-Host '== publishing to gh-pages' -ForegroundColor Cyan
Invoke-Step 'worktree add' { git worktree add --detach $work --no-checkout }
try {
  Set-Location $work
  Invoke-Step 'orphan branch' { git checkout --orphan $tmpBranch }
  git reset --hard | Out-Null
  Get-ChildItem -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force
  Copy-Item -Path (Join-Path $root 'dist/*') -Destination $work -Recurse -Force
  Invoke-Step 'stage' { git add -A }
  $sha = (git -C $root rev-parse --short HEAD)
  Invoke-Step 'commit' { git -c user.name='Kyle Grubb' -c user.email='grubber788@gmail.com' commit -q -m "Deploy $sha" }
  Invoke-Step 'push' { git push -f origin "HEAD:gh-pages" }
} finally {
  Set-Location $root
  git worktree remove --force $work
  git worktree prune
  git branch -D $tmpBranch 2>$null | Out-Null
}
Write-Host '== done' -ForegroundColor Green
