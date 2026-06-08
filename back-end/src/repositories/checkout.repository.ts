import { eq, sql } from "drizzle-orm";
import { logger } from "../config/logger";
import { db } from "../config/database";
import { EventModel } from "../models/event";
import { TicketModel } from "../models/ticket";
import {
  CheckoutRepositoryResult,
  CreateCheckoutInput,
  TicketItem,
} from "../types/checkout";
import { DateUtils } from "../utils/date";
import { ICheckoutRepository } from "./ICheckoutRepository";

function createTicketCode(eventId: number, lastTicketNumber: number): string {
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const formattedEventId = eventId.toString().padStart(4, "0");
  const formattedTicketNumber = (lastTicketNumber + 1).toString().padStart(4, "0");

  return `${randomPart}-${formattedEventId}-${formattedTicketNumber}`;
}

export class CheckoutRepository implements ICheckoutRepository {
  async checkout(input: CreateCheckoutInput): Promise<CheckoutRepositoryResult> {
    const { customerId, eventId, ticketCount, paymentMethod } = input;

    return db.transaction(async (tx) => {
      // Pessimistic lock to prevent race conditions on ticket purchases
      await tx.execute(sql`
        SELECT * FROM ${TicketModel} WHERE ${TicketModel.eventId} = ${eventId} FOR UPDATE
      `);

      const eventData = await tx
        .select()
        .from(EventModel)
        .where(eq(EventModel.id, eventId))
        .limit(1);

      if (eventData.length === 0) {
        logger.warn("Checkout failed: event not found", { eventId, customerId });
        return { ok: false, statusCode: 404, message: "Event not found" };
      }

      const [event] = eventData;

      if (DateUtils.isPast(event.initialDate)) {
        logger.warn("Checkout failed: event has already started", { eventId, customerId });
        return { ok: false, statusCode: 400, message: "Event has already started" };
      }

      const ticketSoldQuantity = await tx.$count(TicketModel, eq(TicketModel.eventId, eventId));
      const ticketsAvailable = event.maxTickets - ticketSoldQuantity;

      if (ticketCount > ticketsAvailable) {
        logger.warn("Checkout failed: not enough tickets available", {
          eventId,
          customerId,
          requested: ticketCount,
          available: ticketsAvailable,
        });
        return {
          ok: false,
          statusCode: 400,
          message: `Only ${ticketsAvailable} tickets available for this event`,
        };
      }

      const totalPrice = event.ticketPrice * ticketCount;

      const tickets: TicketItem[] = Array.from({ length: ticketCount }, (_, index) => ({
        eventId,
        customerId,
        code: createTicketCode(eventId, ticketSoldQuantity + index),
      }));

      await tx.insert(TicketModel).values(tickets);

      logger.info("Tickets purchased", { eventId, customerId, ticketCount, totalPrice, paymentMethod });

      return { ok: true, data: { totalPrice, paymentMethod, tickets } };
    }, {
      isolationLevel: "repeatable read",
    });
  }
}
