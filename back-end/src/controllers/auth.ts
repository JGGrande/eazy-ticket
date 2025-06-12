import { Request, Response } from "express";
import { z } from "zod";
import { db } from "../config/database";
import { CustomerModel } from "../models/customer";
import { and, eq } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { env } from "../config/env";

export class AuthController {

  public async customerLogin(req: Request, res: Response): Promise<Response> {
    const loginsSchema = z.object({
      email: z
        .string()
        .email("Invalid email format")
        .max(100, "Email must be at most 100 characters long"),
      password: z
        .string()
        .min(6, "Password must be at least 6 characters long")
        .max(100, "Password must be at most 100 characters long")
    });

    const loginRequestBody = loginsSchema.parse(req.body);

    const customerQueryResult = await db.
      select({
        id: CustomerModel.id,
        name: CustomerModel.name,
        email: CustomerModel.email,
        password: CustomerModel.password,
      })
      .from(CustomerModel)
      .where(
        and(
          eq(CustomerModel.email, loginRequestBody.email),
        )
      )
      .limit(1);

    if (customerQueryResult.length === 0) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const customer = customerQueryResult[0];

    const isValidPassword = await compare(loginRequestBody.password, customer.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const jwtToken =  createJWT({
      id: customer.id,
      name: customer.name,
    });

    return res.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      token: jwtToken,
    });
  }

  public async customerRegister(req: Request, res: Response): Promise<Response> {
    const registerCustomerSchema = z.object({
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
        .max(100, "Password must be at most 100 characters long"),
    });

    const customerBody = registerCustomerSchema.parse(req.body);

    const emailAlreadyExists = await db.query.customers.findFirst({
      columns: { id: true },
      where: (customers, { eq }) => eq(customers.email, customerBody.email),
    });

    if (emailAlreadyExists) {
      return res.status(409).json({
        error: "Email already exists",
      });
    }

    const passwordEncrypted = await hash(customerBody.password, env.PASSWORD_SALT_ROUNDS);

    const customer = await db
      .insert(CustomerModel)
      .values({
        name: customerBody.name,
        email: customerBody.email,
        password: passwordEncrypted,
      })
      .returning({
        id: CustomerModel.id,
        name: CustomerModel.name,
        email: CustomerModel.email,
      });

    if (customer.length === 0) {
      return res.status(500).json({
        error: "Failed to create customer",
      });
    }

    const jwtToken = createJWT({
      id: customer[0].id,
      name: customer[0].name,
    });

    return res.status(201).json({
      id: customer[0].id,
      name: customer[0].name,
      email: customer[0].email,
      token: jwtToken,
    });
  }
}

function createJWT(customer: { id: number; name: string; }): string {
  const jwtToken = sign(
    {
      id: customer.id,
      name: customer.name,
    },
    env.JWT_SECRET,
    {
      subject: customer.id.toString(),
      expiresIn: env.JWT_EXPIRATION,
    }
  );

  return jwtToken;
}