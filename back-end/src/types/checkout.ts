export type PaymentMethod = "credit_card" | "debit_card" | "pix";

export type CreateCheckoutInput = {
  customerId: number;
  eventId: number;
  ticketCount: number;
  paymentMethod: PaymentMethod;
};

export type TicketItem = {
  eventId: number;
  customerId: number;
  code: string;
};

export type CheckoutData = {
  totalPrice: number;
  paymentMethod: PaymentMethod;
  tickets: TicketItem[];
};

export type CheckoutRepositoryResult =
  | { ok: true; data: CheckoutData }
  | { ok: false; statusCode: number; message: string };
