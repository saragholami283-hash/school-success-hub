import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wellnessRouter from "./wellness";
import calendarRouter from "./calendar";
import documentsRouter from "./documents";
import resourcesRouter from "./resources";
import aiRouter from "./ai";
import settingsRouter from "./settings";
import openaiCoachRouter from "./openai-coach";
import storageRouter from "./storage";
import savedOutputsRouter from "./savedOutputs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wellnessRouter);
router.use(calendarRouter);
router.use(documentsRouter);
router.use(resourcesRouter);
router.use(aiRouter);
router.use(settingsRouter);
router.use(openaiCoachRouter);
router.use(storageRouter);
router.use(savedOutputsRouter);

export default router;
