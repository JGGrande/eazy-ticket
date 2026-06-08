import { Router } from "express";
import { AuthController } from "../controllers/auth";
import { AuthRepository } from "../repositories/auth.repository";
import { AuthService } from "../services/auth.service";

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

const authRouter = Router();

// .bind(authController) garante que, quando o Express chamar o método como função isolada,
// o "this" dentro dele continue apontando para a instância de authController.
// Sem o bind, "this" seria undefined (modo estrito) e a injeção de dependência via constructor seria perdida.
authRouter.post("/customer/login", authController.customerLogin.bind(authController));
authRouter.post("/customer/register", authController.customerRegister.bind(authController));

export { authRouter };