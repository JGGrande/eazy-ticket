import { Router } from "express";
import { EventController } from "../controllers/event";
import { EventService } from "../services/event.service";
import { EventRepository } from "../repositories/event.repository";

const publicRouter = Router();

const eventRepository = new EventRepository();
const eventService = new EventService(eventRepository);
const eventController = new EventController(eventService);

publicRouter.get("/events", eventController.findAll.bind(eventController));
publicRouter.get("/events/:id", eventController.findById.bind(eventController));

export { publicRouter };
