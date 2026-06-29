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

//Rutas
carsRouter.get("/brand/:brand", getCarByBrand); //Obtenemos coches por marca
carsRouter.post("/", auth, createCar); //Creamos un coche nuevo
carsRouter.get("/", getCars); //Obtenemos todos los coches
carsRouter.put("/:id", auth, updateCarById); //Actualizamos un coche por ID
carsRouter.delete("/:id", auth, deleteCarById); //Eliminamos un coche por ID
carsRouter.get("/:id", getCarById); //Obtenemos un coche por ID

module.exports = carsRouter;
