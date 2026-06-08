import { AppError } from "../errors/app-error";
import { ICheckoutRepository } from "../repositories/ICheckoutRepository";
import { CheckoutData, CreateCheckoutInput } from "../types/checkout";

export class CheckoutService {
  constructor(private readonly checkoutRepository: ICheckoutRepository) {}

  async create(input: CreateCheckoutInput): Promise<CheckoutData> {
    const result = await this.checkoutRepository.checkout(input);

    if (!result.ok) {
      throw new AppError(result.statusCode, result.message);
    }

    return result.data;
  }
}
