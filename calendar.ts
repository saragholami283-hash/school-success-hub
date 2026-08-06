import { Router } from "express";
import { db, calendarEventsTable } from "@workspace/db";
import { eq, gte, lte, and } from "drizzle-orm";
import {
  CreateCalendarEventBody,
  UpdateCalendarEventBody,
  DeleteCalendarEventParams,
  ListCalendarEventsResponse,
  CreateCalendarEventResponse,
  UpdateCalendarEventResponse,
  GetUpcomingEventsResponse,
} from "@workspace/api-zod";

const router = Router();

function getUsername(req: any): string {
  return (req.headers["x-username"] as string) || "";
}

router.get("/calendar/events", async (req, res): Promise<void> => {
  const username = getUsername(req);
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  const conditions = [eq(calendarEventsTable.username, username)];
  if (startDate) conditions.push(gte(calendarEventsTable.date, startDate));
  if (endDate) conditions.push(lte(calendarEventsTable.date, endDate));

  const events = await db
    .select()
    .from(calendarEventsTable)
    .where(and(...conditions));
  res.json(ListCalendarEventsResponse.parse(events));
});

router.get("/calendar/events/upcoming", async (req, res): Promise<void> => {
  const username = getUsername(req);
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const endDate = sevenDaysLater.toISOString().split("T")[0];

  const events = await db
    .select()
    .from(calendarEventsTable)
    .where(and(
      eq(calendarEventsTable.username, username),
      gte(calendarEventsTable.date, today),
      lte(calendarEventsTable.date, endDate)
    ));

  res.json(GetUpcomingEventsResponse.parse(events));
});

router.post("/calendar/events", async (req, res): Promise<void> => {
  const username = getUsername(req);
  const parsed = CreateCalendarEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const dateStr = parsed.data.date instanceof Date
    ? parsed.data.date.toISOString().split("T")[0]
    : parsed.data.date as string;
  const [event] = await db
    .insert(calendarEventsTable)
    .values({ ...parsed.data, date: dateStr, username })
    .returning();
  res.status(201).json(CreateCalendarEventResponse.parse(event));
});

router.patch("/calendar/events/:id", async (req, res): Promise<void> => {
  const username = getUsername(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const bodyParsed = UpdateCalendarEventBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }
  const [updated] = await db
    .update(calendarEventsTable)
    .set(bodyParsed.data)
    .where(and(eq(calendarEventsTable.id, id), eq(calendarEventsTable.username, username)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(UpdateCalendarEventResponse.parse(updated));
});

router.delete("/calendar/events/:id", async (req, res): Promise<void> => {
  const username = getUsername(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  await db.delete(calendarEventsTable).where(
    and(eq(calendarEventsTable.id, id), eq(calendarEventsTable.username, username))
  );
  res.status(204).send();
});

export default router;
