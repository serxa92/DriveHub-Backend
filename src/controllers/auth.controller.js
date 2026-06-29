const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const User = require("../models/user.model");

//Registramos un usuario nuevo
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    //Si se sube imagen, obtenemos la URL de Cloudinary
    const image = req.file ? req.file.path : "";

    //Creamos el usuario (la contraseña se encripta automáticamente en el modelo)
    const newUser = await User.create({
      username,
      email,
      password,
      image,
      role: "user",
    });

    //Devolvemos el usuario sin la contraseña
    const userWithoutPassword = {
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      image: newUser.image,
      cars: newUser.cars,
    };

    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Error en el registro:", error);
    return res
      .status(500)
      .json({ message: "Error registrando al usuario", error: error.message });
  }
};

//Iniciamos sesión y generamos el token JWT
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    //Buscamos el usuario por email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    //Comprobamos si la contraseña es correcta
    const isValidPassword = await user.checkPassword(password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    //Creamos el token con el id y el rol del usuario
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    const userWithoutPassword = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      image: user.image,
      cars: user.cars,
    };

    return res.status(200).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error("Error en el login:", error);
    return res
      .status(500)
      .json({ message: "Error iniciando sesión", error: error.message });
  }
};

//Cambiamos el rol de un usuario (solo puede hacerlo un admin)
const changeRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.id;

    //Comprobamos que no intente cambiar su propio rol
    if (currentUserId === userId) {
      return res
        .status(403)
        .json({ message: "No puedes cambiar tu propio rol" });
    }

    //Solo los admins pueden cambiar roles
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Solo los administradores pueden cambiar roles" });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Rol inválido" });
    }

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    userToUpdate.role = role;
    await userToUpdate.save();

    return res.status(200).json({
      message: "Rol actualizado correctamente",
      role: userToUpdate.role,
    });
  } catch (error) {
    console.error("Error cambiando rol:", error);
    return res
      .status(500)
      .json({ message: "Error cambiando rol", error: error.message });
  }
};

//Eliminamos un usuario (puede hacerlo el propio usuario o un admin)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    //Un usuario normal solo puede borrarse a sí mismo
    if (currentUserRole !== "admin" && currentUserId !== userId) {
      return res
        .status(403)
        .json({ message: "No puedes eliminar la cuenta de otro usuario" });
    }

    //Si tiene imagen en Cloudinary, la eliminamos
    if (userToDelete.image && userToDelete.image.includes("cloudinary")) {
      const publicId = userToDelete.image.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`users/${publicId}`);
    }

    //Eliminamos el usuario de la base de datos
    await User.findByIdAndDelete(userId);

    return res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando usuario:", error);
    return res
      .status(500)
      .json({ message: "Error eliminando usuario", error: error.message });
  }
};

//Añadimos un coche al array del usuario (sin duplicados)
const addCar = async (req, res) => {
  try {
    const { carId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    //Solo lo añadimos si no existe ya en el array
    if (!user.cars.includes(carId)) {
      user.cars.push(carId);
      await user.save();
    }

    return res
      .status(200)
      .json({ message: "Coche añadido correctamente", cars: user.cars });
  } catch (error) {
    console.error("Error añadiendo coche:", error);
    return res
      .status(500)
      .json({ message: "Error añadiendo coche", error: error.message });
  }
};

module.exports = {
  register,
  login,
  changeRole,
  deleteUser,
  addCar,
};
