import { CustomerPublic, CustomerWithPassword, RegisterInput } from "../types/auth";

export interface IAuthRepository {
  findByEmail(email: string): Promise<CustomerWithPassword | null>;
  existsByEmail(email: string): Promise<boolean>;
  create(data: RegisterInput): Promise<CustomerPublic>;
}
