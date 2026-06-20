# Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
# Proprietary and confidential. Unauthorized use is strictly prohibited.
# See LICENSE file in the project root for full license information.


#!/bin/sh

# Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
# Proprietary and confidential. Unauthorized use is strictly prohibited.
# See LICENSE file in the project root for full license information.

# Usage:
#   ./docker.sh up                         -> API + DocGen with remote images
#   ./docker.sh up --local                 -> API + DocGen local dev builds
#   ./docker.sh up --test-prod             -> local prod builds + external services
#   ./docker.sh up --tag latest            -> API + DocGen with tag latest
#   ./docker.sh up --tag docgen:latest     -> only DocGen uses tag latest

print_help() {
  echo "Usage: $0 [up|down|logs] [--tag <[service:]tag>] [--local] [--test-prod]"
}

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export API_DIR="$SCRIPT_DIR"
export DOCGEN_DIR="$(cd "$SCRIPT_DIR/../coverit-docgen" && pwd)"

CMD="${1:-up}"
shift 2>/dev/null || true

export API_TAG="dev"
export DOCGEN_TAG="dev"

LOCAL=false
TEST_PROD=false
API_TAG_OVERRIDDEN=false
DOCGEN_TAG_OVERRIDDEN=false

while [ $# -gt 0 ]; do
  case "$1" in
    --tag)
      if echo "$2" | grep -q ":"; then
        SERVICE=$(echo "$2" | cut -d: -f1 | tr '[:lower:]' '[:upper:]')
        VAL=$(echo "$2" | cut -d: -f2-)
        case "$SERVICE" in
          API)
            export API_TAG="$VAL"
            API_TAG_OVERRIDDEN=true
            ;;
          DOCGEN)
            export DOCGEN_TAG="$VAL"
            DOCGEN_TAG_OVERRIDDEN=true
            ;;
          *)
            echo "Unknown service for --tag: $SERVICE"
            exit 1
            ;;
        esac
      else
        export API_TAG="$2"
        export DOCGEN_TAG="$2"
      fi
      shift 2
      ;;
    --local) LOCAL=true; shift ;;
    --test-prod) TEST_PROD=true; shift ;;
    -h|--help) print_help; exit 0 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

ENV_FILE_ARGS=""
if [ -f "$API_DIR/.env" ]; then
  ENV_FILE_ARGS="$ENV_FILE_ARGS --env-file $API_DIR/.env"
fi

EXEC_CMD="docker compose$ENV_FILE_ARGS -f $API_DIR/docker-compose.yml"

if [ "$LOCAL" = true ]; then
  echo "Starting API + DocGen in local dev mode..."
  if [ "$API_TAG_OVERRIDDEN" = false ]; then
    EXEC_CMD="$EXEC_CMD -f $API_DIR/overrides/api.dev.yml"
  fi
  EXEC_CMD="$EXEC_CMD -f $DOCGEN_DIR/docker-compose.yml -f $DOCGEN_DIR/overrides/integrated.local.yml"
  if [ "$DOCGEN_TAG_OVERRIDDEN" = false ]; then
    EXEC_CMD="$EXEC_CMD -f $DOCGEN_DIR/overrides/api.dev.yml"
  fi
elif [ "$TEST_PROD" = true ]; then
  echo "Starting API + DocGen in Production Test mode..."
  EXEC_CMD="$EXEC_CMD -f $API_DIR/overrides/api.cloud.yml -f $API_DIR/overrides/api.test.yml"
  EXEC_CMD="$EXEC_CMD -f $DOCGEN_DIR/docker-compose.yml -f $DOCGEN_DIR/overrides/api.cloud.yml -f $DOCGEN_DIR/overrides/api.test.yml"
else
  echo "Starting API + DocGen using remote images (API_TAG=$API_TAG, DOCGEN_TAG=$DOCGEN_TAG)..."
  EXEC_CMD="$EXEC_CMD -f $API_DIR/overrides/api.cloud.yml"
  EXEC_CMD="$EXEC_CMD -f $DOCGEN_DIR/docker-compose.yml -f $DOCGEN_DIR/overrides/api.cloud.yml"
fi

case "$CMD" in
  up)
    $EXEC_CMD up -d --build --remove-orphans
    ;;
  down)
    $EXEC_CMD down --remove-orphans
    ;;
  logs)
    $EXEC_CMD logs -f
    ;;
  *)
    echo "Unknown command: $CMD"
    print_help
    exit 1
    ;;
esac
