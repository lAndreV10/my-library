import { Router } from "express";
import {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
  getBookHistory,
} from "../controllers/book.controller.js";

const router = Router();

router.post("/", createBook);
router.get("/", getBooks);
router.get("/:id", getBookById);
router.patch("/:id", updateBook);
router.delete("/:id", deleteBook);
router.get("/:id/history", getBookHistory);

export default router;
