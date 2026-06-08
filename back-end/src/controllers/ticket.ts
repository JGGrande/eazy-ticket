import { Request, Response } from "express";
import { TicketService } from "../services/ticket.service";
import { ParamsUtils } from "../utils/params";

export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  public async findByCustomerId(req: Request, res: Response): Promise<Response> {
    const { id: customerId } = ParamsUtils.getCustomerFromRequest(req);
    const tickets = await this.ticketService.findByCustomerId(customerId);
    return res.status(200).json(tickets);
  }
}