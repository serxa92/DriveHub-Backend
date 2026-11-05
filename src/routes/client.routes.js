const express = require("express");
const clientRouter = express.Router();

const {
  getClients,
  getClientById,
  createClient,
  updateClientById,
  deleteClientById,
} = require("../controllers/client.controller");

const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");
const { contactLimiter } = require("../middlewares/rateLimits");

// El alta sigue pública para el formulario de contacto.
clientRouter.post("/", contactLimiter, createClient);

clientRouter.get("/", auth, isAdmin, getClients);
clientRouter.get("/:id", auth, isAdmin, getClientById);
clientRouter.put("/:id", auth, isAdmin, updateClientById);
clientRouter.delete("/:id", auth, isAdmin, deleteClientById);

module.exports = clientRouter;