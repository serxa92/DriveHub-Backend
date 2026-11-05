const express = require("express");
const {
  getCars,
  createCar,
  getCarById,
  getCarByBrand,
  updateCarById,
  deleteCarImage,
  setCarCover,
  deleteCarById,
} = require("../controllers/car.controller");
const carsRouter = express.Router();
const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");
const { uploadCarImages } = require("../middlewares/upload");

//Rutas
carsRouter.get("/brand/:brand", getCarByBrand); //Obtenemos coches por marca
carsRouter.post("/", auth, isAdmin, uploadCarImages, createCar); //Creamos un coche nuevo
carsRouter.get("/", getCars); //Obtenemos todos los coches
carsRouter.put(
  "/:id",
  auth,
  isAdmin,
  uploadCarImages,
  updateCarById,
); //Actualizamos un coche por ID
carsRouter.delete("/:id/images", auth, isAdmin, deleteCarImage); //Eliminamos una imagen
carsRouter.put("/:id/images/cover", auth, isAdmin, setCarCover); //Cambiamos la portada
carsRouter.delete("/:id", auth, isAdmin, deleteCarById); //Eliminamos un coche por ID
carsRouter.get("/:id", getCarById); //Obtenemos un coche por ID

module.exports = carsRouter;
