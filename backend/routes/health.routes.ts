import { Router } from "express";

import { requireAuth } from "../middleware/auth.ts";
import { getLiveToken, test } from "../controllers/health.controller.ts";

const healthRouter = Router();

healthRouter.get("/test", test);
healthRouter.get("/live-token", requireAuth, getLiveToken);

export default healthRouter;
