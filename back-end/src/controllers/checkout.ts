import { Request, Response } from "express";
import { z } from "zod";
import { db } from "../config/database";
import { EventModel } from "../models/event";
import { eq, sql } from "drizzle-orm";
import { DateUtils } from "../utils/date";
import { TicketModel } from "../models/ticket";
import { ParamsUtils } from "../utils/params";

export class CheckoutController {
  public async create(req: Request, res: Response): Promise<Response> {
    const createCheckoutSchema = z.object({
      eventId: z
        .number()
        .int("Event ID must be an integer")
        .positive("Event ID must be a positive number"),
      ticketCount: z
        .number()
        .int("Ticket count must be an integer")
        .positive("Ticket count must be a positive number"),
      paymentMethod: z
        .enum(["credit_card", "debit_card", "pix"], {
          message: "Invalid payment method",
        }),
    });

    const { eventId, ticketCount, paymentMethod } = createCheckoutSchema.parse(req.body);

    const { id: customerId } = ParamsUtils.getCustomerFromRequest(req);

    try {
      const result = await db.transaction(async (tx) => {
        //Lock para evitar problemas de concorrência ao comprar ingressos
        await tx.execute(sql`
          SELECT * FROM ${TicketModel} WHERE ${TicketModel.eventId} = ${eventId} FOR UPDATE
        `);

        const eventData = await tx
          .select()
          .from(EventModel)
          .where(eq(EventModel.id, eventId))
          .limit(1);

        if (eventData.length === 0) {
          return {
            message: "Event not found",
            statusCode: 404,
            totalPrice: 0,
            paymentMethod: null,
            tickets: [],
          };
        }

        const [event] = eventData;

        const eventHasStarted = DateUtils.isPast(event.initialDate);

        if (eventHasStarted) {
          return {
            message: "Event has already started",
            statusCode: 400,
            totalPrice: 0,
            paymentMethod: null,
            tickets: [],
          };
        }

        const ticketSoldQuantity = await tx.$count(TicketModel, eq(TicketModel.eventId, eventId));

        const ticketsAvailable = event.maxTickets - ticketSoldQuantity

        if (ticketCount > ticketsAvailable) {
          return {
            message: `Only ${ticketsAvailable} tickets available for this event`,
            statusCode: 400,
            totalPrice: 0,
            paymentMethod: null,
            tickets: [],
          };
        }

        const totalTicketPrice = event.ticketPrice * ticketCount;

        const tickets = Array.from({ length: ticketCount }, (_, index) => {
          const ticketCode = createTicketCode(eventId, ticketSoldQuantity + index);

          return {
            eventId,
            customerId,
            code: ticketCode,
          };
        });

        await tx.insert(TicketModel).values(tickets);

        return {
          message: "Tickets purchased successfully",
          statusCode: 201,
          totalPrice: totalTicketPrice,
          paymentMethod,
          tickets,
        };
      }, {
        isolationLevel: "repeatable read",
      });

      return res.status(result.statusCode).json(result);
    }catch (error) {
      throw error;
    }
  }
}

function createTicketCode(eventId: number, lastTicketNumber: number): string {
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const formattedEventId = eventId.toString().padStart(4, "0");
  const formattedTicketNumber = (lastTicketNumber + 1).toString().padStart(4, "0");

  const ticketCode = `${randomPart}-${formattedEventId}-${formattedTicketNumber}`;

  return ticketCode;
}