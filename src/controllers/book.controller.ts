import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import {
  bookParamsSchema,
  createBookSchema,
  getBooksQuerySchema,
  updateBookSchema,
} from "../schemas/book.schema.js";
import { ReadingStatus, type Prisma } from "../generated/prisma/client.js";

const normalizeTags = (tags: string[]) =>
  Array.from(new Set(tags.map((tag) => tag.toLowerCase().trim())));

export async function createBook(
  req: Request,
  res: Response,
  next: NextFunction
) {
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
    where: { id: authorId },
  });

  if (!authorExists) {
    return res.status(404).json({
      message: "El autor especificado no existe",
    });
  }

  try {
    const uniqueTags = normalizeTags(tags);

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
    next(error);
  }
}

export async function getBooks(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const result = getBooksQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(422).json(result.error.format());
  }

  const {
    status,
    genre,
    authorId,
    authorName,
    tag,
    minRating,
    page,
    limit,
    sortBy,
    order,
  } = result.data;

  const where: Prisma.BookWhereInput = {
    deletedAt: null,
  };

  if (status) {
    where.status = status;
  }

  if (genre) {
    where.genre = genre;
  }

  if (authorId) {
    where.authorId = authorId;
  }

  if (authorName) {
    where.author = {
      name: {
        contains: authorName,
        mode: "insensitive",
      },
    };
  }

  if (tag) {
    where.tags = {
      some: {
        name: tag.toLowerCase().trim(),
      },
    };
  }

  if (minRating !== undefined) {
    where.rating = {
      gte: minRating,
    };
  }

  const orderBy: Prisma.BookOrderByWithRelationInput = {
    [sortBy]: order,
  };

  try {
    const [total, books] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          author: true,
          tags: true,
        },
      }),
    ]);

    return res.status(200).json({
      data: books,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getBookById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const result = bookParamsSchema.safeParse(req.params);

  if (!result.success) {
    return res.status(422).json(result.error.format());
  }

  try {
    const book = await prisma.book.findFirst({
      where: {
        id: result.data.id,
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
    next(error);
  }
}

export async function updateBook(
  req: Request,
  res: Response,
  next: NextFunction
) {
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

    const finalStatus = status ?? currentBook.status;
    const finalRating = rating !== undefined ? rating : currentBook.rating;

    if (
      finalRating !== null &&
      finalRating !== undefined &&
      finalStatus !== ReadingStatus.read
    ) {
      return res.status(409).json({
        message:
          "La calificación solo es válida si el estado de lectura es 'read'",
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

    const updateData: Prisma.BookUncheckedUpdateInput = {};

    if (title !== undefined) updateData.title = title;
    if (authorId !== undefined) updateData.authorId = authorId;
    if (genre !== undefined) updateData.genre = genre;
    if (status !== undefined) updateData.status = status;
    if (rating !== undefined) updateData.rating = rating;

    if (tags !== undefined) {
      const uniqueTags = normalizeTags(tags);

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
    next(error);
  }
}

export async function deleteBook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const result = bookParamsSchema.safeParse(req.params);

  if (!result.success) {
    return res.status(422).json(result.error.format());
  }

  try {
    const currentBook = await prisma.book.findFirst({
      where: {
        id: result.data.id,
        deletedAt: null,
      },
    });

    if (!currentBook) {
      return res.status(404).json({
        message: "El libro especificado no existe o ya fue eliminado",
      });
    }

    await prisma.book.update({
      where: { id: result.data.id },
      data: { deletedAt: new Date() },
    });

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getBookHistory(
  req: Request,
  res: Response,
  next: NextFunction
) {
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
      where: { bookId: id },
      orderBy: { changedAt: "asc" },
    });

    return res.status(200).json(history);
  } catch (error) {
    next(error);
  }
}
