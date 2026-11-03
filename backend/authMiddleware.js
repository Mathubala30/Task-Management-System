const jwt = require("jsonwebtoken");
const db = require("./database");

// ================================
// VERIFY LOGGED-IN USER
// ================================
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Access denied. Please login."
        });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            message: "JWT secret is not configured"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Check whether the user still exists
        const user = db.prepare(`
            SELECT id, name, email, role
            FROM users
            WHERE id = ?
        `).get(decoded.id);

        if (!user) {
            return res.status(401).json({
                message: "User account not found"
            });
        }

        // Use the latest database details
        req.user = user;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

// ================================
// VERIFY ADMIN
// ================================
const verifyAdmin = (req, res, next) => {

    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            message: "Admin access only"
        });
    }

    next();
};

module.exports = {
    verifyToken,
    verifyAdmin
};