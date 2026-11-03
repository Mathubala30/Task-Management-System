const jwt = require("jsonwebtoken");
const db = require("./database");

// VERIFY LOGGED-IN USER
const verifyToken = async (req, res, next) => {
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
        const result = await db.query(
            `SELECT id, name, email, role
             FROM users
             WHERE id = $1`,
            [decoded.id]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({
                message: "User account not found"
            });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error("Token verification error:", error);

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};


// VERIFY ADMIN
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