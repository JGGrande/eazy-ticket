import { asc, eq, gte, sql } from "drizzle-orm";
import { Request, Response } from "express";
import { z } from "zod";
import { db } from "../config/database";
import { EventModel } from "../models/event";
import { EventPhotoModel } from "../models/event-photo";
import { TicketModel } from "../models/ticket";
import { DateUtils } from "../utils/date";
import { FileUtils } from "../utils/file";
import { ParamsUtils } from "../utils/params";

export class EventController {
  public async create(req: Request, res: Response): Promise<Response> {
    const createEventSchema = z.object({
      name: z
        .string()
        .trim()
        .min(1, "Name is required")
        .max(100, "Name must be at most 100 characters long"),
      description: z
        .string()
        .trim()
        .min(1, "Description is required")
        .max(500, "Description must be at most 500 characters long"),
      location: z
        .string()
        .trim()
        .min(1, "Location is required")
        .max(200, "Location must be at most 200 characters long"),
      initialDate: z
        .string()
        .datetime({ offset: true, message: "Invalid initial date format" })
        .transform(date => new Date(date)),
      finalDate: z
        .string()
        .datetime({ offset: true, message: "Invalid final date format" })
        .transform(date => new Date(date)),
      maxTickets: z
        .number()
        .int("Max tickets must be an integer")
        .positive("Max tickets must be a positive number"),
      ticketPrice: z
        .number()
        .nonnegative("Ticket price cannot be negative"),
    });

    const eventRequestBody = createEventSchema.parse(req.body);

    const initialDateIsPast = DateUtils.isPast(eventRequestBody.initialDate);

    if(initialDateIsPast) {
      return res.status(400).json({
        error: "Initial date cannot be in the past",
      });
    }

    const finalDateIsBeforeInitial = DateUtils.isBefore(
      eventRequestBody.finalDate,
      eventRequestBody.initialDate
    );

    if(finalDateIsBeforeInitial) {
      return res.status(400).json({
        error: "Final date must be after initial date",
      });
    }

    const newEvent = await db
      .insert(EventModel)
      .values({
        name: eventRequestBody.name,
        description: eventRequestBody.description,
        location: eventRequestBody.location,
        initialDate: eventRequestBody.initialDate,
        finalDate: eventRequestBody.finalDate,
        maxTickets: eventRequestBody.maxTickets,
        ticketPrice: eventRequestBody.ticketPrice,
      })
      .returning();

    if (newEvent.length === 0) {
      return res.status(500).json({
        error: "Failed to create event",
      });
    }

    return res.status(201).json(newEvent[0]);
  }

  public async findById(req: Request, res: Response): Promise<Response> {
    const id = ParamsUtils.getId(req);

    const event = await db
      .select({
        id: EventModel.id,
        name: EventModel.name,
        description: EventModel.description,
        initialDate: EventModel.initialDate,
        finalDate: EventModel.finalDate,
        location: EventModel.location,
        maxTickets: EventModel.maxTickets,
        ticketPrice: EventModel.ticketPrice,

        photos: sql`COALESCE(array_agg(${EventPhotoModel.url}) FILTER (WHERE ${EventPhotoModel.url} IS NOT NULL), '{}')`.as("photos"),
      })
      .from(EventModel)
      .leftJoin(EventPhotoModel, eq(EventPhotoModel.eventId, EventModel.id))
      .where(eq(EventModel.id, id))
      .groupBy(EventModel.id)
      .limit(1);

    if (event.length === 0) {
      return res.status(404).json({
        error: "Event not found",
      });
    }

    return res.status(200).json(event[0]);
  }

  public async findAll(req: Request, res: Response): Promise<Response> {
    const queryParamsSchema = z.object({
      withExpired: z
        .string()
        .optional()
        .transform(value => value === "true"),
    });

    const { withExpired } = queryParamsSchema.parse(req.query);

    const events = await db
      .select({
        id: EventModel.id,
        name: EventModel.name,
        description: EventModel.description,
        initialDate: EventModel.initialDate,
        finalDate: EventModel.finalDate,
        location: EventModel.location,
        maxTickets: EventModel.maxTickets,
        ticketPrice: EventModel.ticketPrice,

        photos: sql`COALESCE(array_agg(${EventPhotoModel.url}) FILTER (WHERE ${EventPhotoModel.url} IS NOT NULL), '{}')`.as("photos"),
      })
      .from(EventModel)
      .leftJoin(EventPhotoModel, eq(EventPhotoModel.eventId, EventModel.id))
      .where(
        !withExpired
          ? gte(EventModel.initialDate, new Date())
          : undefined
      )
      .groupBy(EventModel.id)
      .orderBy(asc(EventModel.initialDate));

    return res.status(200).json(events);
  }

