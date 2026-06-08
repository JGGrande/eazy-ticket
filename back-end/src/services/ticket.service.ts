import { logger } from "../config/logger";
import { ITicketRepository } from "../repositories/ITicketRepository";
import { TicketWithEvent } from "../types/ticket";

export class TicketService {
  constructor(private readonly ticketRepository: ITicketRepository) {}

  async findByCustomerId(customerId: number): Promise<TicketWithEvent[]> {
    const tickets = await this.ticketRepository.findByCustomerId(customerId);

    logger.info("Tickets fetched for customer", { customerId, count: tickets.length });

    return tickets;
  }
}
