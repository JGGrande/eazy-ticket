# Passo a passo: Testes do CRUD de Customer (unitários, integração, e2e e carga)

Este guia mostra, passo a passo, como adicionar o Jest ao projeto `back-end` e criar
**quatro camadas de testes** para o **CRUD de Customer**:

1. **Testes unitários** — `CustomerRepository`, `CustomerService` e `CustomerController` isolados (com mocks).
2. **Testes de integração** — as rotas `/customers` rodando com as camadas reais (Controller → Service → Repository) contra um banco de dados Postgres de teste.
3. **Testes e2e (ponta a ponta)** — a jornada completa de um usuário através da API HTTP: cadastro → consulta → listagem → atualização → login → exclusão.
4. **Teste de carga (k6)** — simula múltiplos usuários se cadastrando simultaneamente em `POST /auth/customer/register`.

> Todos os comandos abaixo devem ser executados dentro da pasta `back-end/`,
> exceto os comandos da seção 16 (teste de carga com k6), que usam a pasta `tests/` na raiz do projeto.

```bash
cd back-end
```

---

## 1. Instalar o Jest e suas dependências

O projeto usa TypeScript, então além do `jest` precisamos do `ts-jest` (para o Jest
entender arquivos `.ts`) e dos tipos `@types/jest` (para o autocomplete e
checagem de tipos do `describe`, `it`, `expect`, etc.).

```bash
npm install -D jest ts-jest @types/jest
```

---

## 2. Gerar o arquivo de configuração do Jest

O `ts-jest` vem com um comando que já gera um `jest.config.js` pronto para
projetos TypeScript:

```bash
npx ts-jest config:init
```

Isso cria o arquivo `jest.config.js` na raiz do `back-end` com o seguinte
conteúdo:

```js
const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
};
```

Não é necessário alterar nada aqui — essa configuração já é suficiente para
rodar os testes que vamos criar.

---

## 3. Adicionar os scripts de teste no `package.json`

Abra o `package.json` do `back-end` e, dentro de `"scripts"`, adicione as
linhas `test` e `test:watch`:

```json
"scripts": {
  "start": "node build/server.js",
  "build": "tsup src --out-dir build",
  "start:dev": "tsx watch src/server.ts",
  "migrate:generate": "drizzle-kit generate --name",
  "migrate:up": "drizzle-kit push",
  "migrate:all": "drizzle-kit migrate",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

- `npm test` → roda toda a suíte de testes uma vez.
- `npm run test:watch` → roda os testes em modo "watch" (refaz a execução a
  cada alteração de arquivo).

---

## 4. Entendendo a arquitetura do CRUD de Customer

Antes de escrever os testes, é importante saber como as camadas se conectam,
pois cada teste vai "isolar" a camada testada substituindo (mockando) suas
dependências:

```
CustomerController  -->  CustomerService  -->  ICustomerRepository (interface)
      (HTTP)              (regras de negócio)        |
                                                CustomerRepository (Drizzle ORM)
