// utils/generateToken.js
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d', // توکن تا ۳۰ روز معتبر است
  });
};

module.exports = generateToken;