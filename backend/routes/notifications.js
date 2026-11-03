const express = require("express");
const router = express.Router();

const db = require("../database");
const { verifyToken } = require("../authMiddleware");

// GET: Logged-in user's notifications
router.get("/", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, title, message, type, is_read, created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Get notifications error:", error);

        res.status(500).json({
            message: "Unable to fetch notifications"
        });
    }
});

// GET: Unread notification count
router.get("/unread-count", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT COUNT(*) AS count
             FROM notifications
             WHERE user_id = $1 AND is_read = FALSE`,
            [req.user.id]
        );

        res.json({
            count: Number(result.rows[0].count)
        });

    } catch (error) {
        console.error("Unread count error:", error);

        res.status(500).json({
            message: "Unable to get unread count"
        });
    }
});

// POST: Create a notification
router.post("/", verifyToken, async (req, res) => {
    try {
        const { title, message, type } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                message: "Title and message are required"
            });
        }

        const validTypes = ["info", "success", "warning", "error"];

        const notificationType = validTypes.includes(type)
            ? type
            : "info";

        const result = await db.query(
            `INSERT INTO notifications
             (user_id, title, message, type)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [req.user.id, title, message, notificationType]
        );

        res.status(201).json({
            message: "Notification created successfully",
            notificationId: result.rows[0].id
        });

    } catch (error) {
        console.error("Create notification error:", error);

        res.status(500).json({
            message: "Unable to create notification"
        });
    }
});

// PATCH: Mark a notification as read
router.patch("/:id/read", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE id = $1 AND user_id = $2`,
            [req.params.id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        res.json({
            message: "Notification marked as read"
        });

    } catch (error) {
        console.error("Mark notification error:", error);

        res.status(500).json({
            message: "Unable to update notification"
        });
    }
});

// PATCH: Mark all notifications as read
router.patch("/read-all", verifyToken, async (req, res) => {
    try {
        await db.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE user_id = $1`,
            [req.user.id]
        );

        res.json({
            message: "All notifications marked as read"
        });

    } catch (error) {
        console.error("Mark all notifications error:", error);

        res.status(500).json({
            message: "Unable to update notifications"
        });
    }
});

// DELETE: Delete a notification
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `DELETE FROM notifications
             WHERE id = $1 AND user_id = $2`,
            [req.params.id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        res.json({
            message: "Notification deleted successfully"
        });

    } catch (error) {
        console.error("Delete notification error:", error);

        res.status(500).json({
            message: "Unable to delete notification"
        });
    }
});

module.exports = router;