```

- **`CustomerRepository`** (`src/repositories/customer.repository.ts`): acessa
  o banco de dados através do objeto `db` (Drizzle ORM), importado de
  `src/config/database.ts`.
- **`CustomerService`** (`src/services/customer.service.ts`): recebe um
  `ICustomerRepository` no construtor e implementa as regras de negócio
  (verificação de existência, conflito de e-mail, hash de senha com
  `bcryptjs`, lançamento de `AppError`).
- **`CustomerController`** (`src/controllers/customer.ts`): recebe um
  `CustomerService` no construtor, valida a entrada com `zod` e monta a
  resposta HTTP (`req`/`res`).

Essa injeção de dependências via construtor é o que torna o código testável:
em cada teste, ao invés de usar a implementação real da camada de baixo,
passamos um "dublê" (mock) controlado por nós.

---

## 5. Criar os testes do `CustomerRepository`

Crie o arquivo `src/repositories/customer.repository.spec.ts`.

### 5.1. Por que precisamos mockar o banco de dados?

O `CustomerRepository` usa o objeto `db` (Drizzle ORM) importado de
`../config/database`. Esse arquivo abre uma conexão real com o PostgreSQL
assim que é importado — o que é **péssimo** para um teste unitário (lento,
depende de infraestrutura externa e de variáveis de ambiente).

A solução é usar `jest.mock` para substituir todo o módulo
`../config/database` por uma versão falsa, controlada pelo teste:

```ts
jest.mock("../config/database", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
```

### 5.2. Simulando o "encadeamento" de métodos do Drizzle

Repare que o repositório encadeia vários métodos, por exemplo:

```ts
db.select({...}).from(CustomerModel).where(eq(...)).limit(1)
```

Cada um desses métodos (`select`, `from`, `where`, `limit`, `orderBy`,
`update`, `set`, `returning`, `delete`) precisa devolver um objeto que também
possua esses mesmos métodos (encadeável) e que, ao final, possa ser
"esperado" com `await` (ou seja, seja "thenable").

Por isso criamos uma função auxiliar `createQueryChain`, que devolve um objeto
onde:

- todos os métodos do encadeamento retornam o próprio objeto (`chain`);
- o objeto implementa `then`, resolvendo para o resultado que queremos simular.

```ts
function createQueryChain(result: any) {
  const chain = {} as any;
  const chainableMethods = [
    "select", "from", "where", "limit", "orderBy",
    "update", "set", "returning", "delete",
  ];

  chainableMethods.forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });

  chain.then = (onFulfilled: any, onRejected?: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return chain;
}
```

Assim, em cada teste, basta dizer o que `db.select(...)` (ou `db.update(...)`,
`db.delete(...)`) deve "retornar no final":

```ts
(db.select as jest.Mock).mockReturnValue(createQueryChain([customer]));
```

### 5.3. Casos de teste cobertos

| Método                     | Cenários testados                                              |
|----------------------------|----------------------------------------------------------------|
| `findById`                 | retorna o cliente quando existe / retorna `null` quando não existe |
| `findAll`                  | retorna a lista de clientes / retorna lista vazia              |
| `existsById`               | retorna `true` quando existe / `false` quando não existe       |
| `existsByEmailExcluding`   | retorna `true` quando outro cliente já usa o e-mail / `false` caso contrário |
| `update`                   | retorna o cliente atualizado / retorna `null` quando nada é atualizado |
| `deleteById`               | chama `db.delete` e `where` com o id correto                   |

Veja o arquivo completo em
[`src/repositories/customer.repository.spec.ts`](src/repositories/customer.repository.spec.ts).

---

## 6. Criar os testes do `CustomerService`

Crie o arquivo `src/services/customer.service.spec.ts`.

### 6.1. Mockando as dependências do serviço

O `CustomerService` depende de três coisas externas:

1. **`ICustomerRepository`** — não usamos o `CustomerRepository` real; criamos
   um objeto falso, com cada método substituído por `jest.fn()`:

   ```ts
   repository = {
     findById: jest.fn(),
     findAll: jest.fn(),
     existsById: jest.fn(),
     existsByEmailExcluding: jest.fn(),
     update: jest.fn(),
     deleteById: jest.fn(),
   };

   service = new CustomerService(repository);
   ```

   Assim, controlamos exatamente o que cada método retorna em cada teste, com
   `repository.findById.mockResolvedValue(...)`, por exemplo.

2. **`bcryptjs`** — a função `hash` é usada para criptografar a senha. Nos
   testes, mockamos o módulo inteiro com `jest.mock("bcryptjs")` e definimos o
   retorno esperado com `(hash as jest.Mock).mockResolvedValue("hashed-password")`.

3. **`../config/env`** — assim como `database.ts`, o `env.ts` valida variáveis
   de ambiente obrigatórias ao ser importado (e lança erro se faltar alguma).
   Para evitar essa dependência no teste, mockamos o módulo devolvendo apenas o
   que o serviço usa:

   ```ts
   jest.mock("../config/env", () => ({
     env: { PASSWORD_SALT_ROUNDS: 10 },
   }));
   ```

### 6.2. Casos de teste cobertos

| Método      | Cenários testados                                                                 |
|-------------|------------------------------------------------------------------------------------|
| `findById`  | retorna o cliente quando existe / lança `AppError(404, "Customer not found")` quando não existe |
| `findAll`   | retorna todos os clientes                                                           |
| `update`    | lança `404` quando o cliente não existe / lança `409` quando o e-mail já pertence a outro cliente / faz hash da senha quando ela é informada / não faz hash quando a senha não é informada / lança `500` quando o repositório falha ao atualizar / retorna o cliente atualizado em caso de sucesso |
| `delete`    | lança `404` quando o cliente não existe / chama `deleteById` quando o cliente existe |

Repare como verificamos os erros lançados, comparando com uma instância de
`AppError`:

```ts
await expect(service.findById(999)).rejects.toEqual(new AppError(404, "Customer not found"));
```

Veja o arquivo completo em
[`src/services/customer.service.spec.ts`](src/services/customer.service.spec.ts).

---

## 7. Criar os testes do `CustomerController`

Crie o arquivo `src/controllers/customer.spec.ts`.

### 7.1. Mockando o `CustomerService` e os objetos `req`/`res` do Express

O controller depende do `CustomerService` (mockado da mesma forma que o
repositório no passo anterior) e dos objetos `Request`/`Response` do Express,
que normalmente são criados pelo próprio Express em tempo de execução.

Como não estamos rodando um servidor de verdade, criamos:

- `req` — um objeto simples `{ params, body }`, do jeito que o controller
  espera (usamos `as unknown as Request` para o TypeScript aceitar o objeto
  parcial).
- `res` — uma função auxiliar `createMockResponse()` que cria um objeto cujos
  métodos `status`, `json` e `sendStatus` são `jest.fn()` que retornam o
  próprio `res` (simulando o encadeamento `res.status(200).json(...)` do
  Express):

  ```ts
  function createMockResponse(): Response {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.sendStatus = jest.fn().mockReturnValue(res);
    return res;
  }
  ```

### 7.2. Casos de teste cobertos

| Método     | Cenários testados                                                                |
|------------|-----------------------------------------------------------------------------------|
| `findById` | retorna o cliente com status `200` / rejeita com `ZodError` quando o `id` é inválido |
| `findAll`  | retorna a lista de clientes com status `200`                                      |
| `update`   | atualiza e retorna o cliente com status `200` / rejeita com `ZodError` quando o corpo da requisição é inválido |
| `delete`   | remove o cliente e responde com status `204`                                      |

Note que tanto `ParamsUtils.getId` quanto o schema `updateCustomerSchema`
usam `zod`. Não precisamos mockar o `zod` — basta passar dados inválidos
(`id: "not-a-number"` ou um e-mail mal formatado) e verificar que a Promise
retornada pelo controller é rejeitada com uma instância de `z.ZodError`:

```ts
await expect(controller.findById(req, res)).rejects.toBeInstanceOf(z.ZodError);
```

Veja o arquivo completo em
[`src/controllers/customer.spec.ts`](src/controllers/customer.spec.ts).

---

## 8. Rodar os testes

Para rodar toda a suíte de testes uma única vez:

```bash
npm test
```

Para rodar em modo "watch" (útil durante o desenvolvimento — refaz os testes a
cada alteração salva):

```bash
npm run test:watch
```

Saída esperada (resumida):

```
Test Suites: 3 passed, 3 total
Tests:       28 passed, 28 total
Snapshots:   0 total
```

Os 3 arquivos de teste correspondem às três camadas:

```
src/repositories/customer.repository.spec.ts
src/services/customer.service.spec.ts
src/controllers/customer.spec.ts
```

---

## 9. Resumo dos arquivos criados/alterados

| Arquivo                                                | O que foi feito                                              |
|--------------------------------------------------------|---------------------------------------------------------------|
| `package.json`                                         | Adicionadas as dependências de teste e os scripts `test`/`test:watch` |
| `jest.config.js`                                       | Criado pelo `npx ts-jest config:init`                        |
| `src/repositories/customer.repository.spec.ts`        | Testes unitários do `CustomerRepository` (mockando `db`)     |
| `src/services/customer.service.spec.ts`               | Testes unitários do `CustomerService` (mockando `ICustomerRepository`, `bcryptjs` e `env`) |
| `src/controllers/customer.spec.ts`                     | Testes unitários do `CustomerController` (mockando `CustomerService`, `req` e `res`) |

---

## 10. Conceitos-chave para revisar em sala

- **Teste unitário vs. teste de integração**: aqui testamos cada camada
  isoladamente, substituindo (mockando) tudo o que ela depende. Isso torna os
  testes rápidos e independentes de banco de dados, rede, etc.
- **`jest.mock(modulePath, factory)`**: substitui um módulo inteiro por uma
  implementação falsa, controlada pelo teste.
- **`jest.fn()` / `mockResolvedValue` / `mockReturnValue`**: criam funções
  espiãs (spies) cujo comportamento e retorno controlamos manualmente.
- **Injeção de dependência via construtor**: é o que permite trocar uma
  implementação real (ex.: `CustomerRepository`) por um dublê de teste sem
  alterar o código de produção.
- **`expect(...).rejects.toEqual(...)` / `.rejects.toBeInstanceOf(...)`**:
  formas de testar que uma `Promise` é rejeitada com um erro específico.

---

## 11. Preparar a infraestrutura para testes de integração e e2e

Diferente dos testes unitários (que mockam tudo), os testes de **integração** e
**e2e** precisam de duas coisas reais:

1. Um **banco de dados Postgres de teste**, separado do banco de desenvolvimento
   (para nunca sujar seus dados locais).
2. Uma forma de **importar o app Express** sem precisar subir o servidor de
   verdade na porta 3000.

### 11.1. Instalar o `supertest`

O `supertest` permite simular requisições HTTP diretamente contra uma instância
do Express, sem precisar abrir uma porta de rede:

```bash
npm install -D supertest @types/supertest
```

### 11.2. Extrair a criação do `app` para `src/app.ts`

O `src/server.ts` original criava o `app` do Express e já chamava `app.listen(...)`
na sequência — não dava para importar um sem rodar o outro. A solução é extrair
toda a configuração do Express (middlewares, rotas, error handler) para um novo
arquivo `src/app.ts`, que **exporta** o `app` sem chamar `.listen()`:

```ts
// src/app.ts
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { collectDefaultMetrics, register } from 'prom-client';
import { customerRouter } from './routes/customer';
import { ErrorHandlerMiddleware } from './middlewares/errors';
import { HttpMetricsMiddleware } from './middlewares/http-metrics';
import { authRouter } from './routes/auth';
import { CustomerAuthorizationMiddleware } from './middlewares/customer-authorization';
import { eventRouter } from './routes/event';
import { checkoutRouter } from './routes/checkout';
import { publicRouter } from './routes/public';
import { ticketRouter } from './routes/ticket';

