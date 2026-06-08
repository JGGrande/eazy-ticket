import { Request, Response } from "express";
import { z } from "zod";
import { CustomerService } from "../services/customer.service";
import { CustomerController } from "./customer";

function createMockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  return res;
}

describe("CustomerController", () => {
  let service: jest.Mocked<CustomerService>;
  let controller: CustomerController;
  let res: Response;

  const customer = { id: 1, name: "John Doe", email: "john@email.com" };

  beforeEach(() => {
    jest.clearAllMocks();

    service = {
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<CustomerService>;

    controller = new CustomerController(service);
    res = createMockResponse();
  });

  describe("findById", () => {
    it("should return the customer with status 200", async () => {
      const req = { params: { id: "1" } } as unknown as Request;
      service.findById.mockResolvedValue(customer);

      await controller.findById(req, res);

      expect(service.findById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(customer);
    });

    it("should reject when the id param is invalid", async () => {
      const req = { params: { id: "not-a-number" } } as unknown as Request;

      await expect(controller.findById(req, res)).rejects.toBeInstanceOf(z.ZodError);
      expect(service.findById).not.toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("should return the list of customers with status 200", async () => {
      const req = {} as Request;
      service.findAll.mockResolvedValue([customer]);

      await controller.findAll(req, res);

      expect(service.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([customer]);
    });
  });

  describe("update", () => {
    const validBody = { name: "John Updated", email: "john.updated@email.com", password: "123456" };

    it("should update the customer and return it with status 200", async () => {
      const req = { params: { id: "1" }, body: validBody } as unknown as Request;
      service.update.mockResolvedValue(customer);

      await controller.update(req, res);

      expect(service.update).toHaveBeenCalledWith(1, validBody);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(customer);
    });

    it("should reject when the body is invalid", async () => {
      const req = { params: { id: "1" }, body: { name: "Jo", email: "invalid-email" } } as unknown as Request;

      await expect(controller.update(req, res)).rejects.toBeInstanceOf(z.ZodError);
      expect(service.update).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete the customer and return status 204", async () => {
      const req = { params: { id: "1" } } as unknown as Request;
      service.delete.mockResolvedValue(undefined);

      await controller.delete(req, res);

      expect(service.delete).toHaveBeenCalledWith(1);
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });
  });
});
