import { Router } from "express";
import { TicketController } from "../controllers/ticket";
import { TicketRepository } from "../repositories/ticket.repository";
import { TicketService } from "../services/ticket.service";

const ticketRepository = new TicketRepository();
const ticketService = new TicketService(ticketRepository);
const ticketController = new TicketController(ticketService);

const ticketRouter = Router();

// .bind(ticketController) garante que, quando o Express chamar o método como função isolada,
// o "this" dentro dele continue apontando para a instância de ticketController.
// Sem o bind, "this" seria undefined (modo estrito) e a injeção de dependência via constructor seria perdida.
ticketRouter.get("/", ticketController.findByCustomerId.bind(ticketController));

export { ticketRouter };