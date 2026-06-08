import "express-async-errors";
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { AppError } from "../errors/app-error";

export async function ErrorHandlerMiddleware(
  error: Error,
  request: Request,
  response: Response,
  next: NextFunction
): Promise<Response> {
  if (error instanceof ZodError) {
    return response.status(400).json({
      status: "error",
      message: "Validation error",
      errors: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    });
  }

  if (error instanceof AppError) {
    return response.status(error.statusCode).json({ error: error.message });
  }

  if (env.NODE_ENV !== "production") {
    console.error("Error occurred:", error);
  }else {
    logger.error("Error occurred", { message: error.message, stack: error.stack });
  }

  return response.status(500).json({
    status: "error",
    message: "Internal server error",
  });
}