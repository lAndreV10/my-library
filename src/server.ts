import "dotenv/config";
import express from "express";
import authorRoutes from "./routes/author.routes.js";
import bookRoutes from "./routes/book.routes.js";
import statsRoutes from "./routes/stats.routes.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

app.use("/authors", authorRoutes);
app.use("/books", bookRoutes);
app.use("/stats", statsRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "API de biblioteca funcionando" });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
