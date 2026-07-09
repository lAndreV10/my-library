import type { Request, Response } from "express";
import { prisma } from "../db.js";
import {
  createAuthorSchema,
  getAuthorsQuerySchema,
  authorParamsSchema,
} from "../schemas/author.schema.js";

export async function createAuthor(req: Request, res: Response) {
  const result = createAuthorSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(422).json(result.error.format());
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

export async function getAuthors(req: Request, res: Response) {
  const result = getAuthorsQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(422).json(result.error.format());
  }

  const { name, page, limit } = result.data;

  const where = name
    ? { name: { contains: name, mode: "insensitive" as const } }
    : {};

  const [total, authors] = await Promise.all([
    prisma.author.count({ where }),
    prisma.author.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return res.status(200).json({
    data: authors,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  });
}

export async function getAuthorById(req: Request, res: Response) {
  const result = authorParamsSchema.safeParse(req.params);

  if (!result.success) {
    return res.status(422).json(result.error.format());
  }

  const { id } = result.data;

  const author = await prisma.author.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          books: {
            where: { deletedAt: null },
          },
        },
      },
    },
  });

  if (!author) {
    return res.status(404).json({ message: "Autor no encontrado" });
  }

  return res.status(200).json(author);
}