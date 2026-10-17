import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp-up
    { duration: '1m', target: 50 }, // Steady load
    { duration: '15s', target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% of requests under 200ms
    http_req_failed: ['rate<0.01'], // Error rate < 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // 1. Process Liveness Check
  const liveRes = http.get(`${BASE_URL}/health/live`);
  check(liveRes, {
    'liveness probe status 200': (r) => r.status === 200,
  });

  // 2. Metrics Scraping Check
  const metricsRes = http.get(`${BASE_URL}/metrics`);
  check(metricsRes, {
    'metrics status 200': (r) => r.status === 200,
  });

  // 3. User Authentication Attempt
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: 'alice@acme.local',
      password: 'DevOwner@123!',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(loginRes, {
    'login status 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);
}
