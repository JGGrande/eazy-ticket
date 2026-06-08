import { Router } from "express";
import { CustomerController } from "../controllers/customer";
import { CustomerRepository } from "../repositories/customer.repository";
import { CustomerService } from "../services/customer.service";

const customerRepository = new CustomerRepository();
const customerService = new CustomerService(customerRepository);
const customerController = new CustomerController(customerService);

const customerRouter = Router();

// .bind(customerController) garante que, quando o Express chamar o método como função isolada,
// o "this" dentro dele continue apontando para a instância de customerController.
// Sem o bind, "this" seria undefined (modo estrito) e a injeção de dependência via constructor seria perdida.
customerRouter.get("/", customerController.findAll.bind(customerController));
customerRouter.get("/:id", customerController.findById.bind(customerController));
customerRouter.put("/:id", customerController.update.bind(customerController));
customerRouter.delete("/:id", customerController.delete.bind(customerController));

export { customerRouter };