const fs = require("fs");
const crypto = require("crypto");

const path = "src/assets/images/favicon/favicon.ico";

const hash = crypto
  .createHash("md5")
  .update(fs.readFileSync(path))
  .digest("hex")
  .slice(0, 8);

module.exports = {
  hash
};
