#!/usr/bin/env bash
# Load test sencillo del módulo corporativo (sin herramientas externas).
# Uso: bash load_test_corporativo.sh [total] [concurrencia] [url]
TOTAL=${1:-500}
CONC=${2:-20}
URL=${3:-http://localhost:5174/}

echo "=== Load test: $TOTAL requests, concurrencia $CONC → $URL"
tmp=$(mktemp -d)

req() {
    out=$(curl -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 30 "$URL" 2>/dev/null)
    echo "$out" >> "$tmp/results.txt"
}
export -f req URL tmp

start=$(date +%s%3N)
seq 1 "$TOTAL" | xargs -P "$CONC" -I{} bash -c 'req {}'
end=$(date +%s%3N)
total_ms=$((end - start))

sort "$tmp/results.txt" | awk -v total="$TOTAL" -v ms="$total_ms" '
{
    code[NR] = $1
    t[NR] = $2
    if ($1 == "200") ok++
    else { err++; errs[err] = $1 }
    sum += $2
}
END {
    n = NR
    for (i = 1; i <= n; i++) sorted[i] = t[i] + 0
    asort(sorted)
    printf "Resultados (%d completados):\n", n
    printf "  200 OK:      %d\n", ok + 0
    printf "  Errores:     %d\n", err + 0
    for (e in errs) printf "  ! HTTP %s\n", errs[e]
    printf "  RPS:         %.1f req/s\n", (n * 1000) / ms
    printf "  Latencia:    min %.1fms | avg %.1fms | p50 %.1fms | p95 %.1fms | p99 %.1fms | max %.1fms\n",
        sorted[1]*1000, (sum/n)*1000, sorted[int(n*0.50)]*1000,
        sorted[int(n*0.95)]*1000, sorted[int(n*0.99)]*1000, sorted[n]*1000
}'
rm -rf "$tmp"
