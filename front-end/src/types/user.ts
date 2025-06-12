export type User = {
  id: number;
  name: string;
  email: string;
}

export type UserWithPassword = User & {
  password: string;
}

export type UserWithToken = User & {
  token: string;
}