  public async update(req: Request, res: Response): Promise<Response> {
    const id = ParamsUtils.getId(req);

    const updateEventSchema = z.object({
      name: z
        .string()
        .trim()
        .min(1, "Name is required")
        .max(100, "Name must be at most 100 characters long"),
      description: z
        .string()
        .trim()
        .min(1, "Description is required")
        .max(500, "Description must be at most 500 characters long"),
      location: z
        .string()
        .trim()
        .min(1, "Location is required")
        .max(200, "Location must be at most 200 characters long"),
      initialDate: z
        .string()
        .datetime({ offset: true, message: "Invalid initial date format" })
        .transform(date => new Date(date)),
      finalDate: z
        .string()
        .datetime({ offset: true, message: "Invalid final date format" })
        .transform(date => new Date(date)),
      maxTickets: z
        .number()
        .int("Max tickets must be an integer")
        .positive("Max tickets must be a positive number"),
      ticketPrice: z
        .number()
        .nonnegative("Ticket price cannot be negative"),
    });

    const eventRequestBody = updateEventSchema.parse(req.body);

    const eventIsFinished = DateUtils.isPast(eventRequestBody.finalDate);

    if (eventIsFinished) {
      return res.status(400).json({
        error: "Event cannot be updated because it has already finished",
      });
    }

    const initialDateIsPast = DateUtils.isPast(eventRequestBody.initialDate);

    if(initialDateIsPast) {
      return res.status(400).json({
        error: "Initial date cannot be in the past",
      });
    }

    const finalDateIsBeforeInitial = DateUtils.isBefore(
      eventRequestBody.finalDate,
      eventRequestBody.initialDate
    );

    if(finalDateIsBeforeInitial) {
      return res.status(400).json({
        error: "Final date must be after initial date",
      });
    }

    const existingEvent = await db
      .select()
      .from(EventModel)
      .where(eq(EventModel.id, id))
      .limit(1);

    if (existingEvent.length === 0) {
      return res.status(404).json({
        error: "Event not found",
      });
    }

    const totalEventTickets = await db.$count(TicketModel, eq(TicketModel.eventId, id));

    if (eventRequestBody.maxTickets < totalEventTickets) {
      return res.status(400).json({
        error: "Cannot update event because the new max tickets is less than the total tickets sold",
      });
    }

    const [ event ] = existingEvent;

    event.name = eventRequestBody.name;
    event.description = eventRequestBody.description;
    event.location = eventRequestBody.location;
    event.initialDate = eventRequestBody.initialDate;
    event.finalDate = eventRequestBody.finalDate;
    event.maxTickets = eventRequestBody.maxTickets;
    event.ticketPrice = eventRequestBody.ticketPrice;

    const updatedEvent = await db
      .update(EventModel)
      .set({
        name: event.name,
        description: event.description,
        location: event.location,
        initialDate: event.initialDate,
        finalDate: event.finalDate,
        maxTickets: event.maxTickets,
        ticketPrice: event.ticketPrice,
      })
      .where(eq(EventModel.id, id))
      .returning();

    if (updatedEvent.length === 0) {
      return res.status(500).json({
        error: "Failed to update event",
      });
    }

    return res.status(200).json(updatedEvent[0]);
  }

  public async delete(req: Request, res: Response): Promise<Response> {
    const id = ParamsUtils.getId(req);

    const existingEvent = await db
      .select({
        id: EventModel.id,
        finalDate: EventModel.finalDate,
      })
      .from(EventModel)
      .where(eq(EventModel.id, id))
      .limit(1);

    if (existingEvent.length === 0) {
      return res.status(404).json({
        error: "Event not found",
      });
    }

    const [ event ] = existingEvent;

    const eventIsFinished = DateUtils.isPast(event.finalDate);

    if (eventIsFinished) {
      return res.status(400).json({
        error: "Event cannot be deleted because it has already finished",
      });
    }

    const totalEventTickets = await db.$count(TicketModel, eq(TicketModel.eventId, id));

    if (totalEventTickets > 0) {
      return res.status(400).json({
        error: "Cannot delete event because it has tickets sold",
      });
    }

    await db.delete(EventModel).where(eq(EventModel.id, id));

    return res.status(204).send();
  }

  public async addImage(req: Request, res: Response): Promise<Response> {
    const eventId = ParamsUtils.getId(req);

    if (!req.file) {
      return res.status(400).json({
        error: "Image file is required",
      });
    }

    const fileName = FileUtils.getFileName(req.file);
    const filePath = FileUtils.getFilePath(fileName);
    const fileUrl = FileUtils.getFileUrl(filePath);

    await FileUtils.save(filePath, req.file.buffer);

    await db.insert(EventPhotoModel).values({
      eventId: eventId,
      fileName: fileName,
      url: fileUrl,
    });

    return res.sendStatus(204);
  }

  public async removeImage(req: Request, res: Response): Promise<Response> {
    const removeImageSchema = z.object({
      imageId: z
        .coerce
        .number()
        .int("Image ID must be an integer")
        .positive("Image ID must be a positive number"),
    });

    const { imageId } = removeImageSchema.parse(req.params);

    const existingPhoto = await db
      .select()
      .from(EventPhotoModel)
      .where(eq(EventPhotoModel.id, imageId))
      .limit(1);

    if (existingPhoto.length === 0) {
      return res.status(404).json({
        error: "Event photo not found",
      });
    }

    const [ photo ] = existingPhoto;

    await FileUtils.delete(photo.url);

    await db.delete(EventPhotoModel).where(eq(EventPhotoModel.id, imageId));

    return res.sendStatus(204);
  }
}