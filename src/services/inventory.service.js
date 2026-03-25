const { sql, getPool } = require("../data/database");

function toInventoryView(row) {
  return {
    _id: row.inventoryId,
    product: row.productId
      ? {
          _id: row.productId,
          name: row.productName,
          createdAt: row.productCreatedAt instanceof Date ? row.productCreatedAt.toISOString() : row.productCreatedAt,
          updatedAt: row.productUpdatedAt instanceof Date ? row.productUpdatedAt.toISOString() : row.productUpdatedAt
        }
      : null,
    stock: row.stock,
    reserved: row.reserved,
    soldCount: row.soldCount,
    createdAt: row.inventoryCreatedAt instanceof Date ? row.inventoryCreatedAt.toISOString() : row.inventoryCreatedAt,
    updatedAt: row.inventoryUpdatedAt instanceof Date ? row.inventoryUpdatedAt.toISOString() : row.inventoryUpdatedAt
  };
}

async function ensureProduct(productId) {
  if (!productId) {
    const error = new Error("inventory not found for product");
    error.statusCode = 404;
    throw error;
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("productId", sql.VarChar(24), productId)
    .query("SELECT id FROM dbo.Products WHERE id = @productId");

  if (result.recordset.length === 0) {
    const error = new Error("product not found");
    error.statusCode = 404;
    throw error;
  }
}

function validateQuantity(quantity) {
  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) {
    const error = new Error("quantity must be a number greater than 0");
    error.statusCode = 400;
    throw error;
  }
}

async function getAllInventories() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      i.id AS inventoryId,
      i.stock,
      i.reserved,
      i.soldCount,
      i.createdAt AS inventoryCreatedAt,
      i.updatedAt AS inventoryUpdatedAt,
      p.id AS productId,
      p.name AS productName,
      p.createdAt AS productCreatedAt,
      p.updatedAt AS productUpdatedAt
    FROM dbo.Inventories i
    INNER JOIN dbo.Products p ON p.id = i.product
    ORDER BY i.createdAt DESC
  `);

  return result.recordset.map(toInventoryView);
}

async function getInventoryById(inventoryId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("inventoryId", sql.VarChar(24), inventoryId)
    .query(`
      SELECT
        i.id AS inventoryId,
        i.stock,
        i.reserved,
        i.soldCount,
        i.createdAt AS inventoryCreatedAt,
        i.updatedAt AS inventoryUpdatedAt,
        p.id AS productId,
        p.name AS productName,
        p.createdAt AS productCreatedAt,
        p.updatedAt AS productUpdatedAt
      FROM dbo.Inventories i
      INNER JOIN dbo.Products p ON p.id = i.product
      WHERE i.id = @inventoryId
    `);

  if (result.recordset.length === 0) {
    const error = new Error("inventory not found");
    error.statusCode = 404;
    throw error;
  }

  return toInventoryView(result.recordset[0]);
}

async function getInventoryRowByProductId(productId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("productId", sql.VarChar(24), productId)
    .query(`
      SELECT
        i.id AS inventoryId,
        i.product,
        i.stock,
        i.reserved,
        i.soldCount,
        i.createdAt AS inventoryCreatedAt,
        i.updatedAt AS inventoryUpdatedAt
      FROM dbo.Inventories i
      WHERE i.product = @productId
    `);

  if (result.recordset.length === 0) {
    const error = new Error("inventory not found for product");
    error.statusCode = 404;
    throw error;
  }

  return result.recordset[0];
}

async function addStock({ product, quantity }) {
  await ensureProduct(product);
  validateQuantity(quantity);

  const pool = await getPool();
  await pool
    .request()
    .input("productId", sql.VarChar(24), product)
    .input("quantity", sql.Int, quantity)
    .query(`
      UPDATE dbo.Inventories
      SET stock = stock + @quantity, updatedAt = SYSUTCDATETIME()
      WHERE product = @productId
    `);

  const inventory = await getInventoryRowByProductId(product);
  return getInventoryById(inventory.inventoryId);
}

async function removeStock({ product, quantity }) {
  await ensureProduct(product);
  validateQuantity(quantity);

  const inventory = await getInventoryRowByProductId(product);

  if (inventory.stock < quantity) {
    const error = new Error("insufficient stock");
    error.statusCode = 400;
    throw error;
  }

  const pool = await getPool();
  await pool
    .request()
    .input("productId", sql.VarChar(24), product)
    .input("quantity", sql.Int, quantity)
    .query(`
      UPDATE dbo.Inventories
      SET stock = stock - @quantity, updatedAt = SYSUTCDATETIME()
      WHERE product = @productId
    `);

  return getInventoryById(inventory.inventoryId);
}

async function reservation({ product, quantity }) {
  await ensureProduct(product);
  validateQuantity(quantity);

  const inventory = await getInventoryRowByProductId(product);

  if (inventory.stock < quantity) {
    const error = new Error("insufficient stock");
    error.statusCode = 400;
    throw error;
  }

  const pool = await getPool();
  await pool
    .request()
    .input("productId", sql.VarChar(24), product)
    .input("quantity", sql.Int, quantity)
    .query(`
      UPDATE dbo.Inventories
      SET
        stock = stock - @quantity,
        reserved = reserved + @quantity,
        updatedAt = SYSUTCDATETIME()
      WHERE product = @productId
    `);

  return getInventoryById(inventory.inventoryId);
}

async function sold({ product, quantity }) {
  await ensureProduct(product);
  validateQuantity(quantity);

  const inventory = await getInventoryRowByProductId(product);

  if (inventory.reserved < quantity) {
    const error = new Error("insufficient reserved quantity");
    error.statusCode = 400;
    throw error;
  }

  const pool = await getPool();
  await pool
    .request()
    .input("productId", sql.VarChar(24), product)
    .input("quantity", sql.Int, quantity)
    .query(`
      UPDATE dbo.Inventories
      SET
        reserved = reserved - @quantity,
        soldCount = soldCount + @quantity,
        updatedAt = SYSUTCDATETIME()
      WHERE product = @productId
    `);

  return getInventoryById(inventory.inventoryId);
}

module.exports = {
  getAllInventories,
  getInventoryById,
  addStock,
  removeStock,
  reservation,
  sold
};
