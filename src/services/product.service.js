const { sql, getPool } = require("../data/database");
const { createObjectId } = require("../utils/id");

async function createProduct(payload) {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";

  if (!name) {
    const error = new Error("name is required");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const productId = createObjectId();
  const inventoryId = createObjectId();
  const product = {
    _id: productId,
    name,
    createdAt: now,
    updatedAt: now
  };

  const inventory = {
    _id: inventoryId,
    product: productId,
    stock: 0,
    reserved: 0,
    soldCount: 0,
    createdAt: now,
    updatedAt: now
  };

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    await new sql.Request(transaction)
      .input("id", sql.VarChar(24), product._id)
      .input("name", sql.NVarChar(255), product.name)
      .input("createdAt", sql.DateTime2, new Date(product.createdAt))
      .input("updatedAt", sql.DateTime2, new Date(product.updatedAt))
      .query(`
        INSERT INTO dbo.Products (id, name, createdAt, updatedAt)
        VALUES (@id, @name, @createdAt, @updatedAt)
      `);

    await new sql.Request(transaction)
      .input("id", sql.VarChar(24), inventory._id)
      .input("product", sql.VarChar(24), inventory.product)
      .input("stock", sql.Int, inventory.stock)
      .input("reserved", sql.Int, inventory.reserved)
      .input("soldCount", sql.Int, inventory.soldCount)
      .input("createdAt", sql.DateTime2, new Date(inventory.createdAt))
      .input("updatedAt", sql.DateTime2, new Date(inventory.updatedAt))
      .query(`
        INSERT INTO dbo.Inventories (id, product, stock, reserved, soldCount, createdAt, updatedAt)
        VALUES (@id, @product, @stock, @reserved, @soldCount, @createdAt, @updatedAt)
      `);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return {
    product,
    inventory
  };
}

module.exports = {
  createProduct
};
