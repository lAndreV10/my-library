import type { Request, Response } from "express";
import { prisma } from "../db.js";
import {
  createBookSchema,
  updateBookSchema,
  bookParamsSchema,
} from "../schemas/book.schema.js";
import { BookGenre, ReadingStatus } from "../generated/prisma/client.js";

export async function createBook(req: Request, res: Response) {
  const result = createBookSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(422).json(result.error.format());
  }

  const { title, authorId, genre, status, rating, tags } = result.data;

  // Regla de negocio: rating solo es válido si status = 'read'
  if (rating !== undefined && status !== ReadingStatus.read) {
    return res.status(409).json({
      message: "La calificación (rating) solo es válida si el estado de lectura es 'read'",
    });
  }

  // Verificar si el autor existe
  const authorExists = await prisma.author.findUnique({
    where: { id: authorId },
  });

  if (!authorExists) {
    return res.status(404).json({
      message: "El autor especificado no existe",
    });
  }

  try {
    // Normalizar tags: eliminar espacios extras, duplicados y convertir a minúsculas
    const uniqueTags = Array.from(
      new Set(tags.map((tag) => tag.toLowerCase().trim()))
    );

    const book = await prisma.$transaction(async (tx) => {
      // 1. Crear el libro y conectar/crear los tags correspondientes
      const newBook = await tx.book.create({
        data: {
          title,
          authorId,
          genre,
          status,
          rating: rating ?? null,
          tags: {
            connectOrCreate: uniqueTags.map((tagName) => ({
              where: { name: tagName },
              create: { name: tagName },
            })),
          },
        },
        include: {
          author: true,
          tags: true,
        },
      });

      // 2. Crear la primera entrada en el historial de estados
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

export async function getBookById(req: Request, res: Response) {
  const result = bookParamsSchema.safeParse(req.params);

  if (!result.success) {
    return res.status(422).json(result.error.format());
  }

  const { id } = result.data;

  try {
    const book = await prisma.book.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        author: true,
        tags: true,
      },
    });

    if (!book) {
      return res.status(404).json({
        message: "El libro no existe o fue eliminado",
      });
    }

    return res.status(200).json(book);
  } catch (error) {
    console.error("Error al obtener detalle del libro:", error);
    return res.status(500).json({
      message: "Ocurrió un error inesperado al buscar el libro",
    });
  }
}

export async function updateBook(req: Request, res: Response) {
  const paramsResult = bookParamsSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(422).json(paramsResult.error.format());
  }

  const bodyResult = updateBookSchema.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(422).json(bodyResult.error.format());
  }

  const { id } = paramsResult.data;
  const { title, authorId, genre, status, rating, tags } = bodyResult.data;

  try {
    const currentBook = await prisma.book.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!currentBook) {
      return res.status(404).json({
        message: "El libro especificado no existe o fue eliminado",
      });
    }

    const finalStatus = status || currentBook.status;
    const finalRating = rating !== undefined ? rating : currentBook.rating;

    if (finalRating !== null && finalRating !== undefined && finalStatus !== ReadingStatus.read) {
      return res.status(409).json({
        message: "La calificación (rating) solo es válida si el estado de lectura es 'read'",
      });
    }

    if (authorId) {
      const authorExists = await prisma.author.findUnique({
        where: { id: authorId },
      });
      if (!authorExists) {
        return res.status(404).json({
          message: "El nuevo autor especificado no existe",
        });
      }
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (authorId !== undefined) updateData.authorId = authorId;
    if (genre !== undefined) updateData.genre = genre;
    if (status !== undefined) updateData.status = status;
    if (rating !== undefined) updateData.rating = rating ?? null;

    if (tags !== undefined) {
      const uniqueTags = Array.from(
        new Set(tags.map((tag) => tag.toLowerCase().trim()))
      );
      updateData.tags = {
        set: [],
        connectOrCreate: uniqueTags.map((tagName) => ({
          where: { name: tagName },
          create: { name: tagName },
        })),
      };
    }

    const updatedBook = await prisma.$transaction(async (tx) => {
      const book = await tx.book.update({
        where: { id },
        data: updateData,
        include: {
          author: true,
          tags: true,
        },
      });

      if (status !== undefined && status !== currentBook.status) {
        await tx.statusHistory.create({
          data: {
            bookId: id,
            fromStatus: currentBook.status,
            toStatus: status,
          },
        });
      }

      return book;
    });

    return res.status(200).json(updatedBook);
  } catch (error) {
    console.error("Error al actualizar el libro:", error);
    return res.status(500).json({
      message: "Ocurrió un error inesperado al actualizar el libro",
    });
  }
}

export async function deleteBook(req: Request, res: Response) {
  const result = bookParamsSchema.safeParse(req.params);

  if (!result.success) {
    return res.status(422).json(result.error.format());
  }

  const { id } = result.data;

  try {
    const currentBook = await prisma.book.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!currentBook) {
      return res.status(404).json({
        message: "El libro especificado no existe o ya fue eliminado",
      });
    }

    await prisma.book.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar libro (soft delete):", error);
    return res.status(500).json({
      message: "Ocurrió un error inesperado al intentar eliminar el libro",
    });
  }
}

export async function getBookHistory(req: Request, res: Response) {
  const result = bookParamsSchema.safeParse(req.params);

  if (!result.success) {
    return res.status(422).json(result.error.format());
  }

  const { id } = result.data;

  try {
    const currentBook = await prisma.book.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!currentBook) {
      return res.status(404).json({
        message: "El libro especificado no existe o fue eliminado",
      });
    }

    const history = await prisma.statusHistory.findMany({
      where: {
        bookId: id,
      },
      orderBy: {
        changedAt: "asc",
      },
    });

    return res.status(200).json(history);
  } catch (error) {
    console.error("Error al obtener historial del libro:", error);
    return res.status(500).json({
      message: "Ocurrió un error inesperado al buscar el historial del libro",
    });
  }
}