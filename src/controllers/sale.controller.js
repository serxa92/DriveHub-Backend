const Sale = require("../models/sale.model");
const Car = require("../models/car.model");

// GET /sales
const getSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate("car")
      .populate("client")
      .populate("seller", "username email role");

    return res.status(200).json(sales);
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving sales",
      error: error.message,
    });
  }
};

// GET /sales/:id
const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findById(id)
      .populate("car")
      .populate("client")
      .populate("seller", "username email role");

    if (!sale) {
      return res.status(404).json({
        message: "Sale not found",
      });
    }

    return res.status(200).json(sale);
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving sale",
      error: error.message,
    });
  }
};

// POST /sales
const createSale = async (req, res) => {
  try {
    const { car, client, seller, salePrice, paymentMethod, status, notes } =
      req.body;

    const newSale = await Sale.create({
      car,
      client,
      seller,
      salePrice,
      paymentMethod,
      status,
      notes,
    });

    if (status === "Completed") {
      await Car.findByIdAndUpdate(car, { status: "Sold" });
    }

    const populatedSale = await Sale.findById(newSale._id)
      .populate("car")
      .populate("client")
      .populate("seller", "username email role");

    return res.status(201).json(populatedSale);
  } catch (error) {
    return res.status(400).json({
      message: "Error creating sale",
      error: error.message,
    });
  }
};

// PUT /sales/:id
const updateSaleById = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedSale = await Sale.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("car")
      .populate("client")
      .populate("seller", "username email role");

    if (!updatedSale) {
      return res.status(404).json({
        message: "Sale not found",
      });
    }

    if (updatedSale.status === "Completed") {
      await Car.findByIdAndUpdate(updatedSale.car._id, { status: "Sold" });
    }

    return res.status(200).json(updatedSale);
  } catch (error) {
    return res.status(400).json({
      message: "Error updating sale",
      error: error.message,
    });
  }
};

// DELETE /sales/:id
const deleteSaleById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSale = await Sale.findByIdAndDelete(id);

    if (!deletedSale) {
      return res.status(404).json({
        message: "Sale not found",
      });
    }

    return res.status(200).json({
      message: "Sale deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting sale",
      error: error.message,
    });
  }
};

module.exports = {
  getSales,
  getSaleById,
  createSale,
  updateSaleById,
  deleteSaleById,
};