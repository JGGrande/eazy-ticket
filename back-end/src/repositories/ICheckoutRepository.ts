import { CheckoutRepositoryResult, CreateCheckoutInput } from "../types/checkout";

export interface ICheckoutRepository {
  checkout(input: CreateCheckoutInput): Promise<CheckoutRepositoryResult>;
}
