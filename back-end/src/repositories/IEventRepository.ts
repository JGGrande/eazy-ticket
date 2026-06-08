import {
  CreateEventInput,
  EventData,
  EventPhotoData,
  EventWithPhotos,
  UpdateEventInput,
} from "../types/event";

export interface IEventRepository {
  create(data: CreateEventInput): Promise<EventData>;
  findById(id: number): Promise<EventWithPhotos | null>;
  findAll(withExpired: boolean): Promise<EventWithPhotos[]>;
  update(id: number, data: UpdateEventInput): Promise<EventData | null>;
  deleteById(id: number): Promise<void>;
  countTicketsByEventId(eventId: number): Promise<number>;
  findPhotoById(imageId: number): Promise<EventPhotoData | null>;
  addPhoto(eventId: number, fileName: string, url: string): Promise<void>;
  removePhotoById(imageId: number): Promise<void>;
}
