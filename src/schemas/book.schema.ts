import { z } from "zod";
import { BookGenre, ReadingStatus } from "../generated/prisma/client.js";

export const createBookSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio"),
  authorId: z.string().uuid("El authorId debe ser un UUID válido"),
  genre: z.nativeEnum(BookGenre, {
    message: "El género no es válido",
  }),
  status: z.nativeEnum(ReadingStatus, {
    message: "El estado de lectura no es válido",
  }),
  rating: z
    .number()
    .int()
    .min(1, "La calificación mínima es 1")
    .max(5, "La calificación máxima es 5")
    .optional(),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
});

export const getBooksQuerySchema = z.object({
  status: z.nativeEnum(ReadingStatus, {
    message: "El estado de lectura no es válido",
  }).optional(),
  genre: z.nativeEnum(BookGenre, {
    message: "El género no es válido",
  }).optional(),
  authorId: z.string().uuid("El autorId debe ser un UUID válido").optional(),
  authorName: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  minRating: z.coerce
    .number()
    .int()
    .min(1, "La calificación mínima es 1")
    .max(5, "La calificación máxima es 5")
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(["createdAt", "rating", "title"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type GetBooksQuery = z.infer<typeof getBooksQuerySchema>;

export const updateBookSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").optional(),
  authorId: z.string().uuid("El authorId debe ser un UUID válido").optional(),
  genre: z.nativeEnum(BookGenre, {
    message: "El género no es válido",
  }).optional(),
  status: z.nativeEnum(ReadingStatus, {
    message: "El estado de lectura no es válido",
  }).optional(),
  rating: z
    .number()
    .int()
    .min(1, "La calificación mínima es 1")
    .max(5, "La calificación máxima es 5")
    .optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
});

export const bookParamsSchema = z.object({
  id: z.string().uuid("El ID del libro debe ser un UUID válido"),
});

export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type BookParams = z.infer<typeof bookParamsSchema>;
