const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const imageSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    isCover: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

const carSchema = new Schema(
  {
    brand: {
      type: String,
      default: "marca desconocida",
      trim: true,
      maxlength: 80,
      set: (value) => value.toLowerCase(),
    },

    model: {
      type: String,
      default: "Modelo desconocido",
      trim: true,
      maxlength: 100,
    },

    year: {
      type: Number,
      default: 2000,
      min: 1886,
      max: new Date().getFullYear() + 1,
      validate: {
        validator: Number.isInteger,
        message: "El año debe ser un número entero",
      },
    },

    mileage: {
      type: Number,
      default: 0,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0.01,
    },

    fuel: {
      type: String,
      enum: ["Gasoline", "Diesel", "Hybrid", "Electric", "LPG"],
      default: "Gasoline",
    },

    transmission: {
      type: String,
      enum: ["Manual", "Automatic"],
      default: "Manual",
    },

    status: {
      type: String,
      enum: ["Available", "Reserved", "Sold"],
      default: "Available",
    },

    notes: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    images: {
      type: [imageSchema],
      default: [],
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Car", carSchema);