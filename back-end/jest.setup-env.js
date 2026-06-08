const { config } = require("dotenv");
const path = require("path");

// Carrega as variáveis do .env.test ANTES de qualquer módulo da aplicação
// (como src/config/env.ts) ser importado pelos testes de integração/e2e.
// O dotenv não sobrescreve variáveis já existentes em process.env, então
// isso garante que o banco de testes seja usado em vez do banco de desenvolvimento.
config({ path: path.resolve(__dirname, ".env.test") });
