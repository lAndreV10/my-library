import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  BookGenre,
  PrismaClient,
  ReadingStatus,
} from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL no está configurada");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const authorIds = {
  tolkien: "8c4f1f90-8c2a-4a17-85d1-b9e58a87c001",
  asimov: "8c4f1f90-8c2a-4a17-85d1-b9e58a87c002",
  shelley: "8c4f1f90-8c2a-4a17-85d1-b9e58a87c003",
};

const bookIds = {
  hobbit: "9d7e3d92-f82a-4b3a-a138-e8a392d1b001",
  foundation: "9d7e3d92-f82a-4b3a-a138-e8a392d1b002",
  frankenstein: "9d7e3d92-f82a-4b3a-a138-e8a392d1b003",
  silmarillion: "9d7e3d92-f82a-4b3a-a138-e8a392d1b004",
};

const authors = [
  {
    id: authorIds.tolkien,
    name: "J. R. R. Tolkien",
    country: "Reino Unido",
  },
  {
    id: authorIds.asimov,
    name: "Isaac Asimov",
    country: "Rusia",
  },
  {
    id: authorIds.shelley,
    name: "Mary Shelley",
    country: "Reino Unido",
  },
];

const tags = [
  "classic",
  "fantasy",
  "adventure",
  "science-fiction",
  "horror",
];

const books = [
  {
    id: bookIds.hobbit,
    title: "El Hobbit",
    authorId: authorIds.tolkien,
    genre: BookGenre.fiction,
    status: ReadingStatus.read,
    rating: 5,
    tags: ["classic", "fantasy", "adventure"],
  },
  {
    id: bookIds.foundation,
    title: "Fundación",
    authorId: authorIds.asimov,
    genre: BookGenre.science,
    status: ReadingStatus.read,
    rating: 4,
    tags: ["classic", "science-fiction"],
  },
  {
    id: bookIds.frankenstein,
    title: "Frankenstein",
    authorId: authorIds.shelley,
    genre: BookGenre.fiction,
    status: ReadingStatus.reading,
    rating: null,
    tags: ["classic", "horror"],
  },
  {
    id: bookIds.silmarillion,
    title: "El Silmarillion",
    authorId: authorIds.tolkien,
    genre: BookGenre.fiction,
    status: ReadingStatus.to_read,
    rating: null,
    tags: ["fantasy"],
  },
];

const histories = [
  {
    id: "7a7b75aa-2757-459f-8578-6682db9c0001",
    bookId: bookIds.hobbit,
    fromStatus: null,
    toStatus: ReadingStatus.to_read,
    changedAt: new Date("2026-01-01T10:00:00.000Z"),
  },
  {
    id: "7a7b75aa-2757-459f-8578-6682db9c0002",
    bookId: bookIds.hobbit,
    fromStatus: ReadingStatus.to_read,
    toStatus: ReadingStatus.reading,
    changedAt: new Date("2026-01-03T10:00:00.000Z"),
  },
  {
    id: "7a7b75aa-2757-459f-8578-6682db9c0003",
    bookId: bookIds.hobbit,
    fromStatus: ReadingStatus.reading,
    toStatus: ReadingStatus.read,
    changedAt: new Date("2026-01-10T10:00:00.000Z"),
  },
  {
    id: "7a7b75aa-2757-459f-8578-6682db9c0004",
    bookId: bookIds.foundation,
    fromStatus: null,
    toStatus: ReadingStatus.read,
    changedAt: new Date("2026-02-01T10:00:00.000Z"),
  },
  {
    id: "7a7b75aa-2757-459f-8578-6682db9c0005",
    bookId: bookIds.frankenstein,
    fromStatus: null,
    toStatus: ReadingStatus.reading,
    changedAt: new Date("2026-03-01T10:00:00.000Z"),
  },
  {
    id: "7a7b75aa-2757-459f-8578-6682db9c0006",
    bookId: bookIds.silmarillion,
    fromStatus: null,
    toStatus: ReadingStatus.to_read,
    changedAt: new Date("2026-04-01T10:00:00.000Z"),
  },
];

async function main() {
  for (const author of authors) {
    await prisma.author.upsert({
      where: { id: author.id },
      update: {
        name: author.name,
        country: author.country,
      },
      create: author,
    });
  }

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag },
      update: {},
      create: { name: tag },
    });
  }

  for (const book of books) {
    await prisma.book.upsert({
      where: { id: book.id },
      update: {
        title: book.title,
        authorId: book.authorId,
        genre: book.genre,
        status: book.status,
        rating: book.rating,
        deletedAt: null,
        tags: {
          set: [],
          connect: book.tags.map((name) => ({ name })),
        },
      },
      create: {
        id: book.id,
        title: book.title,
        authorId: book.authorId,
        genre: book.genre,
        status: book.status,
        rating: book.rating,
        tags: {
          connect: book.tags.map((name) => ({ name })),
        },
      },
    });
  }

  for (const history of histories) {
    await prisma.statusHistory.upsert({
      where: { id: history.id },
      update: history,
      create: history,
    });
  }

  console.log("Seed ejecutado correctamente");
}

main()
  .catch((error) => {
    console.error("Error al ejecutar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
