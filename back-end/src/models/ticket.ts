import { boolean, integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { EventModel } from "./event";
import { CustomerModel } from "./customer";

const TicketModel = pgTable("ticket", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  eventId: integer("event_id").notNull().references(() => EventModel.id),
  customerId: integer("customer_id").notNull().references(() => CustomerModel.id),
  code: varchar("code", { length: 50 }).unique().notNull(),
  wasRecused: boolean("was_recused").default(false),
});

export { TicketModel };
