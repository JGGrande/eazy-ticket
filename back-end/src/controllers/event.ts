import { Request, Response } from "express";
import { z } from "zod";
import { EventService } from "../services/event.service";
import { ParamsUtils } from "../utils/params";

const eventSchema = z.object({
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

export class EventController {
  constructor(private readonly eventService: EventService) {}

  public async create(req: Request, res: Response): Promise<Response> {
    const body = eventSchema.parse(req.body);
    const event = await this.eventService.create(body);
    return res.status(201).json(event);
  }

  public async findById(req: Request, res: Response): Promise<Response> {
    const id = ParamsUtils.getId(req);
    const event = await this.eventService.findById(id);
    return res.status(200).json(event);
  }

  public async findAll(req: Request, res: Response): Promise<Response> {
    const querySchema = z.object({
      withExpired: z
        .string()
        .optional()
        .transform(value => value === "true"),
    });

    const { withExpired } = querySchema.parse(req.query);
    const events = await this.eventService.findAll(withExpired);
    return res.status(200).json(events);
  }

  public async update(req: Request, res: Response): Promise<Response> {
    const id = ParamsUtils.getId(req);
    const body = eventSchema.parse(req.body);
    const event = await this.eventService.update(id, body);
    return res.status(200).json(event);
  }

  public async delete(req: Request, res: Response): Promise<Response> {
    const id = ParamsUtils.getId(req);
    await this.eventService.delete(id);
    return res.status(204).send();
  }

  public async addImage(req: Request, res: Response): Promise<Response> {
    const eventId = ParamsUtils.getId(req);

    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    await this.eventService.addImage(eventId, req.file);
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
    await this.eventService.removeImage(imageId);
    return res.sendStatus(204);
  }
}