collectDefaultMetrics();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static('uploads'))
app.use(HttpMetricsMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', PID: process.pid });
});

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/auth', authRouter);
app.use('/public', publicRouter);
app.use(CustomerAuthorizationMiddleware);
app.use('/customers', customerRouter);
app.use('/events', eventRouter);
app.use('/tickets', ticketRouter);
app.use('/checkout', checkoutRouter);

app.use(ErrorHandlerMiddleware);

export { app };
```

E o `src/server.ts` passa a apenas importar esse `app` e iniciar o servidor:

```ts
// src/server.ts
import './config/otel'; // Importado PRIMEIRO — precisa instrumentar os módulos antes que sejam carregados
import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

app.listen(env.API_PORT, () => {
  logger.info(`Server is running on port ${env.API_PORT}`);
});
```

> Esse refactor não muda nenhum comportamento em produção — ele só separa
> "montar o app" de "ligar o servidor", o que é exatamente o que o `supertest`
> precisa para testar as rotas sem abrir uma porta TCP de verdade.

### 11.3. Criar um banco de dados Postgres dedicado a testes

Use o **mesmo container Postgres** do `docker-compose.yaml` (ele já expõe a porta
`5432` para o host), mas crie um banco separado chamado `postgres_test`:

```bash
# com o docker-compose do projeto rodando (docker compose up -d postgres)
docker exec -it <nome-do-container-postgres> psql -U postgres -c "CREATE DATABASE postgres_test;"
```

> Dica: para descobrir o nome do container, rode `docker ps` e procure pela
> imagem `postgres:17`.

### 11.4. Criar o arquivo `.env.test`

Crie um arquivo `.env.test` na raiz do `back-end`, com as mesmas chaves do
`.env`, mas apontando para o banco de testes:

```env
NODE_ENV=test
API_PORT=3000
API_URL=http://localhost:3000

