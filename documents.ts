import { Router } from "express";
import { db, documentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateDocumentBody,
  ListDocumentsResponse,
  CreateDocumentResponse,
  ListDocumentFoldersResponse,
} from "@workspace/api-zod";

const router = Router();

function getUsername(req: any): string {
  return (req.headers["x-username"] as string) || "";
}

router.get("/documents", async (req, res): Promise<void> => {
  const username = getUsername(req);
  const { folder } = req.query as { folder?: string };
  const conditions = [eq(documentsTable.username, username)];
  if (folder) conditions.push(eq(documentsTable.folder, folder));
  const docs = await db.select().from(documentsTable).where(and(...conditions));
  res.json(ListDocumentsResponse.parse(docs));
});

router.get("/documents/folders", async (req, res): Promise<void> => {
  const username = getUsername(req);
  const rows = await db
    .selectDistinct({ folder: documentsTable.folder })
    .from(documentsTable)
    .where(eq(documentsTable.username, username));
  const folders = rows.map((r) => r.folder);
  res.json(ListDocumentFoldersResponse.parse(folders));
});

router.post("/documents", async (req, res): Promise<void> => {
  const username = getUsername(req);
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [doc] = await db.insert(documentsTable).values({ ...parsed.data, username }).returning();
  res.status(201).json(CreateDocumentResponse.parse(doc));
});

router.delete("/documents/:id", async (req, res): Promise<void> => {
  const username = getUsername(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  await db.delete(documentsTable).where(
    and(eq(documentsTable.id, id), eq(documentsTable.username, username))
  );
  res.status(204).send();
});

export default router;
