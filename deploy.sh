#!/usr/bin/env bash
# =============================================================================
#  V2 Fashion — Production Deploy Script (Ubuntu / Linux)
#  Usage: bash deploy.sh
#  Requirements: git, node, npm, pm2 (installed globally)
#  Install PM2 globally: npm install -g pm2
# =============================================================================

set -euo pipefail  # Exit immediately on error, unset var, or pipe failure

# ── Colors ─────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()  { echo -e "${CYAN}[V2]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Config ──────────────────────────────────────────────────────────────────────
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_DIR/backend"
FRONTEND_DIR="$REPO_DIR/frontend"
LOG_DIR="$REPO_DIR/logs"

# ── Step 0: Create necessary directories ───────────────────────────────────────
mkdir -p "$LOG_DIR"
mkdir -p "$BACKEND_DIR/uploads/videos"
mkdir -p "$BACKEND_DIR/public"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║       V2 Fashion — Production Deploy         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Step 1: Pull latest changes ────────────────────────────────────────────────
log "Pulling latest changes from GitHub..."
git -C "$REPO_DIR" pull origin main
ok "Repository updated"

# ── Step 2: Install backend dependencies ───────────────────────────────────────
log "Installing backend dependencies..."
cd "$BACKEND_DIR"
npm ci
ok "Backend dependencies installed"

# ── Step 3: Install frontend dependencies ──────────────────────────────────────
log "Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm ci
ok "Frontend dependencies installed"

# ── Step 4: Build frontend → outputs to backend/public/ ───────────────────────
log "Building frontend (Vite)..."
npm run build
ok "Frontend built → backend/public/"

# ── Step 5: Compile backend TypeScript ─────────────────────────────────────────
log "Compiling backend TypeScript..."
cd "$BACKEND_DIR"
npm run build
ok "Backend compiled → backend/dist/"

# ── Step 6: Validate .env exists ───────────────────────────────────────────────
if [ ! -f "$BACKEND_DIR/.env" ]; then
    warn ".env file not found at backend/.env"
    warn "Please create it from .env.example before starting the server"
    warn "Skipping server start — fix .env and run: pm2 start ecosystem.config.js --env production"
    exit 1
fi
ok ".env file found"

# ── Step 7: Start / Restart with PM2 ───────────────────────────────────────────
# Always use ecosystem.config.js so cwd + env_production are honoured on every deploy
log "Starting server with PM2..."
cd "$REPO_DIR"

if pm2 list | grep -q "v2-app"; then
    pm2 delete v2-app
    ok "Removed old PM2 instance"
fi

pm2 start ecosystem.config.js --env production
ok "PM2 app 'v2-app' started"

# ── Step 8: Save PM2 process list ──────────────────────────────────────────────
pm2 save
ok "PM2 process list saved"

# ── Done ────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓  Deployment complete!                        ║${NC}"
echo -e "${GREEN}║   Server running via PM2 as 'v2-app'             ║${NC}"
echo -e "${GREEN}║   Run: pm2 logs v2-app   to view live logs       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
