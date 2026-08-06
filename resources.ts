import { Router } from "express";
import { db, resourcesTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import {
  ListResourcesResponse,
  ListResourceCategoriesResponse,
} from "@workspace/api-zod";

const router = Router();

router.get("/resources", async (req, res): Promise<void> => {
  const { category, search } = req.query as { category?: string; search?: string };

  let query = db.select().from(resourcesTable);
  let resources;

  if (category && search) {
    resources = await db
      .select()
      .from(resourcesTable)
      .where(
        eq(resourcesTable.category, category)
      );
    resources = resources.filter(
      (r) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase())
    );
  } else if (category) {
    resources = await db
      .select()
      .from(resourcesTable)
      .where(eq(resourcesTable.category, category));
  } else if (search) {
    resources = await db.select().from(resourcesTable);
    resources = resources.filter(
      (r) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    );
  } else {
    resources = await query;
  }

  res.json(ListResourcesResponse.parse(resources));
});

router.get("/resources/categories", async (req, res): Promise<void> => {
  const rows = await db
    .selectDistinct({ category: resourcesTable.category })
    .from(resourcesTable);
  const categories = rows.map((r) => r.category);
  res.json(ListResourceCategoriesResponse.parse(categories));
});

export default router;
