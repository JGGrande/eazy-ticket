import { hash } from "bcryptjs";
import { AppError } from "../errors/app-error";
import { ICustomerRepository } from "../repositories/ICustomerRepository";
import { CustomerService } from "./customer.service";

jest.mock("bcryptjs");
jest.mock("../config/env", () => ({
  env: { PASSWORD_SALT_ROUNDS: 10 },
}));

describe("CustomerService", () => {
  let repository: jest.Mocked<ICustomerRepository>;
  let service: CustomerService;

  const customer = { id: 1, name: "John Doe", email: "john@email.com" };

  beforeEach(() => {
    jest.clearAllMocks();

    repository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      existsById: jest.fn(),
      existsByEmailExcluding: jest.fn(),
      update: jest.fn(),
      deleteById: jest.fn(),
    };

    service = new CustomerService(repository);
  });

  describe("findById", () => {
    it("should return the customer when it exists", async () => {
      repository.findById.mockResolvedValue(customer);

      const result = await service.findById(1);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(customer);
    });

    it("should throw a 404 AppError when the customer does not exist", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toEqual(new AppError(404, "Customer not found"));
    });
  });

  describe("findAll", () => {
    it("should return all customers", async () => {
      repository.findAll.mockResolvedValue([customer]);

      const result = await service.findAll();

      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual([customer]);
    });
  });

  describe("update", () => {
    const updateData = { name: "John Updated", email: "john.updated@email.com", password: "123456" };

    it("should throw a 404 AppError when the customer does not exist", async () => {
      repository.existsById.mockResolvedValue(false);

      await expect(service.update(1, updateData)).rejects.toEqual(new AppError(404, "Customer not found"));
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("should throw a 409 AppError when the email already belongs to another customer", async () => {
      repository.existsById.mockResolvedValue(true);
      repository.existsByEmailExcluding.mockResolvedValue(true);

      await expect(service.update(1, updateData)).rejects.toEqual(
        new AppError(409, "Email already exists for another customer"),
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("should hash the password before persisting it when a new password is provided", async () => {
      repository.existsById.mockResolvedValue(true);
      repository.existsByEmailExcluding.mockResolvedValue(false);
      (hash as jest.Mock).mockResolvedValue("hashed-password");
      repository.update.mockResolvedValue(customer);

      await service.update(1, updateData);

      expect(hash).toHaveBeenCalledWith(updateData.password, 10);
      expect(repository.update).toHaveBeenCalledWith(1, { ...updateData, password: "hashed-password" });
    });

    it("should not hash anything when no password is provided", async () => {
      const dataWithoutPassword = { name: "John Updated", email: "john.updated@email.com" };
      repository.existsById.mockResolvedValue(true);
      repository.existsByEmailExcluding.mockResolvedValue(false);
      repository.update.mockResolvedValue(customer);

      await service.update(1, dataWithoutPassword);

      expect(hash).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(1, dataWithoutPassword);
    });

    it("should throw a 500 AppError when the repository fails to update the customer", async () => {
      repository.existsById.mockResolvedValue(true);
      repository.existsByEmailExcluding.mockResolvedValue(false);
      (hash as jest.Mock).mockResolvedValue("hashed-password");
      repository.update.mockResolvedValue(null);

      await expect(service.update(1, updateData)).rejects.toEqual(new AppError(500, "Failed to update customer"));
    });

    it("should return the updated customer on success", async () => {
      repository.existsById.mockResolvedValue(true);
      repository.existsByEmailExcluding.mockResolvedValue(false);
      (hash as jest.Mock).mockResolvedValue("hashed-password");
      repository.update.mockResolvedValue(customer);

      const result = await service.update(1, updateData);

      expect(result).toEqual(customer);
    });
  });

  describe("delete", () => {
    it("should throw a 404 AppError when the customer does not exist", async () => {
      repository.existsById.mockResolvedValue(false);

      await expect(service.delete(999)).rejects.toEqual(new AppError(404, "Customer not found"));
      expect(repository.deleteById).not.toHaveBeenCalled();
    });

    it("should delete the customer when it exists", async () => {
      repository.existsById.mockResolvedValue(true);

      await service.delete(1);

      expect(repository.deleteById).toHaveBeenCalledWith(1);
    });
  });
});
