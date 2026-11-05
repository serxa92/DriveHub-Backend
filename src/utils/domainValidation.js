const mongoose = require("mongoose");

const CLIENT_STATUSES = ["Interested", "Contacted", "Negotiating", "Customer"];
const CAR_FUELS = ["Gasoline", "Diesel", "Hybrid", "Electric", "LPG"];
const CAR_TRANSMISSIONS = ["Manual", "Automatic"];
const SALE_PAYMENT_METHODS = ["Cash", "Financing", "Bank transfer"];
const SALE_STATUSES = ["Pending", "Completed", "Cancelled"];
const ACTIVE_SALE_STATUSES = ["Pending", "Completed"];

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const ensureObjectId = (value, field = "id") => {
  if (!mongoose.isObjectIdOrHexString(value)) {
    throw new RequestError(400, `${field} no es válido`);
  }
  return value;
};

const ensureBody = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RequestError(400, "El cuerpo de la petición no es válido");
  }
};

const getString = (body, field, options = {}) => {
  const { required = false, max = 500, defaultValue } = options;
  const value = body[field];

  if (value === undefined) {
    if (required) throw new RequestError(400, `${field} es obligatorio`);
    return defaultValue;
  }

  if (typeof value !== "string") {
    throw new RequestError(400, `${field} debe ser texto`);
  }

  const cleanValue = value.trim();
  if (required && !cleanValue) {
    throw new RequestError(400, `${field} es obligatorio`);
  }
  if (cleanValue.length > max) {
    throw new RequestError(400, `${field} es demasiado largo`);
  }

  return cleanValue;
};

const getNumber = (body, field, options = {}) => {
  const { required = false, min, max, integer = false } = options;
  const value = body[field];

  if (value === undefined || value === "") {
    if (required) throw new RequestError(400, `${field} es obligatorio`);
    return undefined;
  }

  const isNumericValue =
    typeof value === "number" ||
    (typeof value === "string" && /^-?(?:\d+|\d*\.\d+)$/.test(value.trim()));
  if (!isNumericValue) {
    throw new RequestError(400, `${field} debe ser un número válido`);
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new RequestError(400, `${field} debe ser un número válido`);
  }
  if (integer && !Number.isInteger(number)) {
    throw new RequestError(400, `${field} debe ser un número entero`);
  }
  if (min !== undefined && number < min) {
    throw new RequestError(400, `${field} no puede ser menor que ${min}`);
  }
  if (max !== undefined && number > max) {
    throw new RequestError(400, `${field} no puede ser mayor que ${max}`);
  }

  return number;
};

const getEnum = (body, field, values, defaultValue) => {
  const value = body[field];
  if (value === undefined || value === "") return defaultValue;
  if (!values.includes(value)) {
    throw new RequestError(400, `${field} no es válido`);
  }
  return value;
};

const buildClientData = (body, options = {}) => {
  ensureBody(body);
  const { partial = false, allowStatus = false } = options;
  const data = {};
  const required = !partial;

  const name = getString(body, "name", { required, max: 120 });
  const email = getString(body, "email", { required, max: 160 });
  const phone = getString(body, "phone", { required, max: 25 });
  const city = getString(body, "city", { max: 100 });
  const notes = getString(body, "notes", { max: 1000 });

  if (name !== undefined) data.name = name;
  if (email !== undefined) {
    const normalizedEmail = email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new RequestError(400, "email no es válido");
    }
    data.email = normalizedEmail;
  }
  if (phone !== undefined) {
    const phoneDigits = phone.replace(/\D/g, "");
    if (!/^\+?[0-9\s()-]{7,20}$/.test(phone) || phoneDigits.length < 7) {
      throw new RequestError(400, "phone no es válido");
    }
    data.phone = phone;
  }
  if (city !== undefined) data.city = city;
  if (notes !== undefined) data.notes = notes;

  if (body.interestedCars !== undefined) {
    if (!Array.isArray(body.interestedCars)) {
      throw new RequestError(400, "interestedCars debe ser un array");
    }
    data.interestedCars = [
      ...new Set(
        body.interestedCars.map((carId) =>
          ensureObjectId(carId, "interestedCars"),
        ),
      ),
    ];
  }

  if (allowStatus && body.status !== undefined) {
    data.status = getEnum(body, "status", CLIENT_STATUSES);
  }

  return data;
};

const buildCarData = (body, options = {}) => {
  ensureBody(body);
  const { partial = false } = options;
  const data = {};
  const required = !partial;
  const maxYear = new Date().getFullYear() + 1;

  const brand = getString(body, "brand", { max: 80 });
  const model = getString(body, "model", { max: 100 });
  const notes = getString(body, "notes", { max: 2000 });
  const year = getNumber(body, "year", { min: 1886, max: maxYear, integer: true });
  const mileage = getNumber(body, "mileage", { min: 0 });
  const price = getNumber(body, "price", { required, min: 0.01 });
  const fuel = getEnum(body, "fuel", CAR_FUELS);
  const transmission = getEnum(body, "transmission", CAR_TRANSMISSIONS);

  if (brand !== undefined) data.brand = brand;
  if (model !== undefined) data.model = model;
  if (notes !== undefined) data.notes = notes;
  if (year !== undefined) data.year = year;
  if (mileage !== undefined) data.mileage = mileage;
  if (price !== undefined) data.price = price;
  if (fuel !== undefined) data.fuel = fuel;
  if (transmission !== undefined) data.transmission = transmission;

  return data;
};

const buildSaleData = (body, options = {}) => {
  ensureBody(body);
  const { partial = false } = options;
  const data = {};
  const required = !partial;

  if (body.car !== undefined || required) {
    data.car = ensureObjectId(body.car, "car");
  }
  if (body.client !== undefined || required) {
    data.client = ensureObjectId(body.client, "client");
  }

  const salePrice = getNumber(body, "salePrice", { required, min: 0.01 });
  const paymentMethod = getEnum(
    body,
    "paymentMethod",
    SALE_PAYMENT_METHODS,
  );
  const status = getEnum(body, "status", SALE_STATUSES);
  const notes = getString(body, "notes", { max: 1000 });

  if (body.saleDate !== undefined) {
    const saleDate = new Date(body.saleDate);
    if (Number.isNaN(saleDate.getTime())) {
      throw new RequestError(400, "saleDate no es válida");
    }
    data.saleDate = saleDate;
  }

  if (salePrice !== undefined) data.salePrice = salePrice;
  if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
  if (status !== undefined) data.status = status;
  if (notes !== undefined) data.notes = notes;

  return data;
};

const carStatusFromSaleStatuses = (statuses) => {
  if (statuses.includes("Completed")) return "Sold";
  if (statuses.includes("Pending")) return "Reserved";
  return "Available";
};

const handleControllerError = (res, error, fallbackMessage) => {
  if (error instanceof RequestError) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: "Datos no válidos" });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "La operación entra en conflicto" });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
};

module.exports = {
  ACTIVE_SALE_STATUSES,
  CLIENT_STATUSES,
  RequestError,
  buildCarData,
  buildClientData,
  buildSaleData,
  carStatusFromSaleStatuses,
  ensureObjectId,
  handleControllerError,
};
