const express = require("express");
const {
  getCars,
  createCar,
  getCarById,
  getCarByBrand,
  updateCarById,
  deleteCarById,
} = require("../controllers/car.controller");
const carsRouter = express.Router();
const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");
const { upload } = require("../middlewares/upload");

//Rutas
carsRouter.get("/brand/:brand", getCarByBrand); //Obtenemos coches por marca
carsRouter.post("/", auth, isAdmin, upload.array("images", 10), createCar); //Creamos un coche nuevo
carsRouter.get("/", getCars); //Obtenemos todos los coches
carsRouter.put("/:id", auth, isAdmin, updateCarById); //Actualizamos un coche por ID
carsRouter.delete("/:id", auth, isAdmin, deleteCarById); //Eliminamos un coche por ID
carsRouter.get("/:id", getCarById); //Obtenemos un coche por ID

module.exports = carsRouter;
