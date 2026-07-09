import { z } from "zod";

export const createAuthorSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  country: z.string().trim().optional(),
});

export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;