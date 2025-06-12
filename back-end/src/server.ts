import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { customerRouter } from './routes/customer';
import { ErrorHandlerMiddleware } from './middlewares/errors';
import { authRouter } from './routes/auth';
import { CustomerAuthorizationMiddleware } from './middlewares/customer-authorization';
import { eventRouter } from './routes/event';
import { checkoutRouter } from './routes/checkout';
import { publicRouter } from './routes/public';
import { ticketRouter } from './routes/ticket';

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static('uploads'))

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