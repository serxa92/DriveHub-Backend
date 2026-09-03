require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Car = require("../models/car.model");
const User = require("../models/user.model");

// Defino las columnas que necesito para crear cada coche.
const headers = [
  "brand",
  "model",
  "year",
  "mileage",
  "price",
  "fuel",
  "transmission",
  "status",
  "notes",
];

// Guardo los valores permitidos para compararlos con el CSV.
const enumValues = {
  fuel: ["Gasoline", "Diesel", "Hybrid", "Electric", "LPG"],
  transmission: ["Manual", "Automatic"],
  status: ["Available", "Reserved", "Sold"],
};

// Recorro el CSV a mano para respetar comas y saltos entre comillas.
const parseCsv = (content) => {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(value.trim());
      if (row.some((field) => field !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (insideQuotes) {
    throw new Error("El CSV contiene un campo entre comillas sin cerrar");
  }

  row.push(value.trim());
  if (row.some((field) => field !== "")) rows.push(row);

  return rows;
};

// Convierto los números y señalo la línea si alguno no es válido.
const parseNumber = (value, field, line, required = false) => {
  if (value === "") {
    if (required) throw new Error(`Línea ${line}: ${field} es obligatorio`);
    return undefined;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Línea ${line}: ${field} debe ser un número válido`);
  }

  return number;
};

// Normalizo los enums para guardarlos como aparecen en el modelo.
const parseEnum = (value, field, line) => {
  if (value === "") return undefined;

  const validValue = enumValues[field].find(
    (option) => option.toLowerCase() === value.toLowerCase(),
  );

  if (!validValue) {
    throw new Error(
      `Línea ${line}: ${field} debe ser ${enumValues[field].join(", ")}`,
    );
  }

  return validValue;
};

const getCarsFromCsv = (csvPath) => {
  // Leo el archivo y elimino la marca BOM que algunos editores añaden.
  const content = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(content);

  if (rows.length < 2) {
    throw new Error("El CSV debe incluir la cabecera y al menos un coche");
  }

  // Compruebo la cabecera antes de procesar los coches.
  const csvHeaders = rows[0].map((header) => header.toLowerCase());
  const missingHeaders = headers.filter((header) => !csvHeaders.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`Faltan columnas: ${missingHeaders.join(", ")}`);
  }

  // Transformo cada fila en un objeto compatible con el modelo Car.
  return rows.slice(1).map((row, index) => {
    const line = index + 2;

    if (row.length !== csvHeaders.length) {
      throw new Error(`Línea ${line}: el número de columnas no coincide`);
    }

    const data = Object.fromEntries(
      csvHeaders.map((header, column) => [header, row[column]]),
    );

    return {
      brand: data.brand || undefined,
      model: data.model || undefined,
      year: parseNumber(data.year, "year", line),
      mileage: parseNumber(data.mileage, "mileage", line),
      price: parseNumber(data.price, "price", line, true),
      fuel: parseEnum(data.fuel, "fuel", line),
      transmission: parseEnum(data.transmission, "transmission", line),
      status: parseEnum(data.status, "status", line),
      notes: data.notes || "",
    };
  });
};

const seedCars = async (csvArgument = "data/cars.csv") => {
  if (!process.env.DB_URL) {
    throw new Error("Falta la variable de entorno DB_URL");
  }

  // Resuelvo la ruta desde la carpeta donde ejecuto el comando.
  const csvPath = path.resolve(process.cwd(), csvArgument);
  const cars = getCarsFromCsv(csvPath);

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.DB_URL);
  }

  // Busco el admin indicado o uso el primero disponible.
  const adminFilter = { role: "admin" };
  if (process.env.SEED_ADMIN_EMAIL) {
    adminFilter.email = process.env.SEED_ADMIN_EMAIL.toLowerCase();
  }

  const admin = await User.findOne(adminFilter);
  if (!admin) {
    throw new Error("No se encontró un usuario admin para asociar los coches");
  }

  // Creo todos los coches con el admin como propietario.
  const createdCars = await Car.insertMany(
    cars.map((car) => ({ ...car, owner: admin._id })),
  );

  // Sustituyo las referencias antiguas por los coches recién creados.
  await User.updateOne(
    { _id: admin._id },
    { $set: { cars: createdCars.map((car) => car._id) } },
  );

  console.log(`${createdCars.length} coches importados correctamente ✅`);
};

if (require.main === module) {
  seedCars(process.argv[2])
    .catch((error) => {
      console.error(`Error importando coches: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      // Cierro la conexión aunque la importación falle.
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    });
}

module.exports = seedCars;
