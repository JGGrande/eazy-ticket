import { hash } from "bcryptjs";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import { ICustomerRepository } from "../repositories/ICustomerRepository";
import { CustomerData, UpdateCustomerInput } from "../types/customer";

export class CustomerService {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async findById(id: number): Promise<CustomerData> {
    const customer = await this.customerRepository.findById(id);

    if (!customer) {
      throw new AppError(404, "Customer not found");
    }

    return customer;
  }

  async findAll(): Promise<CustomerData[]> {
    return this.customerRepository.findAll();
  }

  async update(id: number, data: UpdateCustomerInput): Promise<CustomerData> {
    const exists = await this.customerRepository.existsById(id);

    if (!exists) {
      throw new AppError(404, "Customer not found");
    }

    const emailConflict = await this.customerRepository.existsByEmailExcluding(data.email, id);

    if (emailConflict) {
      throw new AppError(409, "Email already exists for another customer");
    }

    const updateData: UpdateCustomerInput = { ...data };

    if (updateData.password) {
      updateData.password = await hash(updateData.password, env.PASSWORD_SALT_ROUNDS);
    }

    const updated = await this.customerRepository.update(id, updateData);

    if (!updated) {
      throw new AppError(500, "Failed to update customer");
    }

    return updated;
  }

  async delete(id: number): Promise<void> {
    const exists = await this.customerRepository.existsById(id);

    if (!exists) {
      throw new AppError(404, "Customer not found");
    }

    await this.customerRepository.deleteById(id);
  }
}
