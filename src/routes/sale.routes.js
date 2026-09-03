const express = require("express");
const saleRouter = express.Router();

const {
  getSales,
  getSaleById,
  createSale,
  updateSaleById,
  deleteSaleById,
} = require("../controllers/sale.controller");

const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");

// Rutas de ventas
saleRouter.get("/", auth, isAdmin, getSales);
saleRouter.get("/:id", auth, isAdmin, getSaleById);
saleRouter.post("/", auth, isAdmin, createSale);
saleRouter.put("/:id", auth, isAdmin, updateSaleById);
saleRouter.delete("/:id", auth, isAdmin, deleteSaleById);

module.exports = saleRouter;