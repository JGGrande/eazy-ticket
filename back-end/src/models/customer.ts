import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

const CustomerModel = pgTable("customer", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 100 }).notNull(),
});

export { CustomerModel };
