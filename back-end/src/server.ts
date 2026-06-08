import './config/otel'; // Importado PRIMEIRO — precisa instrumentar os módulos antes que sejam carregados
import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

app.listen(env.API_PORT, () => {
  logger.info(`Server is running on port ${env.API_PORT}`);
});
