import { Router } from "express";
import { CheckoutController } from "../controllers/checkout";

const checkoutRouter = Router();
const checkoutController = new CheckoutController();

checkoutRouter.post("/", checkoutController.create);

export { checkoutRouter };