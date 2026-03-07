#!/bin/sh

# Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
# Proprietary and confidential. Unauthorized use is strictly prohibited.
# See LICENSE file in the project root for full license information.

# Usage:
#   ./docker.sh up                   → start with :dev (default)
#   ./docker.sh up --tag latest      → start with :latest
#   ./docker.sh up --tag 1.2.3       → start with specific version
#   ./docker.sh up --local           → build from local source
#   ./docker.sh down                 → stop all services
#   ./docker.sh logs                 → tail logs

print_help() {
  echo "Usage: $0 [up|down|logs] [--tag <tag>] [--local]"
  echo
  echo "Commands:"
  echo "  up       Start services (default tag: dev)"
  echo "  down     Stop all services"
  echo "  logs     Tail logs of all services"
  echo
  echo "Options:"
  echo "  --tag <tag>   Specify API image tag (default: dev)"
  echo "  --local       Build API image from local source"
}


set -e

CMD="${1:-up}"
shift 2>/dev/null || true

TAG="dev"
LOCAL=false

while [ $# -gt 0 ]; do
  case "$1" in
    --tag)  TAG="$2"; shift 2 ;;
    --local) LOCAL=true; shift ;;
    -h|--help) print_help; exit 0 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

case "$CMD" in
  up)
    if [ "$LOCAL" = true ]; then
      echo "Starting services (local build)..."
      docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
    else
      echo "Starting services (API_TAG=$TAG)..."
      API_TAG="$TAG" docker compose up -d
    fi
    ;;
  down)
    docker compose down
    ;;
  logs)
    docker compose logs -f
    ;;
  *)
    echo "Unknown command: $CMD"
    print_help
    exit 1
    ;;
esac
