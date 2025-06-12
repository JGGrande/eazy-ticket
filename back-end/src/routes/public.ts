import { Router } from "express";
import { EventController } from "../controllers/event";

const publicRouter = Router();

const eventController = new EventController();

publicRouter.get("/events", eventController.findAll);
publicRouter.get("/events/:id", eventController.findById);

export { publicRouter };
