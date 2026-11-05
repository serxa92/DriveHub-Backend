const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const saleSchema = new Schema(
  {
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    salePrice: {
      type: Number,
      required: true,
      min: 0.01,
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Financing", "Bank transfer"],
      default: "Bank transfer",
    },

    status: {
      type: String,
      enum: ["Pending", "Completed", "Cancelled"],
      default: "Pending",
    },

    saleDate: {
      type: Date,
      default: Date.now,
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

module.exports = mongoose.model("Sale", saleSchema);