import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { sign } from "jsonwebtoken";
import request from "supertest";
import { app } from "../../app";
import { db } from "../../config/database";
import { env } from "../../config/env";
import { CustomerModel } from "../../models/customer";

type SeededCustomer = { id: number; name: string; email: string };

let sequence = 0;

function uniqueEmail(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}@email.com`;
}

function generateToken(customer: SeededCustomer): string {
  return sign({ id: customer.id, name: customer.name }, env.JWT_SECRET, {
    subject: customer.id.toString(),
    expiresIn: env.JWT_EXPIRATION,
  });
}

async function seedCustomer(overrides: Partial<{ name: string; email: string; password: string }> = {}): Promise<SeededCustomer> {
  const hashedPassword = await hash(overrides.password ?? "123456", env.PASSWORD_SALT_ROUNDS);

  const [customer] = await db
    .insert(CustomerModel)
    .values({
      name: overrides.name ?? "Integration Customer",
      email: overrides.email ?? uniqueEmail("integration"),
      password: hashedPassword,
    })
    .returning({ id: CustomerModel.id, name: CustomerModel.name, email: CustomerModel.email });

  return customer;
}

async function cleanCustomers(): Promise<void> {
  await db.delete(CustomerModel);
}

describe("Customer routes (integration)", () => {
  let authenticatedCustomer: SeededCustomer;
  let token: string;

  beforeAll(async () => {
    await cleanCustomers();
    authenticatedCustomer = await seedCustomer({ name: "Authenticated Customer", email: uniqueEmail("authenticated") });
    token = generateToken(authenticatedCustomer);
  });

  afterAll(async () => {
    await cleanCustomers();
    await db.$client.end();
  });

  describe("GET /customers", () => {
    it("should reject the request when there is no authentication token", async () => {
      const response = await request(app).get("/customers");

      expect(response.status).toBe(401);
    });

    it("should list every customer without exposing the password", async () => {
      const response = await request(app).get("/customers").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toContainEqual(authenticatedCustomer);
      response.body.forEach((customer: Record<string, unknown>) => {
        expect(customer).not.toHaveProperty("password");
      });
    });
  });

  describe("GET /customers/:id", () => {
    it("should return the customer when it exists", async () => {
      const response = await request(app)
        .get(`/customers/${authenticatedCustomer.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(authenticatedCustomer);
    });

    it("should return 404 when the customer does not exist", async () => {
      const response = await request(app).get("/customers/999999").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Customer not found" });
    });

    it("should return 400 when the id is not a valid number", async () => {
      const response = await request(app).get("/customers/not-a-number").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /customers/:id", () => {
    it("should update the customer and persist the hashed password in the database", async () => {
      const customer = await seedCustomer({ email: uniqueEmail("to-update") });
      const newEmail = uniqueEmail("updated");

      const response = await request(app)
        .put(`/customers/${customer.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Updated Name", email: newEmail, password: "new-password-123" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: customer.id, name: "Updated Name", email: newEmail });

      const [persisted] = await db.select().from(CustomerModel).where(eq(CustomerModel.id, customer.id));
      expect(persisted.name).toBe("Updated Name");
      expect(persisted.email).toBe(newEmail);
      expect(persisted.password).not.toBe("new-password-123");
    });

    it("should return 409 when the email already belongs to another customer", async () => {
      const customerA = await seedCustomer({ email: uniqueEmail("customer-a") });
      const customerB = await seedCustomer({ email: uniqueEmail("customer-b") });

      const response = await request(app)
        .put(`/customers/${customerB.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: customerB.name, email: customerA.email, password: "123456" });

      expect(response.status).toBe(409);
    });

    it("should return 400 when the request body fails validation", async () => {
      const customer = await seedCustomer({ email: uniqueEmail("invalid-body") });

      const response = await request(app)
        .put(`/customers/${customer.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Jo", email: "invalid-email" });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /customers/:id", () => {
    it("should remove the customer from the database", async () => {
      const customer = await seedCustomer({ email: uniqueEmail("to-delete") });

      const response = await request(app)
        .delete(`/customers/${customer.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(204);

      const found = await db.select().from(CustomerModel).where(eq(CustomerModel.id, customer.id));
      expect(found).toHaveLength(0);
    });

    it("should return 404 when the customer does not exist", async () => {
      const response = await request(app).delete("/customers/999999").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});
