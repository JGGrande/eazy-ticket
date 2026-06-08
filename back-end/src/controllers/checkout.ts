import { Request, Response } from "express";
import { z } from "zod";
import { CheckoutService } from "../services/checkout.service";
import { ParamsUtils } from "../utils/params";

const createCheckoutSchema = z.object({
  eventId: z
    .number()
    .int("Event ID must be an integer")
    .positive("Event ID must be a positive number"),
  ticketCount: z
    .number()
    .int("Ticket count must be an integer")
    .positive("Ticket count must be a positive number"),
  paymentMethod: z.enum(["credit_card", "debit_card", "pix"], {
    message: "Invalid payment method",
  }),
});

export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  public async create(req: Request, res: Response): Promise<Response> {
    const body = createCheckoutSchema.parse(req.body);
    const { id: customerId } = ParamsUtils.getCustomerFromRequest(req);

    const data = await this.checkoutService.create({ ...body, customerId });

    return res.status(201).json({
      message: "Tickets purchased successfully",
      statusCode: 201,
      ...data,
    });
  }
}