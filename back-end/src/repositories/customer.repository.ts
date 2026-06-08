import { and, asc, eq, not } from "drizzle-orm";
import { db } from "../config/database";
import { CustomerModel } from "../models/customer";
import { CustomerData, UpdateCustomerInput } from "../types/customer";
import { ICustomerRepository } from "./ICustomerRepository";

export class CustomerRepository implements ICustomerRepository {
  async findById(id: number): Promise<CustomerData | null> {
    const result = await db
      .select({
        id: CustomerModel.id,
        name: CustomerModel.name,
        email: CustomerModel.email,
      })
      .from(CustomerModel)
      .where(eq(CustomerModel.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  async findAll(): Promise<CustomerData[]> {
    return db
      .select({
        id: CustomerModel.id,
        name: CustomerModel.name,
        email: CustomerModel.email,
      })
      .from(CustomerModel)
      .orderBy(asc(CustomerModel.name));
  }

  async existsById(id: number): Promise<boolean> {
    const result = await db
      .select({ id: CustomerModel.id })
      .from(CustomerModel)
      .where(eq(CustomerModel.id, id))
      .limit(1);

    return result.length > 0;
  }

  async existsByEmailExcluding(email: string, excludeId: number): Promise<boolean> {
    const result = await db
      .select({ id: CustomerModel.id })
      .from(CustomerModel)
      .where(and(eq(CustomerModel.email, email), not(eq(CustomerModel.id, excludeId))))
      .limit(1);

    return result.length > 0;
  }

  async update(id: number, data: UpdateCustomerInput): Promise<CustomerData | null> {
    const [updated] = await db
      .update(CustomerModel)
      .set({
        name: data.name,
        email: data.email,
        ...(data.password ? { password: data.password } : {}),
      })
      .where(eq(CustomerModel.id, id))
      .returning({
        id: CustomerModel.id,
        name: CustomerModel.name,
        email: CustomerModel.email,
      });

    return updated ?? null;
  }

  async deleteById(id: number): Promise<void> {
    await db.delete(CustomerModel).where(eq(CustomerModel.id, id));
  }
}
