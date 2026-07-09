import type { Request, Response } from "express";
import { prisma } from "../db.js";
import { createAuthorSchema } from "../schemas/author.schema.js";

export async function createAuthor(req: Request, res: Response) {
  const result = createAuthorSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json(result.error.format());
  }

  const { name, country } = result.data;

  const author = await prisma.author.create({
    data: {
      name,
      ...(country ? { country } : {}),
    },
  });

  return res.status(201).json(author);
}