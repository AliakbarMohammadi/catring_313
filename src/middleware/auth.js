const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'دسترسی غیرمجاز' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'توکن نامعتبر است' });
        }

        User.findById(decoded.id, (err, user) => {
            if (err || !user) {
                return res.status(404).json({ message: 'کاربر پیدا نشد' });
            }

            req.user = user;
            next();
        });
    });
};

module.exports = authMiddleware;