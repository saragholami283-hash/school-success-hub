import { Router } from "express";
import { db, userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  UpdateSettingsBody,
  GetSettingsResponse,
  UpdateSettingsResponse,
} from "@workspace/api-zod";

const router = Router();

async function ensureSettings() {
  const rows = await db.select().from(userSettingsTable).limit(1);
  if (rows.length === 0) {
    const [row] = await db.insert(userSettingsTable).values({}).returning();
    return row;
  }
  return rows[0];
}

router.get("/settings", async (req, res): Promise<void> => {
  const settings = await ensureSettings();
  res.json(GetSettingsResponse.parse(settings));
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await ensureSettings();
  const [updated] = await db
    .update(userSettingsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(userSettingsTable.id, existing.id))
    .returning();
  res.json(UpdateSettingsResponse.parse(updated));
});

export default router;
