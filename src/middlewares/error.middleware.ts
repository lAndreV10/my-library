import type { ErrorRequestHandler, RequestHandler } from "express";

type ErrorWithStatus = Error & {
  status?: number;
  statusCode?: number;
  type?: string;
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  return res.status(404).json({
    message: "Ruta no encontrada",
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const error = err as ErrorWithStatus;

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "JSON inválido",
    });
  }

  const status = error.statusCode || error.status || 500;
  const safeStatus = status >= 400 && status < 600 ? status : 500;

  console.error("Error:", error.message);

  return res.status(safeStatus).json({
    message:
      safeStatus === 500 ? "Error interno del servidor" : error.message,
  });
};
