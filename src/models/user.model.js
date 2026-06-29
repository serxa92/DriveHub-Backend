const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Schema = mongoose.Schema;

//Definimos el esquema del usuario
const userSchema = new Schema(
  {
    username: { type: String, required: true, trim: true, unique: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: [6, "La contraseña debe tener al menos 6 caracteres"],
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    image: { type: String, default: "" },
    cars: [{ type: mongoose.Schema.Types.ObjectId, ref: "Car" }], //Array de coches asociados al usuario
  },
  { timestamps: true, versionKey: false },
);

// Antes de guardar, si ha cambiado la contraseña, la encriptamos

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar contraseña en el login
userSchema.methods.checkPassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};
const User = mongoose.model("User", userSchema);
module.exports = User;
