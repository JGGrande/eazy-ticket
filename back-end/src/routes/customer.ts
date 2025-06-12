import { Router } from "express";
import { CustomerController } from "../controllers/customer";
import { CustomerAuthorizationMiddleware } from "../middlewares/customer-authorization";

const customerRouter = Router();
const customerController = new CustomerController();

customerRouter.get("/", customerController.findAll);
customerRouter.get("/:id", customerController.findById);
customerRouter.put("/:id", customerController.update);
customerRouter.delete("/:id", customerController.delete);

export { customerRouter };