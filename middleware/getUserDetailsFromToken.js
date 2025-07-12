const jwt = require("jsonwebtoken");
const keys = require("../config/keys");
const User = require("../models/User");
const getUserDetailsFromToken = async (token) => {
  if (!token) {
    return null;
  }
  // Verify token
  try {
    const decode = await jwt.verify(token, keys.secretOrKey); 
    const user = await User.findById(decode?.user?.id).select("-password");
    return user;
  } catch (err) {
    console.log(err);
    return null;
  }
};

module.exports = getUserDetailsFromToken;
