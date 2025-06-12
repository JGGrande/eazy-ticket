declare namespace Express {
  export interface Request {
    customer?: {
      id: number;
      name: string;
    }
  }
}