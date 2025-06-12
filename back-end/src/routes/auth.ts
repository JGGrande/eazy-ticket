import { Router } from "express";
import { AuthController } from "../controllers/auth";

const authRouter = Router();
const authController = new AuthController();

authRouter.post("/customer/login", authController.customerLogin);
authRouter.post("/customer/register", authController.customerRegister);

export { authRouter };