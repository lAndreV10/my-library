import express from "express";
const app = express();
const port = 3000;
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "API de biblioteca funcionando" });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

