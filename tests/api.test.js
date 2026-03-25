const { once } = require("node:events");
const assert = require("node:assert");
const { server, initializeDatabase } = require("../src/server");
const { getPool, closePool } = require("../src/data/database");

async function request(path, options = {}) {
  const response = await fetch(`http://127.0.0.1:3000${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const body = await response.json();
  return {
    status: response.status,
    body
  };
}

async function run() {
  await initializeDatabase();
  const pool = await getPool();
  await pool.request().batch(`
    DELETE FROM dbo.Inventories;
    DELETE FROM dbo.Products;
  `);

  server.listen(3000);
  await once(server, "listening");

  try {
    const createProductRes = await request("/products", {
      method: "POST",
      body: JSON.stringify({ name: "IPhone 16 Pro" })
    });
    assert.strictEqual(createProductRes.status, 201);
    assert.ok(createProductRes.body.product._id);
    assert.ok(createProductRes.body.inventory._id);
    assert.strictEqual(createProductRes.body.inventory.stock, 0);

    const productId = createProductRes.body.product._id;
    const inventoryId = createProductRes.body.inventory._id;

    const addStockRes = await request("/inventories/add-stock", {
      method: "POST",
      body: JSON.stringify({ product: productId, quantity: 10 })
    });
    assert.strictEqual(addStockRes.status, 200);
    assert.strictEqual(addStockRes.body.stock, 10);

    const removeStockRes = await request("/inventories/remove-stock", {
      method: "POST",
      body: JSON.stringify({ product: productId, quantity: 3 })
    });
    assert.strictEqual(removeStockRes.status, 200);
    assert.strictEqual(removeStockRes.body.stock, 7);

    const reservationRes = await request("/inventories/reservation", {
      method: "POST",
      body: JSON.stringify({ product: productId, quantity: 2 })
    });
    assert.strictEqual(reservationRes.status, 200);
    assert.strictEqual(reservationRes.body.stock, 5);
    assert.strictEqual(reservationRes.body.reserved, 2);

    const soldRes = await request("/inventories/sold", {
      method: "POST",
      body: JSON.stringify({ product: productId, quantity: 1 })
    });
    assert.strictEqual(soldRes.status, 200);
    assert.strictEqual(soldRes.body.reserved, 1);
    assert.strictEqual(soldRes.body.soldCount, 1);

    const getAllRes = await request("/inventories");
    assert.strictEqual(getAllRes.status, 200);
    assert.strictEqual(getAllRes.body.length, 1);
    assert.strictEqual(getAllRes.body[0].product._id, productId);

    const getByIdRes = await request(`/inventories/${inventoryId}`);
    assert.strictEqual(getByIdRes.status, 200);
    assert.strictEqual(getByIdRes.body._id, inventoryId);
    assert.strictEqual(getByIdRes.body.product._id, productId);

    console.log("POSTMAN TEST RESULT");
    console.log(JSON.stringify({
      createProduct: createProductRes.body,
      addStock: addStockRes.body,
      removeStock: removeStockRes.body,
      reservation: reservationRes.body,
      sold: soldRes.body,
      getAll: getAllRes.body,
      getById: getByIdRes.body
    }, null, 2));
  } finally {
    server.close();
    await closePool();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