DATABASE_URL=postgres://postgres:12345678@localhost:5432/postgres_test

PASSWORD_SALT_ROUNDS=4
JWT_SECRET=test-secret
JWT_EXPIRATION=1h
```

> Por que `PASSWORD_SALT_ROUNDS=4` e não `10`? Os testes de integração/e2e
> registram e atualizam vários clientes, e cada operação faz `hash` de senha
> com `bcryptjs`. Um número de rounds menor deixa o hash bem mais rápido
> **somente no ambiente de teste**, sem afetar a segurança em produção (que
> continua usando o valor do `.env`).

### 11.5. Aplicar o schema do banco no banco de testes

As tabelas precisam existir no `postgres_test` antes de rodar os testes. Use o
Drizzle Kit apontando temporariamente para o banco de testes:

```bash
DATABASE_URL=postgres://postgres:12345678@localhost:5432/postgres_test npx drizzle-kit push
```

### 11.6. Criar um arquivo para carregar as variáveis do `.env.test` no Jest

O `src/config/env.ts` carrega o `.env` automaticamente (`import "dotenv/config"`).
Para os testes de integração/e2e usarem o `.env.test` **antes** de qualquer
módulo da aplicação ser importado, crie `back-end/jest.setup-env.js`:

```js
const { config } = require("dotenv");
const path = require("path");

