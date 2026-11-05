const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const clientSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 25,
      validate: {
        validator: (value) =>
          /^\+?[0-9\s()-]{7,20}$/.test(value) &&
          value.replace(/\D/g, "").length >= 7,
        message: "El teléfono no es válido",
      },
    },

    city: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    interestedCars: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Car",
      },
    ],

    status: {
      type: String,
      enum: ["Interested", "Contacted", "Negotiating", "Customer"],
      default: "Interested",
    },

    notes: {
      type: String,
      default: "",
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Client", clientSchema);