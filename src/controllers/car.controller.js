const Car = require("../models/car.model");
const User = require("../models/user.model");

// GET /cars
const getCars = async (req, res) => {
  try {
    const cars = await Car.find();
    res.status(200).json(cars);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo todos los coches❌" });
  }
};

// POST /cars (crea coche y lo asocia al usuario)
const createCar = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1) Crear coche
    const savedCar = await Car.create({
      ...req.body,
      owner: userId,
    });

    // 2) Guardar referencia en el usuario SIN duplicados
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { cars: savedCar._id } }, // evita duplicados
      { new: true },
    );

    return res.status(201).json({
      data: savedCar,
      info: `Coche creado el: ${new Date(savedCar.createdAt).toLocaleDateString("es-ES")}`,
    });
  } catch (error) {
    console.error("❌Error al crear el coche:", error);
    return res.status(500).json({
      error: "❌Error al crear el coche",
      detail: error.message,
    });
  }
};
// =======================
// GET /cars/:id
// =======================
const getCarById = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({ error: "Coche no encontrado❌" });
    }
    return res.status(200).json(car);
  } catch (error) {
    res.status(500).json({ error: "❌Error al obtener el coche" });
  }
};
// =======================
// PUT /cars/:id
// =======================
const updateCarById = async (req, res) => {
  try {
    const updatedCar = await Car.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedCar) {
      return res.status(404).json({ message: "Coche no encontrado❌" });
    }

    return res.status(200).json(updatedCar);
  } catch (error) {
    res.status(500).json({
      error: "❌Error al actualizar el coche",
    });
  }
};
// =======================
// DELETE /cars/:id
// =======================
const deleteCarById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCar = await Car.findByIdAndDelete(id);

    if (!deletedCar) {
      return res.status(404).json({ message: "Coche no encontrado❌" });
    }

    res.status(200).json({ message: "Coche eliminado correctamente 🗑️" });
  } catch (error) {
    res.status(500).json({ error: "❌Error al eliminar el coche" });
  }
};

// =======================
// GET by brand /cars/brand/:brand
// =======================

const getCarByBrand = async (req, res) => {
  try {
    const brand = req.params.brand.toLowerCase();
    const cars = await Car.find({ brand });
    if (cars.length === 0) {
      return res
        .status(404)
        .json({ message: "No hay coches de esa marca en la base de datos❌" });
    }
    return res.status(200).json(cars);
  } catch (error) {
    res.status(500).json({ error: "Error encontrando los coches" });
  }
};

module.exports = {
  getCars,
  createCar,
  getCarById,
  updateCarById,
  deleteCarById,
  getCarByBrand,
};
