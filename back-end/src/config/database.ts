import { Pool } from 'pg'; // Pool de conexões do driver pg — necessário para interceptar queries manualmente
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from './env';
import { dbQueryDuration } from './metrics';
import { CustomerModel } from '../models/customer';
import { EventModel } from '../models/event';
import { EventPhotoModel } from '../models/event-photo';
import { TicketModel } from '../models/ticket';

const pool = new Pool({ connectionString: env.DATABASE_URL });

// Evento disparado toda vez que uma nova conexão é criada no pool
// Usado para injetar o timer de métricas em todas as queries
pool.on('connect', (client) => {
  const originalQuery = (client as any).query.bind(client); // Salva referência da query original antes de sobrescrevê-la

  // Sobrescreve o método query do cliente para injetar o timer de métricas
  (client as any).query = function (...args: any[]) {
    const text = typeof args[0] === 'string' ? args[0] : (args[0]?.text ?? ''); // Extrai o texto SQL — pode ser string direta ou objeto { text, values }
    const operation = text.trim().split(/\s+/)[0].toLowerCase() || 'query'; // Pega a primeira palavra do SQL (select, insert, update, delete...)
    const end = dbQueryDuration.startTimer({ operation }); // Inicia o cronômetro com o tipo de operação como label

    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'function') {
      // Se o último argumento é um callback (estilo antigo do pg), envolve para parar o timer ao terminar
      args[args.length - 1] = (err: any, result: any) => { end(); lastArg(err, result); };
      return originalQuery(...args);
    }

    const result: Promise<any> = originalQuery(...args);
    result.then(() => end(), () => end()); // Para o timer tanto em sucesso quanto em erro (Promise style)
    return result;
  };
});

// Passa o pool instrumentado ao Drizzle em vez da connection string direta
const db = drizzle(pool, {
  logger: env.NODE_ENV === 'development' ? true : false,
  schema: {
    customers: CustomerModel,
    events: EventModel,
    eventsPhoto: EventPhotoModel,
    tickets: TicketModel,
  },
});

pool.query('SELECT 1') // Usa o pool diretamente para o health check de conexão
  .then(() => {
    console.info('Database connection successful');
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    throw new Error('Database connection failed');
  });

export { db };