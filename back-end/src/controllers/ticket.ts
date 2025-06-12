import { Request, Response } from "express";
import { ParamsUtils } from "../utils/params";
import { db } from "../config/database";
import { TicketModel } from "../models/ticket";
import { EventModel } from "../models/event";
import { eq, sql } from "drizzle-orm";
import { EventPhotoModel } from "../models/event-photo";

export class TicketController {

  public async findByCustomerId(req: Request, res: Response): Promise<Response> {
    const { id: customerId } = ParamsUtils.getCustomerFromRequest(req);

    const tickets = await db
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

          photos: sql`COALESCE(array_agg(${EventPhotoModel.url}) FILTER (WHERE ${EventPhotoModel.url} IS NOT NULL), '{}')`.as("photos"),
        }
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
        EventModel.ticketPrice
      );

    return res.status(200).json(tickets);

  }
}