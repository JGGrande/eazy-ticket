import { eq } from "drizzle-orm";
import request from "supertest";
import { app } from "../../app";
import { db } from "../../config/database";
import { CustomerModel } from "../../models/customer";

/**
 * Simula a jornada completa de um usuário utilizando a API:
 * cadastro -> consulta do próprio perfil -> listagem -> atualização de dados ->
 * login com as novas credenciais -> exclusão da conta -> confirmação de que a conta não existe mais.
 *
 * Os testes rodam em sequência e compartilham estado (token e id do cliente)
 * de propósito: juntos, eles representam um único fluxo de ponta a ponta.
 */
describe("Customer CRUD flow (e2e)", () => {
  const account = {
    name: "E2E Customer",
    email: `e2e-${Date.now()}@email.com`,
    password: "initial-password",
  };

  let token: string;
  let customerId: number;

  afterAll(async () => {
    await db.delete(CustomerModel).where(eq(CustomerModel.email, account.email));
    await db.$client.end();
  });

  it("deve cadastrar um novo cliente e retornar um token de autenticação", async () => {
    const response = await request(app).post("/auth/customer/register").send(account);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: account.name, email: account.email });
    expect(typeof response.body.token).toBe("string");

    token = response.body.token;
    customerId = response.body.id;
  });

  it("deve consultar os dados do próprio perfil pelo id retornado no cadastro", async () => {
    const response = await request(app)
      .get(`/customers/${customerId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: customerId, name: account.name, email: account.email });
  });

  it("deve encontrar o cliente recém-cadastrado na listagem geral", async () => {
    const response = await request(app).get("/customers").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.map((customer: { id: number }) => customer.id)).toContain(customerId);
  });

  it("deve atualizar nome, e-mail e senha do cliente", async () => {
    const updatedAccount = {
      name: "E2E Customer Updated",
      email: `e2e-updated-${Date.now()}@email.com`,
      password: "updated-password",
    };

    const response = await request(app)
      .put(`/customers/${customerId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updatedAccount);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: customerId, name: updatedAccount.name, email: updatedAccount.email });

    account.name = updatedAccount.name;
    account.email = updatedAccount.email;
    account.password = updatedAccount.password;
  });

  it("deve autenticar com as novas credenciais após a atualização", async () => {
    const response = await request(app)
      .post("/auth/customer/login")
      .send({ email: account.email, password: account.password });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: customerId, name: account.name, email: account.email });
    expect(typeof response.body.token).toBe("string");

    token = response.body.token;
  });

  it("deve excluir a própria conta", async () => {
    const response = await request(app)
      .delete(`/customers/${customerId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(204);
  });

  it("não deve mais encontrar o cliente após a exclusão da conta", async () => {
    const response = await request(app)
      .get(`/customers/${customerId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});
