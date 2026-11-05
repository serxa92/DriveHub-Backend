const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const User = require("../models/user.model");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const removeUploadedAvatar = async (file) => {
  if (!file || !file.filename) return;

  try {
    await cloudinary.uploader.destroy(file.filename);
  } catch (error) {
    console.error("Error eliminando avatar de Cloudinary:", error.message);
  }
};

const getAvatarPublicId = (user) => {
  if (user.imagePublicId) return user.imagePublicId;
  if (!user.image || !user.image.includes("/upload/")) return "";

  return user.image
    .split("/upload/")[1]
    .replace(/^v\d+\//, "")
    .replace(/\.[^/.]+$/, "");
};

//Registramos un usuario nuevo
const register = async (req, res) => {
  let userCreated = false;

  try {
    const { username, email, password } = req.body || {};
    const cleanUsername = typeof username === "string" ? username.trim() : "";
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (
      !cleanUsername ||
      !cleanEmail ||
      typeof password !== "string" ||
      !password
    ) {
      await removeUploadedAvatar(req.file);
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    if (!emailPattern.test(cleanEmail)) {
      await removeUploadedAvatar(req.file);
      return res.status(400).json({ message: "Email inválido" });
    }

    if (password.length < 6) {
      await removeUploadedAvatar(req.file);
      return res
        .status(400)
        .json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }],
    }).select("email username");

    if (existingUser) {
      await removeUploadedAvatar(req.file);
      const field = existingUser.email === cleanEmail ? "email" : "username";
      return res.status(409).json({ message: `El ${field} ya está registrado` });
    }

    // Guardo la URL y el identificador que devuelve Cloudinary.
    const image = req.file ? req.file.path : "";
    const imagePublicId = req.file ? req.file.filename : "";

    const newUser = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      password,
      image,
      imagePublicId,
      role: "user",
    });
    userCreated = true;

    const userWithoutPassword = {
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      image: newUser.image,
      imagePublicId: newUser.imagePublicId,
      cars: newUser.cars,
    };

    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (!userCreated) await removeUploadedAvatar(req.file);
    console.error("Error en el registro:", error);

    if (error.code === 11000) {
      return res.status(409).json({ message: "Email o username ya registrado" });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Datos de usuario no válidos" });
    }

    return res.status(500).json({ message: "Error registrando al usuario" });
  }
};

//Iniciamos sesión y generamos el token JWT
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ message: "Email y contraseña obligatorios" });
    }

    // Incluyo password sólo aquí para poder comprobarlo.
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

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
      imagePublicId: user.imagePublicId,
      cars: user.cars,
    };

    return res.status(200).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error("Error en el login:", error);
    return res.status(500).json({ message: "Error iniciando sesión" });
  }
};

//Cambiamos el rol de un usuario (solo puede hacerlo un admin)
const changeRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body || {};
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
    return res.status(500).json({ message: "Error cambiando rol" });
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

    // Eliminamos el avatar usando su identificador de Cloudinary.
    const avatarPublicId = getAvatarPublicId(userToDelete);
    if (avatarPublicId) {
      await cloudinary.uploader.destroy(avatarPublicId);
    }

    //Eliminamos el usuario de la base de datos
    await User.findByIdAndDelete(userId);

    return res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando usuario:", error);
    return res.status(500).json({ message: "Error eliminando usuario" });
  }
};

//Añadimos un coche al array del usuario (sin duplicados)
const addCar = async (req, res) => {
  try {
    const { carId } = req.body || {};
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
    return res.status(500).json({ message: "Error añadiendo coche" });
  }
};

module.exports = {
  register,
  login,
  changeRole,
  deleteUser,
  addCar,
};
