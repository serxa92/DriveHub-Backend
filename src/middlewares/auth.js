const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

//Middleware para verificar el token JWT en las rutas protegidas
const auth = async (req, res, next) => {
  try {
    //Obtenemos el header de autorización
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: "Token requerido" });

    //Separamos el tipo (Bearer) del token
    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token)
      return res.status(401).json({ message: "Formato inválido" });

    //Verificamos y decodificamos el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //Buscamos el usuario en la base de datos
    const user = await User.findById(decoded.id).select("_id role");
    if (!user) return res.status(401).json({ message: "Usuario no existe" });

    //Guardamos los datos del usuario en req.user para usarlos en los controladores
    req.user = { id: user._id.toString(), role: user.role };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

module.exports = auth;
