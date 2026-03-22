# =============================================================================
#  V2 Fashion - Production Deploy Script (Windows PowerShell)
#  Usage: .\deploy.ps1
#  Requirements: git, node, npm, pm2 (installed globally)
#  Install PM2 globally: npm install -g pm2
# =============================================================================

$ErrorActionPreference = "Stop"

# ---- Config ------------------------------------------------------------------
$RepoDir     = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BackendDir  = Join-Path $RepoDir "backend"
$FrontendDir = Join-Path $RepoDir "frontend"
$LogDir      = Join-Path $RepoDir "logs"

function log  { param($msg) Write-Host "[V2] $msg" -ForegroundColor Cyan }
function ok   { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function warn { param($msg) Write-Host "[!!] $msg" -ForegroundColor Yellow }

# ---- Step 0: Create logs directory -------------------------------------------
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "      V2 Fashion - Production Deploy         " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# ---- Step 1: Pull latest changes ---------------------------------------------
log "Pulling latest changes from GitHub..."
git -C $RepoDir pull origin main
ok "Repository updated"

# ---- Step 2: Install backend dependencies ------------------------------------
log "Installing backend dependencies..."
Set-Location $BackendDir
npm ci
ok "Backend dependencies installed"

# ---- Step 3: Install frontend dependencies -----------------------------------
log "Installing frontend dependencies..."
Set-Location $FrontendDir
npm ci
ok "Frontend dependencies installed"

# ---- Step 4: Build frontend -> outputs to backend/public/ --------------------
log "Building frontend (Vite)..."
npm run build
ok "Frontend built -> backend/public/"

# ---- Step 5: Compile backend TypeScript --------------------------------------
log "Compiling backend TypeScript..."
Set-Location $BackendDir
npm run build
ok "Backend compiled -> backend/dist/"

# ---- Step 6: Validate .env exists --------------------------------------------
$envFile = Join-Path $BackendDir ".env"
if (-not (Test-Path $envFile)) {
    warn ".env file not found at backend/.env"
    warn "Please create it before starting the server."
    warn "Then run: pm2 start ecosystem.config.js --env production"
    exit 1
}
ok ".env file found"

# ---- Step 7: Start / Restart with PM2 ----------------------------------------
# Always use ecosystem.config.js so cwd + env_production are honoured on every deploy
Set-Location $RepoDir
log "Starting server with PM2..."

$pm2List = pm2 list 2>&1
if ($pm2List -match "v2-app") {
    pm2 delete v2-app
    ok "Removed old PM2 instance"
}

pm2 start ecosystem.config.js --env production
ok "PM2 app 'v2-app' started"

# ---- Step 8: Save PM2 process list -------------------------------------------
pm2 save
ok "PM2 process list saved"

# ---- Done --------------------------------------------------------------------
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  [OK] Deployment complete!                          " -ForegroundColor Green
Write-Host "  Server running via PM2 as 'v2-app'                " -ForegroundColor Green
Write-Host "  Run: pm2 logs v2-app   to view live logs          " -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
