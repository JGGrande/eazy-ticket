import { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "../services/auth.service";

const loginSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .max(100, "Email must be at most 100 characters long"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(100, "Password must be at most 100 characters long"),
});

const registerSchema = z.object({
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

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  public async customerLogin(req: Request, res: Response): Promise<Response> {
    const body = loginSchema.parse(req.body);
    const result = await this.authService.login(body);
    return res.status(200).json(result);
  }

  public async customerRegister(req: Request, res: Response): Promise<Response> {
    const body = registerSchema.parse(req.body);
    const result = await this.authService.register(body);
    return res.status(201).json(result);
  }
}