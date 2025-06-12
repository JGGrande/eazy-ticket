import { Router } from "express";
import { EventController } from "../controllers/event";
import multer from "multer";

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
  }
})
const eventRouter = Router();
const eventController = new EventController();

eventRouter.post("/", eventController.create);
eventRouter.get("/", eventController.findAll);
eventRouter.get("/:id", eventController.findById);
eventRouter.put("/:id", eventController.update);
eventRouter.delete("/:id", eventController.delete);

eventRouter.patch("/:id/images", upload.single('image'),eventController.addImage);
eventRouter.delete("/:id/images/:imageId", eventController.removeImage);

export { eventRouter };