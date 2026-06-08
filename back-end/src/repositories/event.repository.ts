import { asc, eq, gte, sql } from "drizzle-orm";
import { db } from "../config/database";
import { EventModel } from "../models/event";
import { EventPhotoModel } from "../models/event-photo";
import { TicketModel } from "../models/ticket";
import {
  CreateEventInput,
  EventData,
  EventPhotoData,
  EventWithPhotos,
  UpdateEventInput,
} from "../types/event";
import { IEventRepository } from "./IEventRepository";

export class EventRepository implements IEventRepository {
  async create(data: CreateEventInput): Promise<EventData> {
    const [event] = await db
      .insert(EventModel)
      .values(data)
      .returning();

    return event;
  }

  async findById(id: number): Promise<EventWithPhotos | null> {
    const result = await db
      .select({
        id: EventModel.id,
        name: EventModel.name,
        description: EventModel.description,
        initialDate: EventModel.initialDate,
        finalDate: EventModel.finalDate,
        location: EventModel.location,
        maxTickets: EventModel.maxTickets,
        ticketPrice: EventModel.ticketPrice,
        photos: sql<string[]>`COALESCE(array_agg(${EventPhotoModel.url}) FILTER (WHERE ${EventPhotoModel.url} IS NOT NULL), '{}')`.as("photos"),
      })
      .from(EventModel)
      .leftJoin(EventPhotoModel, eq(EventPhotoModel.eventId, EventModel.id))
      .where(eq(EventModel.id, id))
      .groupBy(EventModel.id)
      .limit(1);

    return result[0] ?? null;
  }

  async findAll(withExpired: boolean): Promise<EventWithPhotos[]> {
    return db
      .select({
        id: EventModel.id,
        name: EventModel.name,
        description: EventModel.description,
        initialDate: EventModel.initialDate,
        finalDate: EventModel.finalDate,
        location: EventModel.location,
        maxTickets: EventModel.maxTickets,
        ticketPrice: EventModel.ticketPrice,
        photos: sql<string[]>`COALESCE(array_agg(${EventPhotoModel.url}) FILTER (WHERE ${EventPhotoModel.url} IS NOT NULL), '{}')`.as("photos"),
      })
      .from(EventModel)
      .leftJoin(EventPhotoModel, eq(EventPhotoModel.eventId, EventModel.id))
      .where(!withExpired ? gte(EventModel.initialDate, new Date()) : undefined)
      .groupBy(EventModel.id)
      .orderBy(asc(EventModel.initialDate));
  }

  async update(id: number, data: UpdateEventInput): Promise<EventData | null> {
    const [updated] = await db
      .update(EventModel)
      .set(data)
      .where(eq(EventModel.id, id))
      .returning();

    return updated ?? null;
  }

  async deleteById(id: number): Promise<void> {
    await db.delete(EventModel).where(eq(EventModel.id, id));
  }

  async countTicketsByEventId(eventId: number): Promise<number> {
    return db.$count(TicketModel, eq(TicketModel.eventId, eventId));
  }

  async findPhotoById(imageId: number): Promise<EventPhotoData | null> {
    const result = await db
      .select()
      .from(EventPhotoModel)
      .where(eq(EventPhotoModel.id, imageId))
      .limit(1);

    return result[0] ?? null;
  }

  async addPhoto(eventId: number, fileName: string, url: string): Promise<void> {
    await db.insert(EventPhotoModel).values({ eventId, fileName, url });
  }

  async removePhotoById(imageId: number): Promise<void> {
    await db.delete(EventPhotoModel).where(eq(EventPhotoModel.id, imageId));
  }
}
