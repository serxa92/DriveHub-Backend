const mongoose = require("mongoose");

//Función para conectar con la base de datos de MongoDB Atlas
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Conectado correctamente con MongoDB ✅");
  } catch (error) {
    console.error("Error conectando con MongoDB❌");
  }
};
module.exports = connectDB;
