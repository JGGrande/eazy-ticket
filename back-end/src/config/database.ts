import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from './env';
import { CustomerModel } from '../models/customer';
import { EventModel } from '../models/event';
import { EventPhotoModel } from '../models/event-photo';
import { TicketModel } from '../models/ticket';

const db = drizzle(env.DATABASE_URL, {
  logger: env.NODE_ENV === 'development' ? true : false,
  schema: {
    customers: CustomerModel,
    events: EventModel,
    eventsPhoto: EventPhotoModel,
    tickets: TicketModel,
  },
});

db.execute('SELECT 1')
.then(() => {
  console.info('Database connection successful');
})
.catch((error) => {
  console.error('Database connection failed:', error);
  throw new Error('Database connection failed');
});

export { db };