const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  buildCarData,
  buildClientData,
  buildSaleData,
  carStatusFromSaleStatuses,
} = require("../src/utils/domainValidation");

test("el formulario público ignora campos administrativos", () => {
  const client = buildClientData({
    name: "Ana Pérez",
    email: "ANA@EXAMPLE.COM",
    phone: "612345678",
    status: "Customer",
    createdAt: "2020-01-01",
  });

  assert.equal(client.email, "ana@example.com");
  assert.equal(client.status, undefined);
  assert.equal(client.createdAt, undefined);
});

test("interestedCars exige ObjectIds válidos y elimina duplicados", () => {
  const carId = new mongoose.Types.ObjectId().toString();
  const client = buildClientData({
    name: "Ana Pérez",
    email: "ana@example.com",
    phone: "612345678",
    interestedCars: [carId, carId],
  });

  assert.deepEqual(client.interestedCars, [carId]);
  assert.throws(
    () =>
      buildClientData({
        name: "Ana Pérez",
        email: "ana@example.com",
        phone: "612345678",
        interestedCars: ["id-invalido"],
      }),
    /interestedCars no es válido/,
  );
});

test("los estados de venta determinan el estado del coche", () => {
  assert.equal(carStatusFromSaleStatuses(["Completed", "Pending"]), "Sold");
  assert.equal(carStatusFromSaleStatuses(["Pending"]), "Reserved");
  assert.equal(carStatusFromSaleStatuses(["Cancelled"]), "Available");
});

test("un coche rechaza valores numéricos incoherentes", () => {
  assert.throws(() => buildCarData({ price: -1 }), /price no puede ser menor/);
  assert.throws(
    () => buildCarData({ price: 10000, mileage: -1 }),
    /mileage no puede ser menor/,
  );
  assert.throws(
    () => buildCarData({ price: 10000, year: 1800 }),
    /year no puede ser menor/,
  );
  assert.throws(
    () => buildCarData({ price: true }),
    /price debe ser un número válido/,
  );
});

test("una venta valida referencias precio y enums", () => {
  const car = new mongoose.Types.ObjectId().toString();
  const client = new mongoose.Types.ObjectId().toString();
  const sale = buildSaleData({
    car,
    client,
    salePrice: "15000",
    paymentMethod: "Financing",
    status: "Pending",
  });

  assert.equal(sale.salePrice, 15000);
  assert.throws(
    () =>
      buildClientData({
        name: "Ana Pérez",
        email: "ana@example.com",
        phone: "-------",
      }),
    /phone no es válido/,
  );
  assert.throws(
    () => buildSaleData({ car: "bad", client, salePrice: 100 }),
    /car no es válido/,
  );
  assert.throws(
    () =>
      buildSaleData({
        car,
        client,
        salePrice: 100,
        paymentMethod: "Crypto",
      }),
    /paymentMethod no es válido/,
  );
  assert.throws(
    () => buildSaleData({ car, client, salePrice: 100, saleDate: "bad" }),
    /saleDate no es válida/,
  );
});
