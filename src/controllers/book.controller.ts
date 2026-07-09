import type { Request, Response } from "express";
import { prisma } from "../db.js";
import { createBookSchema } from "../schemas/book.schema.js";
import { ReadingStatus } from "../generated/prisma/client.js";

export async function createBook(req: Request, res: Response) {
  const result = createBookSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(422).json(result.error.format());
  }

  const { title, authorId, genre, status, rating, tags } = result.data;

  if (rating !== undefined && status !== ReadingStatus.read) {
    return res.status(409).json({
      message:
        "La calificación (rating) solo es válida si el estado de lectura es 'read'",
    });
  }

  const authorExists = await prisma.author.findUnique({
    where: {
      id: authorId,
    },
  });

  if (!authorExists) {
    return res.status(404).json({
      message: "El autor especificado no existe",
    });
  }

  try {
    const uniqueTags = Array.from(
      new Set(tags.map((tag) => tag.toLowerCase().trim()))
    );

    const book = await prisma.$transaction(async (tx) => {
      const newBook = await tx.book.create({
        data: {
          title,
          authorId,
          genre,
          status,
          rating: rating ?? null,
          tags: {
            connectOrCreate: uniqueTags.map((tagName) => ({
              where: {
                name: tagName,
              },
              create: {
                name: tagName,
              },
            })),
          },
        },
        include: {
          author: true,
          tags: true,
        },
      });

      await tx.statusHistory.create({
        data: {
          bookId: newBook.id,
          fromStatus: null,
          toStatus: status,
        },
      });

      return newBook;
    });

    return res.status(201).json(book);
  } catch (error) {
    console.error("Error al crear libro:", error);

    return res.status(500).json({
      message: "Ocurrió un error inesperado al intentar registrar el libro",
    });
  }
}

export async function getBooks(_req: Request, res: Response) {
  try {
    const books = await prisma.book.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        author: true,
        tags: true,
        history: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(books);
  } catch (error) {
    console.error("Error al obtener libros:", error);

    return res.status(500).json({
      message: "Ocurrió un error al obtener los libros",
    });
  }
}