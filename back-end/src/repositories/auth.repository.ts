import { eq } from "drizzle-orm";
import { db } from "../config/database";
import { CustomerModel } from "../models/customer";
import { CustomerPublic, CustomerWithPassword, RegisterInput } from "../types/auth";
import { IAuthRepository } from "./IAuthRepository";

export class AuthRepository implements IAuthRepository {
  async findByEmail(email: string): Promise<CustomerWithPassword | null> {
    const result = await db
      .select({
        id: CustomerModel.id,
        name: CustomerModel.name,
        email: CustomerModel.email,
        password: CustomerModel.password,
      })
      .from(CustomerModel)
      .where(eq(CustomerModel.email, email))
      .limit(1);

    return result[0] ?? null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await db
      .select({ id: CustomerModel.id })
      .from(CustomerModel)
      .where(eq(CustomerModel.email, email))
      .limit(1);

    return result.length > 0;
  }

  async create(data: RegisterInput): Promise<CustomerPublic> {
    const [customer] = await db
      .insert(CustomerModel)
      .values(data)
      .returning({
        id: CustomerModel.id,
        name: CustomerModel.name,
        email: CustomerModel.email,
      });

    return customer;
  }
}
