import { Router } from "express";
import multer from "multer";
import { EventController } from "../controllers/event";
import { EventRepository } from "../repositories/event.repository";
import { EventService } from "../services/event.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Invalid file type. Only JPEG, PNG, and GIF are allowed."));
    }

    cb(null, true);
  },
});

const eventRepository = new EventRepository();
const eventService = new EventService(eventRepository);
const eventController = new EventController(eventService);

const eventRouter = Router();

// .bind(eventController) garante que, quando o Express chamar o método como função isolada,
// o "this" dentro dele continue apontando para a instância de eventController.
// Sem o bind, "this" seria undefined (modo estrito) e a injeção de dependência via constructor seria perdida.
eventRouter.post("/", eventController.create.bind(eventController));
eventRouter.get("/", eventController.findAll.bind(eventController));
eventRouter.get("/:id", eventController.findById.bind(eventController));
eventRouter.put("/:id", eventController.update.bind(eventController));
eventRouter.delete("/:id", eventController.delete.bind(eventController));

eventRouter.patch("/:id/images", upload.single("image"), eventController.addImage.bind(eventController));
eventRouter.delete("/:id/images/:imageId", eventController.removeImage.bind(eventController));

export { eventRouter };