const { rateLimit } = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Demasiados intentos. Prueba de nuevo más tarde" },
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Demasiadas solicitudes. Prueba de nuevo más tarde" },
});

module.exports = { authLimiter, contactLimiter };
