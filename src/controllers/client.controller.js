const mongoose = require("mongoose");
const Client = require("../models/client.model");
const Car = require("../models/car.model");
const Sale = require("../models/sale.model");
const {
  RequestError,
  buildClientData,
  ensureObjectId,
  handleControllerError,
} = require("../utils/domainValidation");

const validateInterestedCars = async (carIds) => {
  if (!carIds || carIds.length === 0) return;

  const existingCars = await Car.countDocuments({ _id: { $in: carIds } });
  if (existingCars !== carIds.length) {
    throw new RequestError(400, "Algún interestedCar no existe");
  }
};

// Obtener todos los clientes
const getClients = async (req, res) => {
  try {
    const clients = await Client.find().populate("interestedCars");
    return res.status(200).json(clients);
  } catch (error) {
    return handleControllerError(res, error, "Error obteniendo clientes");
  }
};

// Obtener un cliente por ID
const getClientById = async (req, res) => {
  try {
    ensureObjectId(req.params.id);
    const client = await Client.findById(req.params.id).populate(
      "interestedCars",
    );

    if (!client) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    return res.status(200).json(client);
  } catch (error) {
    return handleControllerError(res, error, "Error obteniendo el cliente");
  }
};

// El formulario público sólo crea datos de contacto.
const createClient = async (req, res) => {
  try {
    const clientData = buildClientData(req.body);
    await validateInterestedCars(clientData.interestedCars);

    const savedClient = await Client.create(clientData);
    return res.status(201).json(savedClient);
  } catch (error) {
    return handleControllerError(res, error, "Error creando el cliente");
  }
};

// Actualizar cliente
const updateClientById = async (req, res) => {
  try {
    ensureObjectId(req.params.id);
    const updates = buildClientData(req.body, {
      partial: true,
      allowStatus: true,
    });
    await validateInterestedCars(updates.interestedCars);

    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true },
    ).populate("interestedCars");

    if (!updatedClient) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    return res.status(200).json(updatedClient);
  } catch (error) {
    return handleControllerError(res, error, "Error actualizando el cliente");
  }
};

// No elimino clientes que forman parte del historial de ventas.
const deleteClientById = async (req, res) => {
  let session;

  try {
    ensureObjectId(req.params.id);
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const client = await Client.findById(req.params.id).session(session);
      if (!client) throw new RequestError(404, "Cliente no encontrado");

      const hasSales = await Sale.exists({ client: client._id }).session(session);
      if (hasSales) {
        throw new RequestError(409, "No se puede eliminar un cliente con ventas");
      }

      await client.deleteOne({ session });
    });

    return res.status(200).json({ message: "Cliente eliminado correctamente" });
  } catch (error) {
    return handleControllerError(res, error, "Error eliminando el cliente");
  } finally {
    if (session) await session.endSession();
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClientById,
  deleteClientById,
};
