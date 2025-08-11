import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { faker } from 'https://cdn.jsdelivr.net/npm/@faker-js/faker/+esm';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

const TOTAL_USER = 200;
const TOTAL_TICKETS = 50;

export const options = {
  scenarios: {
    load: {
      // executor: "shared-iterations",
      executor: "per-vu-iterations",
      vus: TOTAL_USER,
      iterations: 1, 
      maxDuration: "60s",
    },
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost";

const paymentMethods = ["credit_card", "debit_card", "pix"];

function getToken() {
  const adminUser =  {
    name: "Admin",
    email: "admin.dev@google.com",
    password: "admin123",
  };

  const adminLogin = http.post(
    `${BASE_URL}/auth/customer/login`, 
    JSON.stringify(adminUser), 
    { headers: { "Content-Type": "application/json" } }
  );

  if (adminLogin.status === 200) {
    return adminLogin.json("token");
  }

  const adminRes = http.post(
    `${BASE_URL}/auth/customer/register`,
    JSON.stringify(adminUser),
    { headers: { "Content-Type": "application/json" } }
  );

  return adminRes.json("token");
}

export function setup() {
  const adminToken = getToken();

  check(adminToken, {
    "admin token received": (t) => typeof t === "string",
  });

  const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // 1 day in milliseconds
  const threeDaysInMilliseconds = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

  const initialDate = new Date(
    Date.now() + oneDayInMilliseconds
  ).toISOString();

  const finalDate = new Date(
    Date.now() + threeDaysInMilliseconds
  ).toISOString();

  const eventBody = {
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    initialDate,
    finalDate,
    location: `${faker.location.city()} - ${faker.location.state({ abbreviated: true })}`,
    maxTickets:  TOTAL_TICKETS,
    ticketPrice: faker.number.int({ min: 10, max: 100 }),
  };

  const res = http.post(`${BASE_URL}/events`, JSON.stringify(eventBody), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
  });

  // console.log('Response:', JSON.stringify(res.body))

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

    const user = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
    }

    const r2 = http.post(
      `${BASE_URL}/auth/customer/register`,
      JSON.stringify(user),
      { headers: { "Content-Type": "application/json" } }
    );

    check(r2, {
      "register created": (r) => r.status === 201 || r.status === 200,
      "got token": (r) => typeof r.json("token") === "string",
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

    const ticketCount = faker.number.int({ min: 1, max: 5 });
    const paymentMethod = faker.helpers.arrayElement(paymentMethods);

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
      "checkout status 201 OR 400": (r) => r.status === 201 || r.status === 400,
    });
  });

  sleep(Math.random() * 1 + 0.5);
}

export function handleSummary(data) {
  return {
    'summary-easy-ticket.html': htmlReport(data),
  };
}
