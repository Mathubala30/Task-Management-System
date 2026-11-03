
const express = require("express");
const router = express.Router();

const db = require("../database");
const { verifyToken } = require("../authMiddleware");

// GET: Logged-in user's notifications
router.get("/", verifyToken, (req, res) => {
    try {
        const notifications = db.prepare(`
            SELECT id, title, message, type, is_read, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
        `).all(req.user.id);

        res.json(notifications);
    } catch (error) {
        console.error("Get notifications error:", error);
        res.status(500).json({ message: "Unable to fetch notifications" });
    }
});

// GET: Unread notification count
router.get("/unread-count", verifyToken, (req, res) => {
    try {
        const result = db.prepare(`
            SELECT COUNT(*) AS count
            FROM notifications
            WHERE user_id = ? AND is_read = 0
        `).get(req.user.id);

        res.json({ count: result.count });
    } catch (error) {
        console.error("Unread count error:", error);
        res.status(500).json({ message: "Unable to get unread count" });
    }
});

// POST: Create a notification for the logged-in user
router.post("/", verifyToken, (req, res) => {
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

        const result = db.prepare(`
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (?, ?, ?, ?)
        `).run(req.user.id, title, message, notificationType);

        res.status(201).json({
            message: "Notification created successfully",
            notificationId: result.lastInsertRowid
        });
    } catch (error) {
        console.error("Create notification error:", error);
        res.status(500).json({ message: "Unable to create notification" });
    }
});

// PATCH: Mark a notification as read
router.patch("/:id/read", verifyToken, (req, res) => {
    try {
        const result = db.prepare(`
            UPDATE notifications
            SET is_read = 1
            WHERE id = ? AND user_id = ?
        `).run(req.params.id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        res.json({ message: "Notification marked as read" });
    } catch (error) {
        console.error("Mark notification error:", error);
        res.status(500).json({ message: "Unable to update notification" });
    }
});

// PATCH: Mark all notifications as read
router.patch("/read-all", verifyToken, (req, res) => {
    try {
        db.prepare(`
            UPDATE notifications
            SET is_read = 1
            WHERE user_id = ?
        `).run(req.user.id);

        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("Mark all notifications error:", error);
        res.status(500).json({ message: "Unable to update notifications" });
    }
});

// DELETE: Delete a notification
router.delete("/:id", verifyToken, (req, res) => {
    try {
        const result = db.prepare(`
            DELETE FROM notifications
            WHERE id = ? AND user_id = ?
        `).run(req.params.id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        res.json({ message: "Notification deleted successfully" });
    } catch (error) {
        console.error("Delete notification error:", error);
        res.status(500).json({ message: "Unable to delete notification" });
    }
});

module.exports = router;
