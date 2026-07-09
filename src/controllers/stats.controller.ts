import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { ReadingStatus } from "../generated/prisma/client.js";

export async function getStats(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const [
      totalBooks,
      statusGroups,
      genreGroups,
      ratingAggregate,
      topBook,
      readBooksByAuthor,
      tagsWithCounts,
    ] = await Promise.all([
      prisma.book.count({
        where: { deletedAt: null },
      }),

      prisma.book.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: {
          _all: true,
        },
      }),

      prisma.book.groupBy({
        by: ["genre"],
        where: { deletedAt: null },
        _count: {
          _all: true,
        },
      }),

      prisma.book.aggregate({
        where: {
          deletedAt: null,
          status: ReadingStatus.read,
          rating: { not: null },
        },
        _avg: {
          rating: true,
        },
      }),
      prisma.book.findFirst({
        where: {
          deletedAt: null,
          rating: { not: null },
        },
        orderBy: {
          rating: "desc",
        },
        select: {
          id: true,
          title: true,
          rating: true,
        },
      }),

      prisma.book.groupBy({
        by: ["authorId"],
        where: {
          deletedAt: null,
          status: ReadingStatus.read,
        },
        _count: {
          _all: true,
        },
        orderBy: {
          _count: {
            authorId: "desc",
          },
        },
        take: 1,
      }),

      prisma.tag.findMany({
        select: {
          name: true,
          _count: {
            select: {
              books: {
                where: { deletedAt: null },
              },
            },
          },
        },
      }),
    ]);

    const byStatus = {
      "to-read": 0,
      "reading": 0,
      "read": 0,
    };
    statusGroups.forEach((group) => {
      if (group.status === "to_read") {
        byStatus["to-read"] = group._count._all;
      } else if (group.status === "reading") {
        byStatus["reading"] = group._count._all;
      } else if (group.status === "read") {
        byStatus["read"] = group._count._all;
      }
    });

    const byGenre: Record<string, number> = {};
    genreGroups.forEach((group) => {
      byGenre[group.genre] = group._count._all;
    });

    const averageRating = ratingAggregate._avg.rating !== null
      ? parseFloat(ratingAggregate._avg.rating.toFixed(1))
      : 0;

    let mostReadAuthor = null;
    if (readBooksByAuthor.length > 0 && readBooksByAuthor[0]) {
      const topAuthorId = readBooksByAuthor[0].authorId;
      const count = readBooksByAuthor[0]._count._all;

      const authorInfo = await prisma.author.findUnique({
        where: { id: topAuthorId },
        select: { id: true, name: true },
      });

      if (authorInfo) {
        mostReadAuthor = {
          id: authorInfo.id,
          name: authorInfo.name,
          readCount: count,
        };
      }
    }
    const topTags = tagsWithCounts
      .map((tag) => ({
        name: tag.name,
        count: tag._count.books,
      }))
      .filter((tag) => tag.count > 0)
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      totalBooks,
      byStatus,
      byGenre,
      averageRating,
      topRatedBook: topBook || null,
      mostReadAuthor,
      topTags,
    });
  } catch (error) {
    next(error);
  }
}
