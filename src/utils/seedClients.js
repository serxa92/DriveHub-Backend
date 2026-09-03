require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Client = require("../models/client.model");

// Defino las columnas y estados que acepta el modelo.
const headers = ["name", "email", "phone", "city", "status", "notes"];
const statusValues = ["Interested", "Contacted", "Negotiating", "Customer"];

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

const getRequiredValue = (value, field, line) => {
  if (!value) {
    throw new Error(`Línea ${line}: ${field} es obligatorio`);
  }

  return value;
};

// Normalizo el estado para guardarlo como aparece en el modelo.
const parseStatus = (value, line) => {
  if (!value) return "Interested";

  const validStatus = statusValues.find(
    (status) => status.toLowerCase() === value.toLowerCase(),
  );

  if (!validStatus) {
    throw new Error(
      `Línea ${line}: status debe ser ${statusValues.join(", ")}`,
    );
  }

  return validStatus;
};

const getClientsFromCsv = (csvPath) => {
  // Leo el archivo y elimino la marca BOM si existe.
  const content = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(content);

  if (rows.length < 2) {
    throw new Error("El CSV debe incluir la cabecera y al menos un cliente");
  }

  const csvHeaders = rows[0].map((header) => header.toLowerCase());
  const missingHeaders = headers.filter((header) => !csvHeaders.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`Faltan columnas: ${missingHeaders.join(", ")}`);
  }

  // Convierto cada fila en un cliente y guardo su número de línea.
  return rows.slice(1).map((row, index) => {
    const line = index + 2;

    if (row.length !== csvHeaders.length) {
      throw new Error(`Línea ${line}: el número de columnas no coincide`);
    }

    const data = Object.fromEntries(
      csvHeaders.map((header, column) => [header, row[column]]),
    );

    const client = {
      name: getRequiredValue(data.name, "name", line),
      email: getRequiredValue(data.email, "email", line),
      phone: getRequiredValue(data.phone, "phone", line),
      city: data.city || "",
      status: parseStatus(data.status, line),
      notes: data.notes || "",
      interestedCars: [],
    };

    const validationError = new Client(client).validateSync();
    if (validationError) {
      throw new Error(`Línea ${line}: ${validationError.message}`);
    }

    return client;
  });
};

const seedClients = async (csvArgument = "data/clients.csv") => {
  if (!process.env.DB_URL) {
    throw new Error("Falta la variable de entorno DB_URL");
  }

  // Uso el CSV de data por defecto y permito indicar otro si hace falta.
  const csvPath = path.resolve(process.cwd(), csvArgument);
  const clients = getClientsFromCsv(csvPath);

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.DB_URL);
  }

  const createdClients = await Client.insertMany(clients);

  console.log(`${createdClients.length} clientes importados correctamente ✅`);
};

if (require.main === module) {
  seedClients(process.argv[2])
    .catch((error) => {
      console.error(`Error importando clientes: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      // Cierro la conexión aunque la importación falle.
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    });
}

module.exports = seedClients;
