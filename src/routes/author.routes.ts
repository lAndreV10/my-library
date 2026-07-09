import { Router } from "express";
import {
  createAuthor,
  getAuthors,
  getAuthorById,
} from "../controllers/author.controller.js";

const router = Router();

router.post("/", createAuthor);
router.get("/", getAuthors);
router.get("/:id", getAuthorById);

export default router;