// Carrega as variáveis do .env.test ANTES de qualquer módulo da aplicação
// (como src/config/env.ts) ser importado pelos testes de integração/e2e.
// O dotenv não sobrescreve variáveis já existentes em process.env, então
// isso garante que o banco de testes seja usado em vez do banco de desenvolvimento.
config({ path: path.resolve(__dirname, ".env.test") });
```

---

## 12. Criar configurações separadas do Jest para integração e e2e

Os testes unitários (que mockam tudo) não devem rodar no mesmo "grupo" dos
testes de integração/e2e (que precisam de banco de dados real). Por isso,
vamos manter **três arquivos de configuração do Jest**, um para cada tipo de
teste, todos diferenciados pelo nome do arquivo de teste:

| Tipo de teste | Convenção de nome          | Config                          |
|---------------|------------------------------|---------------------------------|
| Unitário      | `*.spec.ts`                  | `jest.config.js`                |
| Integração    | `*.integration.spec.ts`      | `jest.integration.config.js`    |
| E2E           | `*.e2e.spec.ts`              | `jest.e2e.config.js`            |

### 12.1. Atualizar `jest.config.js` (testes unitários)

Adicione `testPathIgnorePatterns` para que os testes de integração/e2e **não**
sejam executados junto com os unitários:

```js
const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  testPathIgnorePatterns: ["/node_modules/", "\\.integration\\.spec\\.ts$", "\\.e2e\\.spec\\.ts$"],
};
```

### 12.2. Criar `jest.integration.config.js`

```js
const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch: ["**/*.integration.spec.ts"],
  setupFiles: ["<rootDir>/jest.setup-env.js"],
  testTimeout: 30000,
};
```

### 12.3. Criar `jest.e2e.config.js`

```js
const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch: ["**/*.e2e.spec.ts"],
  setupFiles: ["<rootDir>/jest.setup-env.js"],
  testTimeout: 30000,
};
```

> `setupFiles` garante que o `.env.test` seja carregado antes de tudo, e
> `testTimeout: 30000` evita falsos negativos — testes que sobem o app, fazem
> requisições HTTP reais e acessam o banco de dados são naturalmente mais
> lentos que testes unitários (o timeout padrão do Jest é de 5 segundos).

### 12.4. Adicionar os scripts no `package.json`

```json
"scripts": {
  "...": "...",
  "test": "jest -c jest.config.js",
  "test:watch": "jest -c jest.config.js --watch",
  "test:integration": "jest -c jest.integration.config.js --runInBand",
  "test:e2e": "jest -c jest.e2e.config.js --runInBand"
}
```

> `--runInBand` faz o Jest rodar os arquivos de teste em sequência, no mesmo
> processo — essencial aqui, porque os testes de integração/e2e compartilham
> o **mesmo banco de dados**. Rodando em paralelo, um arquivo poderia
> limpar/alterar dados que outro arquivo está usando ao mesmo tempo.

---

## 13. Criar os testes de integração do CRUD de Customer

Crie o arquivo `src/__tests__/integration/customer.integration.spec.ts`.

### 13.1. O que torna esse teste "de integração"?

Diferente dos testes unitários, aqui **não mockamos** `CustomerService`,
`CustomerRepository` nem o banco de dados. As requisições passam pelo `app`
do Express (importado de `../../app`) e percorrem a pilha real:

```
supertest -> Express (app) -> middlewares -> CustomerController -> CustomerService -> CustomerRepository -> Postgres (banco de testes)
```

Isso garante que validamos o "encaixe" entre as camadas — algo que os testes
unitários, isolando cada peça, não conseguem garantir sozinhos.

### 13.2. Autenticação nos testes

As rotas `/customers` ficam atrás do `CustomerAuthorizationMiddleware`, que
exige um JWT válido no header `Authorization`. Para não depender do fluxo de
login, os testes:

1. Inserem um cliente "autenticado" diretamente no banco (com senha já
   criptografada via `bcryptjs`);
2. Geram um token JWT assinado com `jsonwebtoken.sign`, usando o mesmo
   `env.JWT_SECRET` e `env.JWT_EXPIRATION` configurados no `.env.test` — ou
   seja, um token "de verdade", aceito pelo middleware real.

```ts
function generateToken(customer: { id: number; name: string }): string {
  return sign({ id: customer.id, name: customer.name }, env.JWT_SECRET, {
    subject: customer.id.toString(),
    expiresIn: env.JWT_EXPIRATION,
  });
}
```

### 13.3. Funções auxiliares de setup e limpeza

```ts
async function seedCustomer(overrides = {}) {
  const hashedPassword = await hash(overrides.password ?? "123456", env.PASSWORD_SALT_ROUNDS);

  const [customer] = await db.insert(CustomerModel).values({
    name: overrides.name ?? "Integration Customer",
    email: overrides.email ?? uniqueEmail("integration"),
    password: hashedPassword,
  }).returning({ id: CustomerModel.id, name: CustomerModel.name, email: CustomerModel.email });

  return customer;
}

