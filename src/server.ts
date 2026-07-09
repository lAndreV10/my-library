import express from "express";
import authorRoutes from "./routes/author.routes.js";

const app = express();
const port = 3000;

app.use(express.json());

app.use("/authors", authorRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "API de biblioteca funcionando" });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});