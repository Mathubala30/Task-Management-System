const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const db = require("../database");

const {
    verifyToken,
    verifyAdmin
} = require("../authMiddleware");

const router = express.Router();

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

const createToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
};

const sendLoginResponse = (res, user) => {
    const token = createToken(user);

    return res.json({
        message: "Login successful",
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });
};


// REGISTER - ALL NEW USERS GET USER ROLE
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters"
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);

        const result = db.prepare(`
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, 'user')
        `).run(
            name.trim(),
            email.trim().toLowerCase(),
            hashedPassword
        );

        res.status(201).json({
            message: "User registered successfully",
            userId: result.lastInsertRowid
        });

    } catch (error) {
        console.error("Registration error:", error);

        res.status(400).json({
            message: "Unable to register. Email may already exist."
        });
    }
});


// EMAIL AND PASSWORD LOGIN
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    try {
        const user = db.prepare(`
            SELECT * FROM users WHERE email = ?
        `).get(email.trim().toLowerCase());

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        return sendLoginResponse(res, user);

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Unable to login"
        });
    }
});


// GOOGLE LOGIN
router.post("/google", async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({
            message: "Google credential is required"
        });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(500).json({
            message: "Google authentication is not configured"
        });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (
            !payload ||
            !payload.sub ||
            !payload.email ||
            payload.email_verified !== true
        ) {
            return res.status(401).json({
                message: "Google account verification failed"
            });
        }

        const googleId = payload.sub;
        const email = payload.email.toLowerCase();

        let user = db.prepare(`
            SELECT * FROM users
            WHERE google_id = ?
        `).get(googleId);

        if (!user) {
            user = db.prepare(`
                SELECT * FROM users
                WHERE email = ?
            `).get(email);

            if (user) {
                // Link only an already existing account
                db.prepare(`
                    UPDATE users
                    SET google_id = ?
                    WHERE id = ?
                `).run(googleId, user.id);

                user = db.prepare(`
                    SELECT * FROM users WHERE id = ?
                `).get(user.id);

            } else {
                // New Google users always receive normal user role
                const result = db.prepare(`
                    INSERT INTO users
                    (name, email, password, role, google_id)
                    VALUES (?, ?, ?, 'user', ?)
                `).run(
                    payload.name || email.split("@")[0],
                    email,
                    await bcrypt.hash(
                        require("crypto").randomBytes(32).toString("hex"),
                        12
                    ),
                    googleId
                );

                user = db.prepare(`
                    SELECT * FROM users WHERE id = ?
                `).get(result.lastInsertRowid);
            }
        }

        return sendLoginResponse(res, user);

    } catch (error) {
        console.error("Google login error:", error);

        res.status(401).json({
            message: "Google authentication failed"
        });
    }
});


// UPDATE USER PROFILE
router.put("/users/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, password } = req.body;

    if (
        req.user.role !== "admin" &&
        req.user.id !== Number(id)
    ) {
        return res.status(403).json({
            message: "You cannot update another user's profile"
        });
    }

    if (!name || !email) {
        return res.status(400).json({
            message: "Name and email are required"
        });
    }

    if (password && password.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters"
        });
    }

    try {
        const user = db.prepare(
            "SELECT * FROM users WHERE id = ?"
        ).get(id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const newPassword = password
            ? await bcrypt.hash(password, 12)
            : user.password;

        db.prepare(`
            UPDATE users
            SET name = ?, email = ?, password = ?
            WHERE id = ?
        `).run(
            name.trim(),
            email.trim().toLowerCase(),
            newPassword,
            id
        );

        res.json({
            message: "User updated successfully"
        });

    } catch (error) {
        console.error("Profile update error:", error);

        res.status(400).json({
            message: "Unable to update user. Email may already exist."
        });
    }
});


// GET ALL USERS - ADMIN ONLY
router.get(
    "/users",
    verifyToken,
    verifyAdmin,
    (req, res) => {
        try {
            const users = db.prepare(`
                SELECT id, name, email, role
                FROM users
                ORDER BY id DESC
            `).all();

            res.json(users);

        } catch (error) {
            console.error("Fetch users error:", error);

            res.status(500).json({
                message: "Unable to fetch users"
            });
        }
    }
);


// DELETE USER - ADMIN ONLY
router.delete(
    "/users/:id",
    verifyToken,
    verifyAdmin,
    (req, res) => {
        const { id } = req.params;

        if (req.user.id === Number(id)) {
            return res.status(403).json({
                message: "You cannot delete your own admin account"
            });
        }

        try {
            const result = db.prepare(
                "DELETE FROM users WHERE id = ?"
            ).run(id);

            if (result.changes === 0) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            res.json({
                message: "User deleted successfully"
            });

        } catch (error) {
            console.error("Delete user error:", error);

            res.status(500).json({
                message: "Unable to delete user"
            });
        }
    }
);

module.exports = router;