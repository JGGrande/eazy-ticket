import http from 'k6/http';
import { check, sleep } from 'k6';
import { faker } from 'https://cdn.jsdelivr.net/npm/@faker-js/faker/+esm';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

const API_BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    register: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 }, // ramp up até 20 usuários simultâneos
        { duration: '1m', target: 50 },  // sustenta 50 usuários simultâneos
        { duration: '30s', target: 0 },  // ramp down até zero
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% das requisições devem responder em menos de 800ms
    http_req_failed: ['rate<0.01'],   // menos de 1% de requisições com falha
  },
};

/**
 * Cada iteração simula um novo usuário se cadastrando em POST /auth/customer/register.
 * O e-mail é gerado com VU + iteração + timestamp para garantir que nunca colida
 * entre execuções e VUs — uma colisão geraria 409 (e-mail já existe) e distorceria
 * as métricas de carga do endpoint de cadastro.
 */
export default function () {
  const user = {
    name: faker.person.fullName(),
    email: `loadtest.${__VU}.${__ITER}.${Date.now()}@k6.test`,
    password: faker.internet.password({ length: 10 }),
  };

  const response = http.post(
    `${API_BASE_URL}/auth/customer/register`,
    JSON.stringify(user),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(response, {
    'register: status 201': (r) => r.status === 201,
    'register: retornou token': (r) => typeof r.json('token') === 'string',
    'register: retornou id do cliente': (r) => typeof r.json('id') === 'number',
  });

  sleep(Math.random() * 1 + 0.5);
}

export function handleSummary(data) {
  return {
    'register-load-report.html': htmlReport(data),
  };
}
