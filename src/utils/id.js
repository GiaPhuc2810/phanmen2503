const crypto = require("node:crypto");

function createObjectId() {
  return crypto.randomBytes(12).toString("hex");
}

module.exports = {
  createObjectId
};