async function cleanCustomers() {
  await db.delete(CustomerModel);
}
```

- `seedCustomer` insere clientes diretamente no banco (sem passar pela API),
  útil para preparar cenários (ex.: "dois clientes com e-mails diferentes
  para testar o conflito de e-mail").
- `cleanCustomers` é usada em `beforeAll`/`afterAll` para garantir que o
  banco de testes comece e termine vazio.
- `uniqueEmail(prefix)` gera e-mails únicos (`prefix-timestamp-sequencia@email.com`)
  para que rodadas de teste nunca colidam entre si.

No final da suíte, fechamos a conexão com o banco para o Jest poder encerrar
o processo:

```ts
afterAll(async () => {
  await cleanCustomers();
  await db.$client.end();
});
```

### 13.4. Casos de teste cobertos

| Rota                  | Cenários testados                                                                 |
|-----------------------|------------------------------------------------------------------------------------|
| `GET /customers`      | retorna 401 sem token / lista os clientes sem expor a senha                       |
| `GET /customers/:id`  | retorna o cliente quando existe / retorna 404 quando não existe / retorna 400 quando o id é inválido |
| `PUT /customers/:id`  | atualiza o cliente e persiste a senha já criptografada no banco / retorna 409 em conflito de e-mail / retorna 400 quando o corpo é inválido |
| `DELETE /customers/:id` | remove o cliente do banco de dados / retorna 404 quando o cliente não existe   |

Repare que, depois de cada operação de escrita, o teste consulta o **banco de
dados diretamente** (`db.select()...`) para confirmar que os dados foram
persistidos corretamente — isso é o que diferencia um teste de integração de
um teste unitário de controller (que só verifica a resposta HTTP).

Veja o arquivo completo em
[`src/__tests__/integration/customer.integration.spec.ts`](src/__tests__/integration/customer.integration.spec.ts).

### 13.5. Rodando os testes de integração

Com o banco de testes no ar e as tabelas criadas (passos 11.3 e 11.5):

```bash
npm run test:integration
```

Saída esperada (resumida):

```
Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

---

## 14. Criar os testes e2e do CRUD de Customer

