const http = require("node:http");
const { URL } = require("node:url");
const { parseJsonBody, sendJson } = require("./utils/http");
const { createProduct } = require("./services/product.service");
const inventoryService = require("./services/inventory.service");
const { initializeDatabase } = require("./data/database");

function notFound(res) {
  sendJson(res, 404, {
    message: "Route not found"
  });
}

function handleError(res, error) {
  const statusCode = error.statusCode || 500;
  sendJson(res, statusCode, {
    message: error.message || "Internal server error"
  });
}

async function requestHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  try {
    if (req.method === "GET" && pathname === "/") {
      return sendJson(res, 200, {
        message: "Inventory API is running"
      });
    }

    if (req.method === "GET" && pathname === "/favicon.ico") {
      res.writeHead(204);
      return res.end();
    }

    if (req.method === "POST" && pathname === "/products") {
      const body = await parseJsonBody(req);
      const result = await createProduct(body);
      return sendJson(res, 201, result);
    }

    if (req.method === "GET" && pathname === "/inventories") {
      return sendJson(res, 200, await inventoryService.getAllInventories());
    }

    if (req.method === "GET" && pathname.startsWith("/inventories/")) {
      const inventoryId = pathname.split("/")[2];
      return sendJson(res, 200, await inventoryService.getInventoryById(inventoryId));
    }

    if (req.method === "POST" && pathname === "/inventories/add-stock") {
      const body = await parseJsonBody(req);
      return sendJson(res, 200, await inventoryService.addStock(body));
    }

    if (req.method === "POST" && pathname === "/inventories/remove-stock") {
      const body = await parseJsonBody(req);
      return sendJson(res, 200, await inventoryService.removeStock(body));
    }

    if (req.method === "POST" && pathname === "/inventories/reservation") {
      const body = await parseJsonBody(req);
      return sendJson(res, 200, await inventoryService.reservation(body));
    }

    if (req.method === "POST" && pathname === "/inventories/sold") {
      const body = await parseJsonBody(req);
      return sendJson(res, 200, await inventoryService.sold(body));
    }

    return notFound(res);
  } catch (error) {
    return handleError(res, error);
  }
}

const server = http.createServer(requestHandler);
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      server.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Database initialization failed:", error.message);
      process.exit(1);
    });
}

module.exports = {
  server,
  initializeDatabase
};
