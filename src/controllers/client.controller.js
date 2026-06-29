const Client = require("../models/client.model");

// Obtener todos los clientes
const getClients = async (req, res) => {
  try {
    const clients = await Client.find().populate("interestedCars");

    return res.status(200).json(clients);
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving clients",
      error: error.message,
    });
  }
};

// Obtener un cliente por ID
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id).populate("interestedCars");

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    return res.status(200).json(client);
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving client",
      error: error.message,
    });
  }
};

// Crear cliente
const createClient = async (req, res) => {
  try {
    const newClient = new Client(req.body);

    const savedClient = await newClient.save();

    return res.status(201).json(savedClient);
  } catch (error) {
    return res.status(400).json({
      message: "Error creating client",
      error: error.message,
    });
  }
};

// Actualizar cliente
const updateClientById = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedClient = await Client.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedClient) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    return res.status(200).json(updatedClient);
  } catch (error) {
    return res.status(400).json({
      message: "Error updating client",
      error: error.message,
    });
  }
};

// Eliminar cliente
const deleteClientById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedClient = await Client.findByIdAndDelete(id);

    if (!deletedClient) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    return res.status(200).json({
      message: "Client deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting client",
      error: error.message,
    });
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClientById,
  deleteClientById,
};