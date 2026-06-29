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

// Rutas de clientes
// público: formulario de contacto / interés
clientRouter.post("/", createClient); 

clientRouter.get("/", auth, getClients); // privado
clientRouter.get("/:id", auth, getClientById); // privado
clientRouter.put("/:id", auth, updateClientById); // privado
clientRouter.delete("/:id", auth, deleteClientById); // privado

module.exports = clientRouter;