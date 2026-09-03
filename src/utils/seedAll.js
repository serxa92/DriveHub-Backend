require("dotenv").config();
const mongoose = require("mongoose");
const Car = require("../models/car.model");
const Client = require("../models/client.model");
const Sale = require("../models/sale.model");
const seedCars = require("./seedCars");
const seedClients = require("./seedClients");
const seedSales = require("./seedSales");

const runStep = async (name, action) => {
  try {
    console.log(`Iniciando: ${name}`);
    await action();
  } catch (error) {
    throw new Error(`${name}: ${error.message}`);
  }
};

const seedAll = async () => {
  if (!process.env.DB_URL) {
    throw new Error("Falta la variable de entorno DB_URL");
  }

  await mongoose.connect(process.env.DB_URL);

  // Limpio primero las colecciones que vamos a volver a crear.
  await runStep("limpieza de datos", async () => {
    const deletedSales = await Sale.deleteMany({});
    const deletedClients = await Client.deleteMany({});
    const deletedCars = await Car.deleteMany({});

    console.log(
      `Eliminados: ${deletedCars.deletedCount} coches, ${deletedClients.deletedCount} clientes y ${deletedSales.deletedCount} ventas`,
    );
  });

  await runStep("seed de coches", () => seedCars("data/cars.csv"));
  await runStep("seed de clientes", () => seedClients("data/clients.csv"));
  await runStep("seed de ventas", () => seedSales("data/sales.csv"));

  console.log("Seed completo terminado correctamente ✅");
};

seedAll()
  .catch((error) => {
    console.error(`Error en el seed completo: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Mantengo los usuarios y cierro la conexión al terminar.
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
