const mongoose = require("mongoose");
const Car = require("../models/car.model");
const User = require("../models/user.model");
const Client = require("../models/client.model");
const Sale = require("../models/sale.model");
const { cloudinary } = require("../middlewares/upload");
const {
  RequestError,
  buildCarData,
  ensureObjectId,
  handleControllerError,
} = require("../utils/domainValidation");

const removeCloudinaryFiles = async (files = []) => {
  const validFiles = files.filter((file) => file && file.filename);
  const results = await Promise.allSettled(
    validFiles.map((file) => cloudinary.uploader.destroy(file.filename)),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `No se pudo limpiar ${validFiles[index].filename} de Cloudinary`,
      );
    }
  });
};

const getUploadedImages = (files = []) =>
  files.map((file, index) => ({
    url: file.path,
    publicId: file.filename,
    isCover: index === 0,
  }));

// GET /cars
const getCars = async (req, res) => {
  try {
    const cars = await Car.find();
    return res.status(200).json(cars);
  } catch (error) {
    return handleControllerError(res, error, "Error obteniendo los coches");
  }
};

// POST /cars
const createCar = async (req, res) => {
  let session;
  let savedCar;
  let committed = false;

  try {
    const carData = buildCarData(req.body);
    const images = getUploadedImages(req.files);
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      [savedCar] = await Car.create(
        [
          {
            ...carData,
            images,
            owner: req.user.id,
            status: "Available",
          },
        ],
        { session },
      );

      const owner = await User.findByIdAndUpdate(
        req.user.id,
        { $addToSet: { cars: savedCar._id } },
        { session },
      );
      if (!owner) throw new RequestError(401, "Usuario no válido");
    });
    committed = true;

    return res.status(201).json({
      data: savedCar,
      info: `Car created on: ${new Date(
        savedCar.createdAt,
      ).toLocaleDateString("en-US")}`,
    });
  } catch (error) {
    if (!committed) await removeCloudinaryFiles(req.files);
    return handleControllerError(res, error, "Error creando el coche");
  } finally {
    if (session) await session.endSession();
  }
};

// GET /cars/:id
const getCarById = async (req, res) => {
  try {
    ensureObjectId(req.params.id);
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({ message: "Coche no encontrado" });
    }
    return res.status(200).json(car);
  } catch (error) {
    return handleControllerError(res, error, "Error obteniendo el coche");
  }
};

// PUT /cars/:id
const updateCarById = async (req, res) => {
  let saved = false;

  try {
    ensureObjectId(req.params.id);
    const updates = buildCarData(req.body, { partial: true });
    const car = await Car.findById(req.params.id);

    if (!car) {
      throw new RequestError(404, "Coche no encontrado");
    }

    Object.assign(car, updates);

    if (req.files && req.files.length > 0) {
      const hasCover = car.images.some((image) => image.isCover);
      const newImages = req.files.map((file, index) => ({
        url: file.path,
        publicId: file.filename,
        isCover: !hasCover && index === 0,
      }));
      car.images.push(...newImages);
    }

    const updatedCar = await car.save();
    saved = true;
    return res.status(200).json(updatedCar);
  } catch (error) {
    if (!saved) await removeCloudinaryFiles(req.files);
    return handleControllerError(res, error, "Error actualizando el coche");
  }
};

// DELETE /cars/:id/images
const deleteCarImage = async (req, res) => {
  try {
    ensureObjectId(req.params.id);
    const { publicId } = req.body || {};

    if (typeof publicId !== "string" || !publicId.trim()) {
      throw new RequestError(400, "publicId es obligatorio");
    }

    const car = await Car.findById(req.params.id);
    if (!car) throw new RequestError(404, "Coche no encontrado");

    const originalImages = car.images.map((image) => image.toObject());
    const imageIndex = car.images.findIndex(
      (image) => image.publicId === publicId,
    );
    if (imageIndex === -1) {
      throw new RequestError(404, "Imagen no encontrada");
    }

    const wasCover = car.images[imageIndex].isCover;
    car.images.splice(imageIndex, 1);

    if (wasCover && car.images.length > 0) {
      car.images.forEach((image, index) => {
        image.isCover = index === 0;
      });
    }

    await car.save();

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      // Recupero la referencia si Cloudinary no pudo eliminar el archivo.
      car.images = originalImages;
      await car.save();
      throw error;
    }

    return res.status(200).json(car);
  } catch (error) {
    return handleControllerError(res, error, "Error eliminando la imagen");
  }
};

// PUT /cars/:id/images/cover
const setCarCover = async (req, res) => {
  try {
    ensureObjectId(req.params.id);
    const { publicId } = req.body || {};

    if (typeof publicId !== "string" || !publicId.trim()) {
      throw new RequestError(400, "publicId es obligatorio");
    }

    const car = await Car.findById(req.params.id);
    if (!car) throw new RequestError(404, "Coche no encontrado");

    const imageExists = car.images.some(
      (image) => image.publicId === publicId,
    );
    if (!imageExists) throw new RequestError(404, "Imagen no encontrada");

    car.images.forEach((image) => {
      image.isCover = image.publicId === publicId;
    });

    const updatedCar = await car.save();
    return res.status(200).json(updatedCar);
  } catch (error) {
    return handleControllerError(res, error, "Error cambiando la portada");
  }
};

// DELETE /cars/:id
const deleteCarById = async (req, res) => {
  let session;
  let imageFiles = [];

  try {
    ensureObjectId(req.params.id);
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const car = await Car.findById(req.params.id).session(session);
      if (!car) throw new RequestError(404, "Coche no encontrado");

      const hasSales = await Sale.exists({ car: car._id }).session(session);
      if (hasSales) {
        throw new RequestError(409, "No se puede eliminar un coche con ventas");
      }

      imageFiles = car.images.map((image) => ({ filename: image.publicId }));
      await car.deleteOne({ session });
      await Client.updateMany(
        { interestedCars: car._id },
        { $pull: { interestedCars: car._id } },
        { session },
      );
      await User.updateMany(
        { cars: car._id },
        { $pull: { cars: car._id } },
        { session },
      );
    });

    await removeCloudinaryFiles(imageFiles);
    return res.status(200).json({ message: "Coche eliminado correctamente" });
  } catch (error) {
    return handleControllerError(res, error, "Error eliminando el coche");
  } finally {
    if (session) await session.endSession();
  }
};

// GET /cars/brand/:brand
const getCarByBrand = async (req, res) => {
  try {
    const brand = req.params.brand.toLowerCase();
    const cars = await Car.find({ brand });
    if (cars.length === 0) {
      return res.status(404).json({ message: "No hay coches de esa marca" });
    }
    return res.status(200).json(cars);
  } catch (error) {
    return handleControllerError(res, error, "Error buscando los coches");
  }
};

module.exports = {
  getCars,
  createCar,
  getCarById,
  updateCarById,
  deleteCarImage,
  setCarCover,
  deleteCarById,
  getCarByBrand,
};
