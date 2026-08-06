import { Router } from "express";
import { db } from "@workspace/db";
import { savedOutputs } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/saved-outputs", async (req, res) => {
  try {
    const username = (req.headers["x-username"] as string) || "";
    const type = req.query.type as string | undefined;

    const rows = await db
      .select()
      .from(savedOutputs)
      .where(
        type
          ? and(eq(savedOutputs.username, username), eq(savedOutputs.type, type))
          : eq(savedOutputs.username, username),
      )
      .orderBy(desc(savedOutputs.updatedAt));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch saved outputs" });
  }
});

router.post("/saved-outputs", async (req, res) => {
  try {
    const username = (req.headers["x-username"] as string) || "";
    const { type, title, inputJson, outputJson } = req.body;

    if (!type) {
      return res.status(400).json({ error: "type is required" });
    }

    // Upsert: update existing row for same username + type, or insert new
    const existing = await db
      .select({ id: savedOutputs.id })
      .from(savedOutputs)
      .where(and(eq(savedOutputs.username, username), eq(savedOutputs.type, type)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(savedOutputs)
        .set({
          title: title ?? "",
          inputJson: inputJson ?? null,
          outputJson: outputJson ?? null,
          updatedAt: new Date(),
        })
        .where(eq(savedOutputs.id, existing[0].id));

      const [updated] = await db
        .select()
        .from(savedOutputs)
        .where(eq(savedOutputs.id, existing[0].id))
        .limit(1);

      return res.json(updated);
    }

    const [row] = await db
      .insert(savedOutputs)
      .values({
        username,
        type,
        title: title ?? "",
        inputJson: inputJson ?? null,
        outputJson: outputJson ?? null,
      })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Failed to save output" });
  }
});

router.delete("/saved-outputs/:id", async (req, res) => {
  try {
    const username = (req.headers["x-username"] as string) || "";
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    await db
      .delete(savedOutputs)
      .where(and(eq(savedOutputs.id, id), eq(savedOutputs.username, username)));

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete saved output" });
  }
});

export default router;
