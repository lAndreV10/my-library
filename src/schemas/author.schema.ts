import { z } from "zod";

export const createAuthorSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  country: z.string().trim().optional(),
});

export const getAuthorsQuerySchema = z.object({
  name: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const authorParamsSchema = z.object({
  id: z.string().uuid("El ID debe ser un UUID válido"),
});

export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;
export type GetAuthorsQuery = z.infer<typeof getAuthorsQuerySchema>;
export type AuthorParams = z.infer<typeof authorParamsSchema>;