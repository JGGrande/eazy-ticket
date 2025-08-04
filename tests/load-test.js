import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  scenarios: {
    load: {
      executor: "shared-iterations",
      vus: 100,
      iterations: 100,
      maxDuration: "60s",
    },
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

const eventBody = {
  name: "Brinfu",
  description: "Maior evento DEV das Faculdades de Umuarama",
  initialDate: "2025-08-18T03:00:00.000Z",
  finalDate:   "2025-08-20T03:00:00.000Z",
  location:    "Umuarama - PR",
  maxTickets:  200,
  ticketPrice: 20,
};

const regBody = {
  name: "Pessoa Dev",
  email: "pessoa.dev@google.com",
  password: "admin123",
};

const paymentMethods = ["credit_card", "debit_card", "pix"];

export function setup() {
  const adminUser =  {
    name: "Admin",
    email: "admin.dev@google.com",
    password: "admin123",
  };

  const adminRes = http.post(
    `${BASE_URL}/auth/customer/register`,
    JSON.stringify(adminUser),
    { headers: { "Content-Type": "application/json" } }
  );

  check(adminRes, {
    "admin created": (r) => r.status === 201 || r.status === 200,
    "admin has token":  (r) => r.json("token") !== undefined,
  });

  const adminToken = adminRes.json("token");

  const res = http.post(`${BASE_URL}/events`, JSON.stringify(eventBody), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
  });

  check(res, {
    "event created: status 201": (r) => r.status === 201 || r.status === 200,
    "event has id":           (r) => r.json("id") !== undefined,
  });
  const createdId = res.json("id");
  return { eventId: createdId };
}

/**
 * Cada VU executa exatamente um conjunto de requisições:
 *  1. GET /events (home)
 *  2. POST /auth/customer/register — extrai token do JSON
 *  3. GET /events (home novamente, agora autenticado)
 *  4. GET /events/:id — detalhes do evento criado
 *  5. POST /checkout — usa eventId retornado no setup
 */
export default function(data) {
  const { eventId } = data;
  let token = null;

  group("Fluxo de usuário", () => {
    const r1 = http.get(`${BASE_URL}/public/events`);

    check(r1, {
      "home ok": (r) => r.status === 200,
    });

    const randomEmail = `user${Math.floor(Math.random() * 10000)}@dev.com`;

    const r2 = http.post(
      `${BASE_URL}/auth/customer/register`,
      JSON.stringify({ ...regBody, email: randomEmail }),
      { headers: { "Content-Type": "application/json" } }
    );
    check(r2, {
      "register created":     (r) => r.status === 201 || r.status === 200,
      "got token":            (r) => typeof r.json("token") === "string",
    });
    token = r2.json("token");

    const authHeaders = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };

    const r3 = http.get(`${BASE_URL}/events`, authHeaders);
    check(r3, {
      "home (autenticado) ok": (r) => r.status === 200,
    });

    const r4 = http.get(`${BASE_URL}/events/${eventId}`, authHeaders);
    check(r4, {
      "event found": (r) => r.status === 200,
      "correct id":  (r) => r.json("id") == eventId,
    });

    const ticketCount = Math.floor(Math.random() * 5) + 1;
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

    const checkoutBody = {
      eventId,
      ticketCount,
      paymentMethod,
    };

    const r5 = http.post(
      `${BASE_URL}/checkout`,
      JSON.stringify(checkoutBody),
      authHeaders
    );

    check(r5, {
      "checkout status 200": (r) => r.status === 200 || r.status === 201,
      "response has orderId": (r) => r.json("orderId") !== undefined || r.json("id") !== undefined,
    });
  });

  sleep(Math.random() * 1 + 0.5);
}
