#!/bin/bash
set -e

REPO_DIR="/capstone"
COMPOSE_FILE="docker-compose.central.yml"

cd "$REPO_DIR"

FORCE_REBUILD=0
if [ "$1" == "--force" ] || [ "$1" == "-f" ] || [ "$FORCE_REBUILD_ALL" == "true" ]; then
    FORCE_REBUILD=1
fi

echo "=================================================="
echo "MAGSENSE CI/CD DEPLOYMENT PIPELINE"
echo "Target: CT 801 (Central Stack)"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================="

# 1. Capture current git commit before pulling
OLD_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "initial")

echo ""
echo "=== [1/5] Fetching and synchronizing code from GitHub ==="
git fetch origin main
NEW_COMMIT=$(git rev-parse origin/main)

echo "Current local commit : $OLD_COMMIT"
echo "Target origin commit  : $NEW_COMMIT"

CHANGED_FILES=""
if [ "$OLD_COMMIT" != "$NEW_COMMIT" ]; then
    CHANGED_FILES=$(git diff --name-only "$OLD_COMMIT" "$NEW_COMMIT" || true)
    echo "Files changed:"
    echo "$CHANGED_FILES" | sed 's/^/  - /'
else
    echo "No commit differences detected on origin/main."
fi

# Merge / Pull latest code
git pull origin main

# 2. Determine what needs rebuilding
REBUILD_BACKEND=0
REBUILD_FRONTEND=0

if [ $FORCE_REBUILD -eq 1 ]; then
    echo ""
    echo "⚙️ Force rebuild enabled: both Backend and Frontend will be rebuilt."
    REBUILD_BACKEND=1
    REBUILD_FRONTEND=1
elif [ "$OLD_COMMIT" == "$NEW_COMMIT" ]; then
    echo "No file changes between commits. Skipping container rebuilds unless forced."
else
    # Check if backend files changed
    if echo "$CHANGED_FILES" | grep -qE '^(backend-express/|database/|docker-compose\.central\.yml)'; then
        REBUILD_BACKEND=1
    fi
    # Check if frontend files changed
    if echo "$CHANGED_FILES" | grep -qE '^(frontend-react/|docker-compose\.central\.yml)'; then
        REBUILD_FRONTEND=1
    fi
fi

# 3. Build containers
echo ""
echo "=== [2/5] Building application containers ==="
if [ $REBUILD_BACKEND -eq 1 ]; then
    echo "Building backend container..."
    docker compose -f "$COMPOSE_FILE" build backend
else
    echo "Backend unchanged. Skipping build."
fi

if [ $REBUILD_FRONTEND -eq 1 ]; then
    echo "Building frontend container (--no-cache for clean Vite assets)..."
    docker compose -f "$COMPOSE_FILE" build --no-cache frontend
else
    echo "Frontend unchanged. Skipping build."
fi

# 4. Deploy containers
echo ""
echo "=== [3/5] Starting containers via docker compose ==="
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# 5. Health checks
echo ""
echo "=== [4/5] Running health checks ==="
# Wait for PostgreSQL
echo -n "Checking PostgreSQL database... "
DB_HEALTHY=0
for i in {1..15}; do
    STATUS=$(docker inspect --format='{{json .State.Health.Status}}' capstone-central-postgres 2>/dev/null | tr -d '"')
    if [ "$STATUS" == "healthy" ]; then
        DB_HEALTHY=1
        echo "OK (healthy)"
        break
    fi
    sleep 2
done
if [ $DB_HEALTHY -ne 1 ]; then
    echo "WARNING: Database did not report healthy within 30s."
fi

# Wait for Backend
echo -n "Checking Central Backend (port 5000)... "
BACKEND_HEALTHY=0
for i in {1..15}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:5000/ || true)
    if [ "$HTTP_CODE" == "200" ]; then
        BACKEND_HEALTHY=1
        echo "OK (HTTP 200)"
        break
    fi
    sleep 2
done
if [ $BACKEND_HEALTHY -ne 1 ]; then
    echo "FAILED: Backend returned HTTP $HTTP_CODE"
    exit 1
fi

# Wait for Frontend
echo -n "Checking Central Frontend (port 3000)... "
FRONTEND_HEALTHY=0
for i in {1..15}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/ || true)
    if [ "$HTTP_CODE" == "200" ]; then
        FRONTEND_HEALTHY=1
        echo "OK (HTTP 200)"
        break
    fi
    sleep 2
done
if [ $FRONTEND_HEALTHY -ne 1 ]; then
    echo "FAILED: Frontend returned HTTP $HTTP_CODE"
    exit 1
fi

# 6. Housekeeping: prune dangling images
echo ""
echo "=== [5/5] Cleaning dangling docker images ==="
docker image prune -f

echo ""
echo "=================================================="
echo "DEPLOYMENT COMPLETED SUCCESSFULLY"
echo "=================================================="
docker compose -f "$COMPOSE_FILE" ps