Crie o arquivo `src/__tests__/e2e/customer.e2e.spec.ts`.

### 14.1. Integração vs. e2e: qual a diferença aqui?

- Os testes de **integração** validam **uma rota por vez**, isoladamente,
  inclusive os casos de erro (400, 404, 409) — e usam atalhos (inserir
  cliente direto no banco, gerar token manualmente) para chegar mais rápido
  no cenário que importa.
- Os testes **e2e** simulam a **jornada real de um usuário do início ao fim**,
  encadeando várias chamadas, **sem atalhos**: o cliente é criado pela própria
  API (`POST /auth/customer/register`), o token vem da própria resposta de
  cadastro/login, e cada passo depende do resultado do passo anterior — exatamente
  como um app front-end utilizaria a API.

### 14.2. O fluxo testado

```
1. POST /auth/customer/register        -> cria a conta e retorna { id, token }
2. GET  /customers/:id                 -> consulta o próprio perfil
3. GET  /customers                     -> aparece na listagem geral
4. PUT  /customers/:id                 -> atualiza nome, e-mail e senha
5. POST /auth/customer/login           -> autentica com as NOVAS credenciais
6. DELETE /customers/:id               -> exclui a própria conta
7. GET  /customers/:id                 -> confirma 404 (a conta não existe mais)
```

### 14.3. Testes que dependem uns dos outros, de propósito

Note que os `it(...)` desse arquivo **compartilham estado** (`token` e
`customerId`, declarados fora dos testes) e **dependem da ordem de execução**
— o Jest executa os testes de um mesmo `describe` na ordem em que foram
declarados. Isso é intencional: juntos, eles representam um único cenário de
ponta a ponta, não casos isolados.

```ts
describe("Customer CRUD flow (e2e)", () => {
  const account = { name: "E2E Customer", email: `e2e-${Date.now()}@email.com`, password: "initial-password" };
  let token: string;
  let customerId: number;

  it("deve cadastrar um novo cliente e retornar um token de autenticação", async () => {
    const response = await request(app).post("/auth/customer/register").send(account);

    expect(response.status).toBe(201);
    token = response.body.token;
    customerId = response.body.id;
  });

  it("deve consultar os dados do próprio perfil pelo id retornado no cadastro", async () => {
    const response = await request(app)
      .get(`/customers/${customerId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  // ...os demais passos seguem a mesma lógica, encadeados
});
```

Um detalhe interessante validado no passo 5: o
`CustomerAuthorizationMiddleware` apenas verifica a assinatura/validade do
JWT — ele **não consulta o banco**. Por isso, no passo 7, mesmo após excluir
a conta, o token antigo ainda é aceito pelo middleware, e a requisição chega
até o `CustomerService`, que aí sim retorna 404 (`Customer not found`).

### 14.4. Limpeza ao final

```ts
afterAll(async () => {
  await db.delete(CustomerModel).where(eq(CustomerModel.email, account.email));
  await db.$client.end();
});
```

Veja o arquivo completo em
[`src/__tests__/e2e/customer.e2e.spec.ts`](src/__tests__/e2e/customer.e2e.spec.ts).

### 14.5. Rodando os testes e2e

```bash
npm run test:e2e
```

Saída esperada (resumida):

```
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

---

## 15. Resumo das novas configurações de teste

| Arquivo                                                          | O que foi feito                                                  |
|------------------------------------------------------------------|--------------------------------------------------------------------|
| `src/app.ts`                                                      | Criado — concentra a configuração do Express (extraído do `server.ts`) para permitir importar o `app` nos testes sem subir o servidor |
| `src/server.ts`                                                   | Simplificado — agora só importa o `app` e chama `app.listen(...)` |
| `.env.test`                                                       | Criado — variáveis de ambiente do banco/segredos usados nos testes de integração/e2e |
| `jest.setup-env.js`                                               | Criado — carrega o `.env.test` antes dos módulos da aplicação serem importados |
| `jest.config.js`                                                  | Atualizado — passa a ignorar arquivos `*.integration.spec.ts` e `*.e2e.spec.ts` |
| `jest.integration.config.js`                                     | Criado — roda apenas arquivos `*.integration.spec.ts`            |
| `jest.e2e.config.js`                                             | Criado — roda apenas arquivos `*.e2e.spec.ts`                    |
| `src/__tests__/integration/customer.integration.spec.ts`        | Testes de integração das rotas `/customers` (Controller+Service+Repository+banco real) |
| `src/__tests__/e2e/customer.e2e.spec.ts`                        | Teste e2e do fluxo completo: cadastro → consulta → listagem → atualização → login → exclusão |
| `package.json`                                                    | Adicionadas as dependências `supertest`/`@types/supertest` e os scripts `test:integration`/`test:e2e` |

