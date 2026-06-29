const express = require("express");
const router = express.Router();

const {
  register,
  login,
  changeRole,
  deleteUser,
  addCar,
} = require("../controllers/auth.controller");
const auth = require("../middlewares/auth");
const upload = require("../middlewares/upload");

//Registramos un usuario nuevo (con subida de imagen a Cloudinary)
router.post("/register", upload.single("image"), register);

//Iniciamos sesión y obtenemos el token JWT
router.post("/login", login);

//Cambiamos el rol de un usuario (solo admin)
router.put("/users/:userId/role", auth, changeRole);

//Eliminamos un usuario
router.delete("/users/:userId", auth, deleteUser);

//Añadimos un coche al array del usuario
router.put("/users/cars", auth, addCar);

module.exports = router;
