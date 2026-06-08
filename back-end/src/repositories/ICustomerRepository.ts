import { CustomerData, UpdateCustomerInput } from "../types/customer";

export interface ICustomerRepository {
  findById(id: number): Promise<CustomerData | null>;
  findAll(): Promise<CustomerData[]>;
  existsById(id: number): Promise<boolean>;
  existsByEmailExcluding(email: string, excludeId: number): Promise<boolean>;
  update(id: number, data: UpdateCustomerInput): Promise<CustomerData | null>;
  deleteById(id: number): Promise<void>;
}
