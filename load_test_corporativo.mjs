#!/usr/bin/env node
// Load test del módulo corporativo — sin dependencias externas.
// Uso: node load_test_corporativo.mjs [url] [total] [concurrencia]
const url = process.argv[2] || 'http://localhost:5174/';
const total = parseInt(process.argv[3] || '400', 10);
const conc = parseInt(process.argv[4] || '25', 10);

console.log(`=== Load test: ${total} requests, concurrencia ${conc} -> ${url}`);

const resultados = [];
let completados = 0;
const t0 = performance.now();

async function worker() {
    while (completados < total) {
        const i = completados++;
        if (i >= total) return;
        const t = performance.now();
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
            await res.arrayBuffer();
            resultados.push({ code: res.status, ms: performance.now() - t });
        } catch {
            resultados.push({ code: 0, ms: performance.now() - t });
        }
    }
}

await Promise.all(Array.from({ length: conc }, worker));
const elapsed = performance.now() - t0;

const ok = resultados.filter(r => r.code === 200).length;
const errs = resultados.filter(r => r.code !== 200);
const times = resultados.map(r => r.ms).sort((a, b) => a - b);
const avg = times.reduce((s, v) => s + v, 0) / times.length;
const p = q => times[Math.min(times.length - 1, Math.floor(times.length * q))].toFixed(1);

console.log(`Resultados (${resultados.length} completados):`);
console.log(`  200 OK:   ${ok}`);
console.log(`  Errores:  ${errs.length}${errs.length ? '  ->  ' + [...new Set(errs.map(e => e.code))].join(', ') : ''}`);
console.log(`  RPS:      ${(resultados.length / (elapsed / 1000)).toFixed(1)} req/s`);
console.log(`  Latencia: min ${times[0].toFixed(1)}ms | avg ${avg.toFixed(1)}ms | p50 ${p(0.5)}ms | p95 ${p(0.95)}ms | p99 ${p(0.99)}ms | max ${times[times.length - 1].toFixed(1)}ms`);
