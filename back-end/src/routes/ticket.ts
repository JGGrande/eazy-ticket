import { Router } from "express";
import { TicketController } from "../controllers/ticket";

const ticketRouter = Router();
const ticketController = new TicketController();

ticketRouter.get("/", ticketController.findByCustomerId);

export { ticketRouter };