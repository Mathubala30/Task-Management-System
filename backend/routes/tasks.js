const express = require("express");
const db = require("../database");
const { verifyToken } = require("../authMiddleware");

const router = express.Router();

// CREATE NOTIFICATION HELPER
function createNotification(userId, title, message, type = "info") {
    db.prepare(`
        INSERT INTO notifications
        (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
    `).run(userId, title, message, type);
}

// CREATE TASK
router.post("/", verifyToken, (req, res) => {
    try {
        const { title, description, status, due_date } = req.body;
        const user_id = req.user.id;

        if (!title || !title.trim()) {
            return res.status(400).json({
                message: "Task title is required"
            });
        }

        const taskStatus = status || "Pending";

        const result = db.prepare(`
            INSERT INTO tasks
            (title, description, status, user_id, due_date)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            title.trim(),
            description || "",
            taskStatus,
            user_id,
            due_date || null
        );

        createNotification(
            user_id,
            "New Task Created",
            `Your task "${title.trim()}" has been created successfully.`,
            "success"
        );

        res.status(201).json({
            message: "Task created successfully",
            taskId: result.lastInsertRowid
        });

    } catch (error) {
        console.error("Create task error:", error);
        res.status(500).json({
            message: "Unable to create task"
        });
    }
});

// GET LOGGED-IN USER TASKS
router.get("/", verifyToken, (req, res) => {
    const tasks = db.prepare(`
        SELECT * FROM tasks
        WHERE user_id = ?
        ORDER BY id DESC
    `).all(req.user.id);

    res.json(tasks);
});

// UPDATE TASK
router.put("/:id", verifyToken, (req, res) => {
    try {
        const { title, description, status, due_date } = req.body;
        const { id } = req.params;
        const userId = req.user.id;

        if (!title || !title.trim()) {
            return res.status(400).json({
                message: "Task title is required"
            });
        }

        const oldTask = db.prepare(`
            SELECT * FROM tasks
            WHERE id = ? AND user_id = ?
        `).get(id, userId);

        if (!oldTask) {
            return res.status(404).json({
                message: "Task not found for this user"
            });
        }

        const newStatus = status || "Pending";

        const result = db.prepare(`
            UPDATE tasks
            SET title = ?,
                description = ?,
                status = ?,
                due_date = ?
            WHERE id = ? AND user_id = ?
        `).run(
            title.trim(),
            description || "",
            newStatus,
            due_date || null,
            id,
            userId
        );

        if (result.changes === 0) {
            return res.status(404).json({
                message: "Task not found for this user"
            });
        }

        if (
            oldTask.status !== "Completed" &&
            newStatus === "Completed"
        ) {
            createNotification(
                userId,
                "Task Completed!",
                `Great work! You completed "${title.trim()}".`,
                "success"
            );
        }

        res.json({
            message: "Task updated successfully"
        });

    } catch (error) {
        console.error("Update task error:", error);
        res.status(500).json({
            message: "Unable to update task"
        });
    }
});

// DELETE TASK
router.delete("/:id", verifyToken, (req, res) => {
    const { id } = req.params;

    const result = db.prepare(`
        DELETE FROM tasks
        WHERE id = ? AND user_id = ?
    `).run(id, req.user.id);

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Task not found for this user"
        });
    }

    res.json({
        message: "Task deleted successfully"
    });
});

// TASKFLOW SMART ASSISTANT
router.post("/assistant", verifyToken, (req, res) => {
    const message = (req.body.message || "").trim().toLowerCase();
    const userId = req.user.id;

    if (!message) {
        return res.status(400).json({
            reply: "Please enter a message."
        });
    }

    const tasks = db.prepare(`
        SELECT * FROM tasks
        WHERE user_id = ?
        ORDER BY id DESC
    `).all(userId);

    // MARK TASK AS COMPLETED
    // Keep this before the general completed-task search.
    if (message.includes("mark") && message.includes("completed")) {
        const task = tasks.find(t =>
            message.includes(t.title.toLowerCase())
        );

        if (!task) {
            return res.json({
                reply: "I couldn't find that task. Please enter its exact title."
            });
        }

        if (task.status !== "Completed") {
            db.prepare(`
                UPDATE tasks
                SET status = 'Completed'
                WHERE id = ? AND user_id = ?
            `).run(task.id, userId);

            createNotification(
                userId,
                "Task Completed!",
                `Great work! You completed "${task.title}".`,
                "success"
            );
        }

        return res.json({
            reply: `"${task.title}" marked as completed!`
        });
    }

    // SHOW PENDING TASKS
    if (message.includes("pending")) {
        const pending = tasks.filter(
            task => task.status === "Pending"
        );

        return res.json({
            reply: pending.length
                ? "Here are your pending tasks:"
                : "You have no pending tasks!",
            tasks: pending
        });
    }

    // SHOW COMPLETED TASKS
    if (message.includes("completed")) {
        const completed = tasks.filter(
            task => task.status === "Completed"
        );

        return res.json({
            reply: completed.length
                ? "Here are your completed tasks:"
                : "You have no completed tasks yet!",
            tasks: completed
        });
    }

    // SEARCH TASK
    const matchedTask = tasks.find(t =>
        message.includes(t.title.toLowerCase())
    );

    if (matchedTask) {
        return res.json({
            reply: `I found your task: ${matchedTask.title}. Status: ${matchedTask.status}.`,
            tasks: [matchedTask]
        });
    }

    // GENERAL TASK SUMMARY
    if (message.includes("today") || message.includes("suggest")) {
        const pending = tasks.filter(
            task => task.status !== "Completed"
        );

        return res.json({
            reply: pending.length
                ? "Here are your unfinished tasks. You can start with one of these:"
                : "Great! All your tasks are completed.",
            tasks: pending
        });
    }

    return res.json({
        reply: "I can help you find pending tasks, completed tasks, search tasks, and update task status. Try asking me!"
    });
});

// GET SUBTASKS FOR A TASK
router.get("/:id/subtasks", verifyToken, (req, res) => {
    const task = db.prepare(`
        SELECT id FROM tasks
        WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!task) {
        return res.status(404).json({
            message: "Task not found."
        });
    }

    const subtasks = db.prepare(`
        SELECT id, task_id, title, is_completed
        FROM subtasks
        WHERE task_id = ? AND user_id = ?
        ORDER BY id ASC
    `).all(req.params.id, req.user.id);

    res.json(subtasks);
});

// UPDATE SUBTASK COMPLETION
router.patch("/:taskId/subtasks/:subtaskId", verifyToken, (req, res) => {
    const { taskId, subtaskId } = req.params;
    const { is_completed } = req.body;

    if (typeof is_completed !== "boolean") {
        return res.status(400).json({
            message: "A valid completion status is required."
        });
    }

    const result = db.prepare(`
        UPDATE subtasks
        SET is_completed = ?
        WHERE id = ? AND task_id = ? AND user_id = ?
    `).run(
        is_completed ? 1 : 0,
        subtaskId,
        taskId,
        req.user.id
    );

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Subtask not found."
        });
    }

    const progress = db.prepare(`
        SELECT
            COUNT(*) AS total,
            SUM(is_completed) AS completed
        FROM subtasks
        WHERE task_id = ? AND user_id = ?
    `).get(taskId, req.user.id);

    res.json({
        message: "Progress updated successfully!",
        total: progress.total,
        completed: progress.completed || 0
    });
});

module.exports = router;