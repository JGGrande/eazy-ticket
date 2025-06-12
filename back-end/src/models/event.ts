import { decimal, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

const EventModel = pgTable("event", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  location: varchar("location", { length: 200 }).notNull(),
  initialDate: timestamp("initial_date", { precision: 6, withTimezone: true }).notNull(),
  finalDate: timestamp("final_date", { precision: 6, withTimezone: true }).notNull(),
  maxTickets: integer("max_tickets").notNull(),
  ticketPrice: decimal("ticket_price", { precision: 10, scale: 4, mode: "number" }).notNull(),
});

export { EventModel };
