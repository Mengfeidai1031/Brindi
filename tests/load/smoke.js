import { check, sleep } from 'k6';
import http from 'k6/http';

// Prueba de humo de carga contra la API. Apunta a endpoints públicos NO limitados
// por el rate limiter (/health y /auth/providers) para medir rendimiento real sin
// disparar 429. Endpoints como /quiz están limitados a 20/min por IP a propósito.
//
// Uso: API_URL=https://api.tudominio.com k6 run load/smoke.js
const API = __ENV.API_URL || 'http://localhost:4000';

export const options = {
  scenarios: {
    smoke: { executor: 'constant-vus', vus: 5, duration: '20s' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const health = http.get(`${API}/health`);
  check(health, { 'health responde 200': (r) => r.status === 200 });

  const providers = http.get(`${API}/auth/providers`);
  check(providers, { 'providers responde 200': (r) => r.status === 200 });

  sleep(1);
}
