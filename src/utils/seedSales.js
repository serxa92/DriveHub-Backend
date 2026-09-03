require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Car = require("../models/car.model");
const Client = require("../models/client.model");
const Sale = require("../models/sale.model");
const User = require("../models/user.model");

const saleHeaders = [
  "carIndex",
  "clientEmail",
  "salePrice",
  "paymentMethod",
  "status",
  "notes",
];
const carHeaders = [
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
const paymentMethods = ["Cash", "Financing", "Bank transfer"];
const saleStatuses = ["Pending", "Completed", "Cancelled"];

// Recorro el CSV a mano para respetar los campos entre comillas.
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

const getRowsFromCsv = (csvPath, expectedHeaders, label) => {
  const content = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(content);

  if (rows.length < 2) {
    throw new Error(`${label} debe incluir la cabecera y al menos una fila`);
  }

  if (rows[0].join(",") !== expectedHeaders.join(",")) {
    throw new Error(`La cabecera de ${label} no es válida`);
  }

  return rows.slice(1).map((row, index) => {
    const line = index + 2;

    if (row.length !== expectedHeaders.length) {
      throw new Error(`Línea ${line} de ${label}: columnas incorrectas`);
    }

    return {
      line,
      data: Object.fromEntries(
        expectedHeaders.map((header, column) => [header, row[column]]),
      ),
    };
  });
};

const getRequiredValue = (value, field, line) => {
  if (!value) throw new Error(`Línea ${line}: ${field} es obligatorio`);
  return value;
};

const parseNumber = (value, field, line) => {
  const number = Number(value);

  if (!value || !Number.isFinite(number) || number <= 0) {
    throw new Error(`Línea ${line}: ${field} debe ser un número positivo`);
  }

  return number;
};

const parseEnum = (value, field, validValues, line) => {
  if (!value) throw new Error(`Línea ${line}: ${field} es obligatorio`);

  const validValue = validValues.find(
    (option) => option.toLowerCase() === value.toLowerCase(),
  );

  if (!validValue) {
    throw new Error(
      `Línea ${line}: ${field} debe ser ${validValues.join(", ")}`,
    );
  }

  return validValue;
};

const getSalesFromCsv = (salesPath, carsPath) => {
  const saleRows = getRowsFromCsv(salesPath, saleHeaders, "sales.csv");
  const carRows = getRowsFromCsv(carsPath, carHeaders, "cars.csv");
  const usedCarIndexes = new Set();

  return saleRows.map(({ data, line }) => {
    const carIndex = Number(data.carIndex);

    if (!Number.isInteger(carIndex) || carIndex < 1 || carIndex > carRows.length) {
      throw new Error(`Línea ${line}: carIndex no existe en cars.csv`);
    }

    if (usedCarIndexes.has(carIndex)) {
      throw new Error(`Línea ${line}: carIndex ${carIndex} está repetido`);
    }
    usedCarIndexes.add(carIndex);

    const carData = carRows[carIndex - 1].data;
    const listedPrice = Number(carData.price);
    const salePrice = parseNumber(data.salePrice, "salePrice", line);

    if (!Number.isFinite(listedPrice) || listedPrice <= 0) {
      throw new Error(`Línea ${line}: el coche tiene un precio no válido`);
    }

    if (salePrice > listedPrice) {
      throw new Error(
        `Línea ${line}: salePrice supera el precio del coche en cars.csv`,
      );
    }

    return {
      line,
      carData,
      clientEmail: getRequiredValue(
        data.clientEmail,
        "clientEmail",
        line,
      ).toLowerCase(),
      salePrice,
      paymentMethod: parseEnum(
        data.paymentMethod,
        "paymentMethod",
        paymentMethods,
        line,
      ),
      status: parseEnum(data.status, "status", saleStatuses, line),
      notes: data.notes || "",
    };
  });
};

// Comparo los datos estables del CSV para encontrar el coche correcto.
const matchesCsvCar = (car, data) =>
  car.brand === data.brand.toLowerCase() &&
  car.model === data.model &&
  car.year === Number(data.year) &&
  car.mileage === Number(data.mileage) &&
  car.price === Number(data.price) &&
  car.fuel === data.fuel &&
  car.transmission === data.transmission;

const seedSales = async (csvArgument = "data/sales.csv") => {
  if (!process.env.DB_URL) {
    throw new Error("Falta la variable de entorno DB_URL");
  }

  const salesPath = path.resolve(process.cwd(), csvArgument);
  const carsPath = path.resolve(process.cwd(), "data/cars.csv");
  const csvSales = getSalesFromCsv(salesPath, carsPath);

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.DB_URL);
  }

  // Uso el mismo criterio de admin que en el seed de coches.
  const adminFilter = { role: "admin" };
  if (process.env.SEED_ADMIN_EMAIL) {
    adminFilter.email = process.env.SEED_ADMIN_EMAIL.toLowerCase();
  }

  const seller = await User.findOne(adminFilter);
  if (!seller) {
    throw new Error("No se encontró un usuario admin para usar como seller");
  }

  const cars = await Car.find({ owner: seller._id });
  const requestedEmails = [...new Set(csvSales.map((sale) => sale.clientEmail))];
  const clients = await Client.find({ email: { $in: requestedEmails } });

  const sales = csvSales.map((csvSale) => {
    const matchingCars = cars.filter((car) =>
      matchesCsvCar(car, csvSale.carData),
    );

    if (matchingCars.length !== 1) {
      throw new Error(
        `Línea ${csvSale.line}: no se encontró un único coche para carIndex`,
      );
    }

    const matchingClients = clients.filter(
      (client) => client.email === csvSale.clientEmail,
    );

    if (matchingClients.length !== 1) {
      throw new Error(
        `Línea ${csvSale.line}: no se encontró un único clientEmail`,
      );
    }

    const sale = {
      car: matchingCars[0]._id,
      client: matchingClients[0]._id,
      seller: seller._id,
      salePrice: csvSale.salePrice,
      paymentMethod: csvSale.paymentMethod,
      status: csvSale.status,
      notes: csvSale.notes,
    };

    const validationError = new Sale(sale).validateSync();
    if (validationError) {
      throw new Error(`Línea ${csvSale.line}: ${validationError.message}`);
    }

    return sale;
  });

  // Guardo ventas y relaciones juntas para no dejar datos a medias.
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Sale.insertMany(sales, { session });

      const soldCarIds = sales
        .filter((sale) => sale.status === "Completed")
        .map((sale) => sale.car);

      if (soldCarIds.length > 0) {
        await Car.updateMany(
          { _id: { $in: soldCarIds } },
          { $set: { status: "Sold" } },
          { session },
        );
      }

      await Client.bulkWrite(
        sales.map((sale) => ({
          updateOne: {
            filter: { _id: sale.client },
            update: { $addToSet: { interestedCars: sale.car } },
          },
        })),
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  console.log(`${sales.length} ventas importadas correctamente ✅`);
};

if (require.main === module) {
  seedSales(process.argv[2])
    .catch((error) => {
      console.error(`Error importando ventas: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      // Cierro la conexión aunque la importación falle.
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    });
}

module.exports = seedSales;
