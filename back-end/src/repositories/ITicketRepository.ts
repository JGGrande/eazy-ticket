import { TicketWithEvent } from "../types/ticket";

export interface ITicketRepository {
  findByCustomerId(customerId: number): Promise<TicketWithEvent[]>;
}
