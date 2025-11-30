#!/bin/bash

set -e

if [ -z "$SERVER_TOKEN" ]; then
  echo "ERROR: SERVER_TOKEN environment variable is not set"
  echo "Usage: export SERVER_TOKEN='your-server-token' && ./agent.sh"
  exit 1
fi

BASE_URL="${BASE_URL:-https://montime.io}"
PING_HOST="8.8.8.8"
INTERVAL=60
MAX_RETRIES=3
RETRY_DELAY=5

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

get_cpu_usage() {
  if command -v top &> /dev/null; then
    top -bn2 -d 0.5 | grep "Cpu(s)" | tail -n1 | awk '{print $2}' | sed 's/%us,//'
  else
    grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'
  fi
}

get_memory_usage() {
  if command -v free &> /dev/null; then
    free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}'
  else
    awk '/MemTotal/ {total=$2} /MemAvailable/ {avail=$2} END {printf "%.2f", (total-avail)/total*100}' /proc/meminfo
  fi
}

get_disk_usage() {
  df -h / | awk 'NR==2 {print $5}' | sed 's/%//'
}

check_connectivity() {
  if ping -c 1 -W 2 "$PING_HOST" &> /dev/null; then
    echo "up"
  else
    echo "down"
  fi
}

send_metrics() {
  local cpu=$1
  local memory=$2
  local disk=$3
  local status=$4
  local retry_count=0

  while [ $retry_count -lt $MAX_RETRIES ]; do
    response=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SERVER_TOKEN" \
      -d "{\"cpu\":$cpu,\"memory\":$memory,\"disk\":$disk,\"status\":\"$status\"}" \
      "$BASE_URL/api/metrics/ingest" 2>&1)

    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "200" ]; then
      log "✓ Sent metrics OK (CPU: ${cpu}%, MEM: ${memory}%, DISK: ${disk}%, STATUS: $status)"
      return 0
    else
      retry_count=$((retry_count + 1))
      if [ $retry_count -lt $MAX_RETRIES ]; then
        log "✗ Failed to send metrics (HTTP $http_code). Retrying in ${RETRY_DELAY}s... ($retry_count/$MAX_RETRIES)"
        sleep $RETRY_DELAY
      else
        log "✗ Failed to send metrics after $MAX_RETRIES attempts (HTTP $http_code)"
        return 1
      fi
    fi
  done
}

log "Montime.io Agent Started"
log "Base URL: $BASE_URL"
log "Interval: ${INTERVAL}s"

while true; do
  cpu=$(get_cpu_usage)
  memory=$(get_memory_usage)
  disk=$(get_disk_usage)
  connectivity=$(check_connectivity)

  send_metrics "$cpu" "$memory" "$disk" "$connectivity"

  sleep $INTERVAL
done
