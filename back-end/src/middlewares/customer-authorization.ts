import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { env } from "../config/env";

type CustomerTokenPayload = {
  id: number;
  name: string;
}

export async function CustomerAuthorizationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Authorization header is missing"
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token is missing" });
  }

  try {
    const decoded = verify(token, env.JWT_SECRET);

    const customerPayload = decoded as CustomerTokenPayload;

    req.customer = {
      id: customerPayload.id,
      name: customerPayload.name,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}