export type CustomerPublic = {
  id: number;
  name: string;
  email: string;
};

export type CustomerWithPassword = CustomerPublic & {
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type AuthResult = CustomerPublic & {
  token: string;
};
