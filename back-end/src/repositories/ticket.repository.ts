import { eq, sql } from "drizzle-orm";
import { db } from "../config/database";
import { EventModel } from "../models/event";
import { EventPhotoModel } from "../models/event-photo";
import { TicketModel } from "../models/ticket";
import { TicketWithEvent } from "../types/ticket";
import { ITicketRepository } from "./ITicketRepository";

export class TicketRepository implements ITicketRepository {
  async findByCustomerId(customerId: number): Promise<TicketWithEvent[]> {
    return db
      .select({
        id: TicketModel.id,
        eventId: TicketModel.eventId,
        code: TicketModel.code,
        event: {
          id: EventModel.id,
          name: EventModel.name,
          description: EventModel.description,
          initialDate: EventModel.initialDate,
          finalDate: EventModel.finalDate,
          location: EventModel.location,
          maxTickets: EventModel.maxTickets,
          ticketPrice: EventModel.ticketPrice,
          photos: sql<string[]>`COALESCE(array_agg(${EventPhotoModel.url}) FILTER (WHERE ${EventPhotoModel.url} IS NOT NULL), '{}')`.as("photos"),
        },
      })
      .from(TicketModel)
      .leftJoin(EventModel, eq(TicketModel.eventId, EventModel.id))
      .leftJoin(EventPhotoModel, eq(EventModel.id, EventPhotoModel.eventId))
      .where(eq(TicketModel.customerId, customerId))
      .groupBy(
        TicketModel.id,
        EventModel.id,
        EventModel.name,
        EventModel.description,
        EventModel.initialDate,
        EventModel.finalDate,
        EventModel.location,
        EventModel.maxTickets,
        EventModel.ticketPrice,
      ) as unknown as Promise<TicketWithEvent[]>;
  }
}
