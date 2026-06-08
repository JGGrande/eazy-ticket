export type TicketWithEvent = {
  id: number;
  eventId: number;
  code: string;
  event: {
    id: number;
    name: string;
    description: string;
    initialDate: Date;
    finalDate: Date;
    location: string;
    maxTickets: number;
    ticketPrice: number;
    photos: string[];
  } | null;
};
