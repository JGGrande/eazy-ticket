export type EventData = {
  id: number;
  name: string;
  description: string;
  initialDate: Date;
  finalDate: Date;
  location: string;
  maxTickets: number;
  ticketPrice: number;
};

export type EventWithPhotos = EventData & {
  photos: string[];
};

export type EventPhotoData = {
  id: number;
  eventId: number;
  fileName: string;
  url: string;
};

export type CreateEventInput = {
  name: string;
  description: string;
  location: string;
  initialDate: Date;
  finalDate: Date;
  maxTickets: number;
  ticketPrice: number;
};

export type UpdateEventInput = CreateEventInput;
