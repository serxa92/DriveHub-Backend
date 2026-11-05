//Imports
require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const connectDB = require("./src/config/db");
const carsRouter = require("./src/routes/car.routes");
const authRoutes = require("./src/routes/auth");
const clientRoutes = require("./src/routes/client.routes");
const saleRoutes = require("./src/routes/sale.routes");

const app = express();
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  process.env.CLIENT_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
if (process.env.TRUST_PROXY) {
  const trustProxy = /^\d+$/.test(process.env.TRUST_PROXY)
    ? Number(process.env.TRUST_PROXY)
    : process.env.TRUST_PROXY;
  app.set("trust proxy", trustProxy);
}
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origen no permitido"));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

connectDB();

// Rutas
app.use("/cars", carsRouter);
app.use("/auth", authRoutes);
app.use("/clients", clientRoutes);
app.use("/sales", saleRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ message: "La API está funcionando ✅" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada ❌" });
});

// Evito devolver detalles internos al cliente.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error.message === "Origen no permitido") {
    return res.status(403).json({ message: "Origen no permitido" });
  }
  if (error.name === "MulterError") {
    return res.status(400).json({ message: "Archivo no válido" });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "JSON no válido" });
  }
  if (error.status === 413) {
    return res.status(413).json({ message: "Solicitud demasiado grande" });
  }

  console.error("Error no controlado:", error);
  return res.status(500).json({ message: "Error interno del servidor" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor levantado en http://localhost:${PORT}`);
});
