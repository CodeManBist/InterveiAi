import { Router } from "express";

import { handleClerkWebhook } from "../controllers/webhook.controller.ts";

const webhookRouter = Router();

webhookRouter.post("/", handleClerkWebhook);

export default webhookRouter;
