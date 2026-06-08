import { logger } from "../config/logger";
import { AppError } from "../errors/app-error";
import { IEventRepository } from "../repositories/IEventRepository";
import {
  CreateEventInput,
  EventData,
  EventPhotoData,
  EventWithPhotos,
  UpdateEventInput,
} from "../types/event";
import { DateUtils } from "../utils/date";
import { FileUtils } from "../utils/file";

export class EventService {
  constructor(private readonly eventRepository: IEventRepository) {}

  async create(data: CreateEventInput): Promise<EventData> {
    if (DateUtils.isPast(data.initialDate)) {
      throw new AppError(400, "Initial date cannot be in the past");
    }

    if (DateUtils.isBefore(data.finalDate, data.initialDate)) {
      throw new AppError(400, "Final date must be after initial date");
    }

    const event = await this.eventRepository.create(data);

    logger.info("Event created", { eventId: event.id, name: event.name });
    return event;
  }

  async findById(id: number): Promise<EventWithPhotos> {
    const event = await this.eventRepository.findById(id);

    if (!event) {
      throw new AppError(404, "Event not found");
    }

    return event;
  }

  async findAll(withExpired: boolean): Promise<EventWithPhotos[]> {
    return this.eventRepository.findAll(withExpired);
  }

  async update(id: number, data: UpdateEventInput): Promise<EventData> {
    if (DateUtils.isPast(data.finalDate)) {
      throw new AppError(400, "Event cannot be updated because it has already finished");
    }

    if (DateUtils.isPast(data.initialDate)) {
      throw new AppError(400, "Initial date cannot be in the past");
    }

    if (DateUtils.isBefore(data.finalDate, data.initialDate)) {
      throw new AppError(400, "Final date must be after initial date");
    }

    const existingEvent = await this.eventRepository.findById(id);

    if (!existingEvent) {
      throw new AppError(404, "Event not found");
    }

    const totalTickets = await this.eventRepository.countTicketsByEventId(id);

    if (data.maxTickets < totalTickets) {
      throw new AppError(400, "Cannot update event because the new max tickets is less than the total tickets sold");
    }

    const updated = await this.eventRepository.update(id, data);

    if (!updated) {
      throw new AppError(500, "Failed to update event");
    }

    logger.info("Event updated", { eventId: updated.id, name: updated.name });
    return updated;
  }

  async delete(id: number): Promise<void> {
    const existingEvent = await this.eventRepository.findById(id);

    if (!existingEvent) {
      throw new AppError(404, "Event not found");
    }

    if (DateUtils.isPast(existingEvent.finalDate)) {
      throw new AppError(400, "Event cannot be deleted because it has already finished");
    }

    const totalTickets = await this.eventRepository.countTicketsByEventId(id);

    if (totalTickets > 0) {
      throw new AppError(400, "Cannot delete event because it has tickets sold");
    }

    await this.eventRepository.deleteById(id);
    logger.info("Event deleted", { eventId: id });
  }

  async addImage(eventId: number, file: Express.Multer.File): Promise<void> {
    const fileName = FileUtils.getFileName(file);
    const filePath = FileUtils.getFilePath(fileName);
    const fileUrl = FileUtils.getFileUrl(filePath);

    await FileUtils.save(filePath, file.buffer);
    await this.eventRepository.addPhoto(eventId, fileName, fileUrl);

    logger.info("Image added to event", { eventId, fileName });
  }

  async removeImage(imageId: number): Promise<EventPhotoData> {
    const photo = await this.eventRepository.findPhotoById(imageId);

    if (!photo) {
      throw new AppError(404, "Event photo not found");
    }

    await FileUtils.delete(photo.url);
    await this.eventRepository.removePhotoById(imageId);

    logger.info("Image removed from event", { imageId, eventId: photo.eventId });
    return photo;
  }
}
