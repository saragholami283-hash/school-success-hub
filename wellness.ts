import { Router } from "express";
import { db, wellnessCheckinsTable } from "@workspace/db";
import { desc, gte, eq, and } from "drizzle-orm";
import {
  CreateWellnessCheckinBody,
  ListWellnessCheckinsResponse,
  CreateWellnessCheckinResponse,
  GetWellnessTrendsResponse,
} from "@workspace/api-zod";

const router = Router();

function getUsername(req: any): string {
  return (req.headers["x-username"] as string) || "";
}

router.get("/wellness/checkins", async (req, res): Promise<void> => {
  const username = getUsername(req);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
  const checkins = await db
    .select()
    .from(wellnessCheckinsTable)
    .where(eq(wellnessCheckinsTable.username, username))
    .orderBy(desc(wellnessCheckinsTable.createdAt))
    .limit(limit);
  res.json(ListWellnessCheckinsResponse.parse(checkins));
});

router.post("/wellness/checkins", async (req, res): Promise<void> => {
  const username = getUsername(req);
  const parsed = CreateWellnessCheckinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const dateStr = parsed.data.date instanceof Date
    ? parsed.data.date.toISOString().split("T")[0]
    : parsed.data.date as string;
  const [checkin] = await db
    .insert(wellnessCheckinsTable)
    .values({ ...parsed.data, date: dateStr, username })
    .returning();
  res.status(201).json(CreateWellnessCheckinResponse.parse(checkin));
});

router.get("/wellness/trends", async (req, res): Promise<void> => {
  const username = getUsername(req);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

  const rows = await db
    .select()
    .from(wellnessCheckinsTable)
    .where(and(
      eq(wellnessCheckinsTable.username, username),
      gte(wellnessCheckinsTable.date, dateStr)
    ))
    .orderBy(wellnessCheckinsTable.date);

  const dailyData = rows.map((r) => ({
    date: r.date,
    painLevel: r.painLevel,
    fatigueLevel: r.fatigueLevel,
    moodLevel: r.moodLevel,
    energyLevel: r.energyLevel,
  }));

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const averages = {
    painLevel: avg(rows.map((r) => r.painLevel)),
    fatigueLevel: avg(rows.map((r) => r.fatigueLevel)),
    moodLevel: avg(rows.map((r) => r.moodLevel)),
    energyLevel: avg(rows.map((r) => r.energyLevel)),
  };

  res.json(GetWellnessTrendsResponse.parse({ dailyData, averages }));
});

export default router;
