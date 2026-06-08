import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import { IAuthRepository } from "../repositories/IAuthRepository";
import { AuthResult, LoginInput, RegisterInput } from "../types/auth";

export class AuthService {
  constructor(private readonly authRepository: IAuthRepository) {}

  async login(data: LoginInput): Promise<AuthResult> {
    const customer = await this.authRepository.findByEmail(data.email);

    if (!customer) {
      throw new AppError(401, "Invalid email or password");
    }

    const isValidPassword = await compare(data.password, customer.password);

    if (!isValidPassword) {
      throw new AppError(401, "Invalid email or password");
    }

    const token = this.createJWT({ id: customer.id, name: customer.name });

    return { id: customer.id, name: customer.name, email: customer.email, token };
  }

  async register(data: RegisterInput): Promise<AuthResult> {
    const emailTaken = await this.authRepository.existsByEmail(data.email);

    if (emailTaken) {
      throw new AppError(409, "Email already exists");
    }

    const hashedPassword = await hash(data.password, env.PASSWORD_SALT_ROUNDS);

    const customer = await this.authRepository.create({
      ...data,
      password: hashedPassword,
    });

    const token = this.createJWT({ id: customer.id, name: customer.name });

    return { id: customer.id, name: customer.name, email: customer.email, token };
  }

  private createJWT(payload: { id: number; name: string }): string {
    return sign(payload, env.JWT_SECRET, {
      subject: payload.id.toString(),
      expiresIn: env.JWT_EXPIRATION,
    });
  }
}
