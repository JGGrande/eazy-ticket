import { Request } from "express";
import { z } from "zod";

export class ParamsUtils {
  public static getId(req: Request): number {
    const idParamsSchema = z.object({
      id: z.coerce.number().int().positive("ID must be a positive integer"),
    });

    const { id } = idParamsSchema.parse(req.params);

    return id;
  }

  public static getCustomerFromRequest(req: Request) {
    const customer = req.customer;

    if (!customer) {
      throw new Error("Customer ID not found in request");
    }

    return customer;
  }
}