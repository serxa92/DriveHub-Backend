const mongoose = require("mongoose");
const Sale = require("../models/sale.model");
const Car = require("../models/car.model");
const Client = require("../models/client.model");
const {
  ACTIVE_SALE_STATUSES,
  RequestError,
  buildSaleData,
  carStatusFromSaleStatuses,
  ensureObjectId,
  handleControllerError,
} = require("../utils/domainValidation");

const syncCarStatus = async (carId, session) => {
  const query = Sale.find({
    car: carId,
    status: { $in: ACTIVE_SALE_STATUSES },
  }).select("status");
  if (session) query.session(session);

  const sales = await query;
  const status = carStatusFromSaleStatuses(sales.map((sale) => sale.status));
  await Car.findByIdAndUpdate(carId, { status }, { session });
};

const validateSaleReferences = async (saleData, session) => {
  const car = await Car.findById(saleData.car).session(session);
  if (!car) throw new RequestError(404, "Coche no encontrado");

  const client = await Client.findById(saleData.client).session(session);
  if (!client) throw new RequestError(404, "Cliente no encontrado");

  if (saleData.salePrice > car.price) {
    throw new RequestError(400, "El precio de venta supera el precio del coche");
  }

  return { car, client };
};

const ensureCarHasNoOtherActiveSale = async (carId, saleId, session) => {
  const filter = {
    car: carId,
    status: { $in: ACTIVE_SALE_STATUSES },
  };
  if (saleId) filter._id = { $ne: saleId };

  const activeSale = await Sale.findOne(filter).session(session);
  if (activeSale) {
    throw new RequestError(409, "El coche ya tiene una venta activa");
  }
};

// GET /sales
const getSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate("car")
      .populate("client")
      .populate("seller", "username email role");

    return res.status(200).json(sales);
  } catch (error) {
    return handleControllerError(res, error, "Error obteniendo ventas");
  }
};

// GET /sales/:id
const getSaleById = async (req, res) => {
  try {
    ensureObjectId(req.params.id);
    const sale = await Sale.findById(req.params.id)
      .populate("car")
      .populate("client")
      .populate("seller", "username email role");

    if (!sale) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    return res.status(200).json(sale);
  } catch (error) {
    return handleControllerError(res, error, "Error obteniendo la venta");
  }
};

// POST /sales
const createSale = async (req, res) => {
  let session;

  try {
    const saleData = buildSaleData(req.body);
    session = await mongoose.startSession();
    let saleId;

    await session.withTransaction(async () => {
      const { car } = await validateSaleReferences(saleData, session);
      const nextStatus = saleData.status || "Pending";

      if (ACTIVE_SALE_STATUSES.includes(nextStatus)) {
        await ensureCarHasNoOtherActiveSale(saleData.car, null, session);
        if (car.status === "Sold") {
          throw new RequestError(409, "El coche ya está vendido");
        }
      }

      const newSale = new Sale({
        ...saleData,
        seller: req.user.id,
      });
      await newSale.save({ session });
      saleId = newSale._id;

      await Client.findByIdAndUpdate(
        saleData.client,
        { $addToSet: { interestedCars: saleData.car } },
        { session },
      );
      await syncCarStatus(saleData.car, session);
    });

    const populatedSale = await Sale.findById(saleId)
      .populate("car")
      .populate("client")
      .populate("seller", "username email role");

    return res.status(201).json(populatedSale);
  } catch (error) {
    return handleControllerError(res, error, "Error creando la venta");
  } finally {
    if (session) await session.endSession();
  }
};

// PUT /sales/:id
const updateSaleById = async (req, res) => {
  let session;

  try {
    ensureObjectId(req.params.id);
    session = await mongoose.startSession();
    const updates = buildSaleData(req.body, { partial: true });
    let updatedSaleId;

    await session.withTransaction(async () => {
      const sale = await Sale.findById(req.params.id).session(session);
      if (!sale) throw new RequestError(404, "Venta no encontrada");

      const previousCar = sale.car.toString();
      const previousStatus = sale.status;
      Object.assign(sale, updates);

      const saleData = {
        car: sale.car,
        client: sale.client,
        salePrice: sale.salePrice,
      };
      const { car } = await validateSaleReferences(saleData, session);

      if (ACTIVE_SALE_STATUSES.includes(sale.status)) {
        await ensureCarHasNoOtherActiveSale(sale.car, sale._id, session);

        const keepsOwnSoldCar =
          previousCar === sale.car.toString() &&
          ACTIVE_SALE_STATUSES.includes(previousStatus);
        if (car.status === "Sold" && !keepsOwnSoldCar) {
          throw new RequestError(409, "El coche ya está vendido");
        }
      }

      await sale.save({ session });
      updatedSaleId = sale._id;

      await Client.findByIdAndUpdate(
        sale.client,
        { $addToSet: { interestedCars: sale.car } },
        { session },
      );
      await syncCarStatus(previousCar, session);
      if (previousCar !== sale.car.toString()) {
        await syncCarStatus(sale.car, session);
      }
    });

    const populatedSale = await Sale.findById(updatedSaleId)
      .populate("car")
      .populate("client")
      .populate("seller", "username email role");

    return res.status(200).json(populatedSale);
  } catch (error) {
    return handleControllerError(res, error, "Error actualizando la venta");
  } finally {
    if (session) await session.endSession();
  }
};

// DELETE /sales/:id
const deleteSaleById = async (req, res) => {
  let session;

  try {
    ensureObjectId(req.params.id);
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const sale = await Sale.findById(req.params.id).session(session);
      if (!sale) throw new RequestError(404, "Venta no encontrada");

      const carId = sale.car;
      await sale.deleteOne({ session });
      await syncCarStatus(carId, session);
    });

    return res.status(200).json({ message: "Venta eliminada correctamente" });
  } catch (error) {
    return handleControllerError(res, error, "Error eliminando la venta");
  } finally {
    if (session) await session.endSession();
  }
};

module.exports = {
  getSales,
  getSaleById,
  createSale,
  updateSaleById,
  deleteSaleById,
};
