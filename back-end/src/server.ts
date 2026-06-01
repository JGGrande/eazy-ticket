import './config/otel'; // Importado PRIMEIRO — precisa instrumentar os módulos antes que sejam carregados
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { collectDefaultMetrics, register } from 'prom-client'; // collectDefaultMetrics: coleta CPU, memória e event loop do Node automaticamente | register: agrega todas as métricas
import { env } from './config/env';
import { customerRouter } from './routes/customer';
import { ErrorHandlerMiddleware } from './middlewares/errors';
import { HttpMetricsMiddleware } from './middlewares/http-metrics';
import { authRouter } from './routes/auth';
import { CustomerAuthorizationMiddleware } from './middlewares/customer-authorization';
import { eventRouter } from './routes/event';
import { checkoutRouter } from './routes/checkout';
import { publicRouter } from './routes/public';
import { ticketRouter } from './routes/ticket';

collectDefaultMetrics(); // Ativa coleta automática de métricas do runtime Node.js

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static('uploads'))
app.use(HttpMetricsMiddleware); // Registra o middleware de métricas HTTP para todas as rotas

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    PID: process.pid,
  });
});

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType); // Define o Content-Type correto para que o Prometheus reconheça o formato
  res.end(await register.metrics()); // Expõe todas as métricas coletadas no endpoint /metrics
});

app.use('/auth', authRouter);
app.use('/public', publicRouter);
app.use(CustomerAuthorizationMiddleware);
app.use('/customers', customerRouter);
app.use('/events', eventRouter);
app.use('/tickets', ticketRouter);
app.use('/checkout', checkoutRouter);

app.use(ErrorHandlerMiddleware);

app.listen(env.API_PORT, () => {
  console.info(`Server is running on port ${env.API_PORT}`);
});