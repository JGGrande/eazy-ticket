import { createClient } from "redis";
import { env } from "../config/env";

const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient
  .connect()
  .then(() => console.info("Connected to Redis"))
  .catch((err) => console.error("Redis Client Error", err));

export { redisClient };