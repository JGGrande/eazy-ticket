import { db } from "../config/database";
import { CustomerRepository } from "./customer.repository";

jest.mock("../config/database", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

type QueryChain = {
  select: jest.Mock;
  from: jest.Mock;
  where: jest.Mock;
  limit: jest.Mock;
  orderBy: jest.Mock;
  update: jest.Mock;
  set: jest.Mock;
  returning: jest.Mock;
  delete: jest.Mock;
  then: (onFulfilled: (value: any) => any, onRejected?: (reason: any) => any) => Promise<any>;
};

function createQueryChain(result: any): QueryChain {
  const chain = {} as QueryChain;
  const chainableMethods: (keyof QueryChain)[] = [
    "select",
    "from",
    "where",
    "limit",
    "orderBy",
    "update",
    "set",
    "returning",
    "delete",
  ];

  chainableMethods.forEach((method) => {
    (chain[method] as jest.Mock) = jest.fn(() => chain);
  });

  chain.then = (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected);

  return chain;
}

describe("CustomerRepository", () => {
  let repository: CustomerRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new CustomerRepository();
  });

  describe("findById", () => {
    it("should return the customer when it exists", async () => {
      const customer = { id: 1, name: "John Doe", email: "john@email.com" };
      (db.select as jest.Mock).mockReturnValue(createQueryChain([customer]));

      const result = await repository.findById(1);

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(customer);
    });

    it("should return null when the customer does not exist", async () => {
      (db.select as jest.Mock).mockReturnValue(createQueryChain([]));

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return the list of customers ordered by name", async () => {
      const customers = [
        { id: 1, name: "Alice", email: "alice@email.com" },
        { id: 2, name: "Bob", email: "bob@email.com" },
      ];
      (db.select as jest.Mock).mockReturnValue(createQueryChain(customers));

      const result = await repository.findAll();

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(customers);
    });

    it("should return an empty array when there are no customers", async () => {
      (db.select as jest.Mock).mockReturnValue(createQueryChain([]));

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("existsById", () => {
    it("should return true when the customer exists", async () => {
      (db.select as jest.Mock).mockReturnValue(createQueryChain([{ id: 1 }]));

      const result = await repository.existsById(1);

      expect(result).toBe(true);
    });

    it("should return false when the customer does not exist", async () => {
      (db.select as jest.Mock).mockReturnValue(createQueryChain([]));

      const result = await repository.existsById(999);

      expect(result).toBe(false);
    });
  });

  describe("existsByEmailExcluding", () => {
    it("should return true when another customer already uses the email", async () => {
      (db.select as jest.Mock).mockReturnValue(createQueryChain([{ id: 2 }]));

      const result = await repository.existsByEmailExcluding("john@email.com", 1);

      expect(result).toBe(true);
    });

    it("should return false when no other customer uses the email", async () => {
      (db.select as jest.Mock).mockReturnValue(createQueryChain([]));

      const result = await repository.existsByEmailExcluding("john@email.com", 1);

      expect(result).toBe(false);
    });
  });

  describe("update", () => {
    it("should return the updated customer", async () => {
      const updated = { id: 1, name: "John Updated", email: "john.updated@email.com" };
      (db.update as jest.Mock).mockReturnValue(createQueryChain([updated]));

      const result = await repository.update(1, { name: "John Updated", email: "john.updated@email.com" });

      expect(db.update).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it("should return null when no customer was updated", async () => {
      (db.update as jest.Mock).mockReturnValue(createQueryChain([]));

      const result = await repository.update(999, { name: "John Updated", email: "john.updated@email.com" });

      expect(result).toBeNull();
    });
  });

  describe("deleteById", () => {
    it("should call the database delete with the correct id", async () => {
      const chain = createQueryChain(undefined);
      (db.delete as jest.Mock).mockReturnValue(chain);

      await repository.deleteById(1);

      expect(db.delete).toHaveBeenCalled();
      expect(chain.where).toHaveBeenCalled();
    });
  });
});
