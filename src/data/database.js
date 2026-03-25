const sql = require("mssql");
const dbConfig = require("../config/db");

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig);
  }

  return poolPromise;
}

async function initializeDatabase() {
  const pool = await getPool();

  await pool.request().batch(`
    IF OBJECT_ID('dbo.Products', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Products (
        id VARCHAR(24) NOT NULL PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        createdAt DATETIME2 NOT NULL,
        updatedAt DATETIME2 NOT NULL
      );
    END;

    IF OBJECT_ID('dbo.Inventories', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Inventories (
        id VARCHAR(24) NOT NULL PRIMARY KEY,
        product VARCHAR(24) NOT NULL UNIQUE,
        stock INT NOT NULL CONSTRAINT DF_Inventories_Stock DEFAULT 0,
        reserved INT NOT NULL CONSTRAINT DF_Inventories_Reserved DEFAULT 0,
        soldCount INT NOT NULL CONSTRAINT DF_Inventories_SoldCount DEFAULT 0,
        createdAt DATETIME2 NOT NULL,
        updatedAt DATETIME2 NOT NULL,
        CONSTRAINT FK_Inventories_Product FOREIGN KEY (product) REFERENCES dbo.Products(id),
        CONSTRAINT CK_Inventories_Stock CHECK (stock >= 0),
        CONSTRAINT CK_Inventories_Reserved CHECK (reserved >= 0),
        CONSTRAINT CK_Inventories_SoldCount CHECK (soldCount >= 0)
      );
    END;
  `);
}

async function closePool() {
  if (poolPromise) {
    const pool = await poolPromise;
    poolPromise = null;
    await pool.close();
  }
}

module.exports = {
  sql,
  getPool,
  initializeDatabase,
  closePool
};
