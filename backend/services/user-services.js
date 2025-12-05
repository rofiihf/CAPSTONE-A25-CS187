const { User } = require("../models/user.js");
import bcrypt from "bcrypt";

export const findUserById = async (id) => {
  return await User.findOne({ where: { id }});
};
