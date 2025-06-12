import { Request, Response } from "express";
import { z } from "zod";
import { db } from "../config/database";
import { CustomerModel } from "../models/customer";
import { and, asc, eq, not } from "drizzle-orm";
import { hash } from "bcryptjs";
import { env } from "../config/env";
import { ParamsUtils } from "../utils/params";

export class CustomerController {

  public async findById(req: Request, res: Response): Promise<Response> {
    const id = ParamsUtils.getId(req);

    const customer = await db
      .select({
        id: CustomerModel.id,
        name: CustomerModel.name,
        email: CustomerModel.email,
      })
      .from(CustomerModel)
      .where(eq(CustomerModel.id, id))
      .limit(1);

    if (customer.length === 0) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    return res.status(200).json(customer[0]);
  }

  public async findAll(req: Request, res: Response): Promise<Response> {
    const customers = await db
      .select({
        id: CustomerModel.id,
        name: CustomerModel.name,
        email: CustomerModel.email,
      })
      .from(CustomerModel)
      .orderBy(asc(CustomerModel.name));

    return res.status(200).json(customers);
  }

  public async update(req: Request, res: Response): Promise<Response> {
    const id = ParamsUtils.getId(req);

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

    const customerBody = updateCustomerSchema.parse(req.body);

    const customerExits = await db
      .select({ id: CustomerModel.id })
      .from(CustomerModel)
      .where(eq(CustomerModel.id, id))
      .limit(1);

    if (customerExits.length === 0) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    const emailAlreadyExistsWithAnotherCustomer = await db
      .select({ id: CustomerModel.id })
      .from(CustomerModel)
      .where(
        and(
          eq(CustomerModel.email, customerBody.email),
          not(eq(CustomerModel.id, id))
        )
      )
      .limit(1);

    if (emailAlreadyExistsWithAnotherCustomer.length > 0) {
      return res.status(409).json({
        error: "Email already exists for another customer",
      });
    }

    if (customerBody.password) {
      const passwordEncrypted = await hash(customerBody.password, env.PASSWORD_SALT_ROUNDS);

      customerBody.password = passwordEncrypted;
    }

    const updatedCustomer = await db.
      update(CustomerModel)
      .set({
        name: customerBody.name,
        email: customerBody.email,
        ...(customerBody.password ? { password: customerBody.password } : {}),
      })
      .where(eq(CustomerModel.id, id))
      .returning({
        id: CustomerModel.id,
        name: CustomerModel.name,
        email: CustomerModel.email,
      });

    if (updatedCustomer.length === 0) {
      return res.status(500).json({
        error: "Failed to update customer",
      });
    }

    return res.status(200).json(updatedCustomer[0]);
  }

  public async delete(req: Request, res: Response): Promise<Response> {
    const id = ParamsUtils.getId(req);

    const customerExits = await db
      .select({ id: CustomerModel.id })
      .from(CustomerModel)
      .where(eq(CustomerModel.id, id))
      .limit(1);

    if (customerExits.length === 0) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    await db.delete(CustomerModel).where(eq(CustomerModel.id, id));

    return res.sendStatus(204);
  }

}