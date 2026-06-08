import { Router } from "express";
import { CheckoutController } from "../controllers/checkout";
import { CheckoutRepository } from "../repositories/checkout.repository";
import { CheckoutService } from "../services/checkout.service";

const checkoutRepository = new CheckoutRepository();
const checkoutService = new CheckoutService(checkoutRepository);
const checkoutController = new CheckoutController(checkoutService);

const checkoutRouter = Router();

// .bind(checkoutController) garante que, quando o Express chamar o método como função isolada,
// o "this" dentro dele continue apontando para a instância de checkoutController.
// Sem o bind, "this" seria undefined (modo estrito) e a injeção de dependência via constructor seria perdida.
checkoutRouter.post("/", checkoutController.create.bind(checkoutController));

export { checkoutRouter };