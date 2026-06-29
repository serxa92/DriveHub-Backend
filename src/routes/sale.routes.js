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

// Rutas de ventas
saleRouter.get("/", auth, getSales);
saleRouter.get("/:id", auth, getSaleById);
saleRouter.post("/", auth, createSale);
saleRouter.put("/:id", auth, updateSaleById);
saleRouter.delete("/:id", auth, deleteSaleById);

module.exports = saleRouter;