export type CustomerData = {
  id: number;
  name: string;
  email: string;
};

export type UpdateCustomerInput = {
  name: string;
  email: string;
  password?: string;
};
