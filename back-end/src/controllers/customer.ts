import { Request, Response } from "express";
import { z } from "zod";
import { CustomerService } from "../services/customer.service";
import { ParamsUtils } from "../utils/params";

const updateCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters long")
    .max(100, "Name must be at most 100 characters long"),
  email: z
    .string()
    .email("Invalid email format")
    .max(100, "Email must be at most 100 characters long"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(100, "Password must be at most 100 characters long")
    .optional(),
});

export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  public async findById(req: Request, res: Response): Promise<Response> {
    const id = ParamsUtils.getId(req);
    const customer = await this.customerService.findById(id);
    return res.status(200).json(customer);
  }

  public async findAll(req: Request, res: Response): Promise<Response> {
    const customers = await this.customerService.findAll();
    return res.status(200).json(customers);
  }

  public async update(req: Request, res: Response): Promise<Response> {
    const id = ParamsUtils.getId(req);
    const body = updateCustomerSchema.parse(req.body);
    const customer = await this.customerService.update(id, body);
    return res.status(200).json(customer);
  }

  public async delete(req: Request, res: Response): Promise<Response> {
    const id = ParamsUtils.getId(req);
    await this.customerService.delete(id);
    return res.sendStatus(204);
  }
}