---

## 16. Teste de carga com k6 no endpoint de cadastro

O teste de carga simula **vários usuários se cadastrando ao mesmo tempo** em
`POST /auth/customer/register`, para observar como a API se comporta sob
estresse (tempo de resposta, taxa de erros, etc.).

### 16.1. Instalar o k6

O k6 é uma ferramenta externa ao Node.js (não é instalada via `npm`). Siga as
instruções oficiais de instalação para o seu sistema operacional — no Linux,
geralmente via `snap`:

```bash
sudo snap install k6
```

### 16.2. Onde o script fica

O projeto já possui uma pasta `tests/` na raiz (fora do `back-end/`) com um
script de carga (`load-test.js`). Seguindo essa convenção, criamos
`tests/register-load-test.js`, focado **somente** no endpoint de cadastro.

### 16.3. Entendendo o script

```js
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
```

Pontos-chave:

- **`scenarios.register` (executor `ramping-vus`)**: define quantos usuários
  virtuais (VUs) simultâneos existem ao longo do tempo — sobe gradualmente até
  20, depois até 50, sustenta, e desce até zero. Isso simula um pico de acessos
  real, em vez de jogar toda a carga de uma vez.
- **`thresholds`**: critérios de aprovação/reprovação do teste — se 95% das
  respostas não ficarem abaixo de 800ms, ou se mais de 1% das requisições
  falharem, o k6 reporta o teste como reprovado.
- **E-mail único por iteração** (`loadtest.${__VU}.${__ITER}.${Date.now()}@k6.test`):
  cada usuário virtual e cada iteração geram um e-mail diferente. Isso evita
  que o serviço retorne `409 Email already exists`, o que distorceria as
  métricas (gerando "falhas" que não são falhas reais da API).
- **`check(...)`**: valida que cada cadastro realmente funcionou (status 201,
  token e id retornados) — sem isso, o teste só mediria "tempo de resposta",
  mesmo que todas as respostas fossem erro.
- **`handleSummary`**: ao final da execução, gera um relatório HTML navegável
  com os resultados (gráficos, percentis, taxa de erro, etc.).

### 16.4. Rodando o teste de carga

Com o back-end rodando (local ou via `docker compose up`), execute a partir da
**raiz do projeto**:

```bash
k6 run tests/register-load-test.js
```

Se a API estiver em um endereço diferente de `http://localhost:3000`, informe
via variável de ambiente:

```bash
BASE_URL=http://localhost:3000 k6 run tests/register-load-test.js
```

Ao final, um arquivo `register-load-report.html` será gerado na pasta onde o
comando foi executado — abra-o no navegador para visualizar o relatório
completo (tempos de resposta, taxa de erros, throughput, etc.).

> ⚠️ Esse teste cria dezenas/centenas de clientes reais no banco de dados ao
> qual a API estiver conectada. Rode-o sempre contra um ambiente de
> desenvolvimento/teste — nunca contra produção.

### 16.5. Interpretando o resultado

A saída do terminal mostra um resumo como:

```
checks_succeeded...: 100.00% 264 out of 264
http_req_duration..: avg=12.99ms p(95)=15.06ms
http_req_failed....: 0.00% out of 88
```

- `checks_succeeded` próximo de 100% indica que os cadastros estão funcionando
  corretamente sob carga.
- `http_req_duration` (principalmente o `p(95)`) mostra o tempo de resposta —
  compare com o threshold definido (`p(95)<800`).
- `http_req_failed` mostra a taxa de erros HTTP — deve ficar bem próxima de 0%.

Se os `thresholds` configurados forem violados, o k6 encerra com código de
saída diferente de zero — útil para integrar esse teste a uma pipeline de CI,
caso o projeto evolua nesse sentido.
