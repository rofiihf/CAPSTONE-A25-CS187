const fs = require("fs");
const USERS_DATA = "./data/users_hashed.json";

function readUsers() {
  const raw = fs.readFileSync(USERS_DATA, "utf8");
  return JSON.parse(raw);
}

function findUserByEmail(email) {
  return readUsers().find(u => u.email === email);
}

function findUserById(id) {
  return readUsers().find(u => String(u.id) === String(id));
}

module.exports = {
  findUserByEmail,
  findUserById,
  readUsers,
};

