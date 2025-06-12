import { integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { EventModel } from "./event";

const EventPhotoModel = pgTable("event_photo", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  eventId: integer("event_id").notNull().references(() => EventModel.id),
  fileName: varchar("file_name", { length: 100 }).notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
});

export { EventPhotoModel };
