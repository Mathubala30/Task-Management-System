const express = require("express");
const db = require("../database");
const { verifyToken } = require("../authMiddleware");

const router = express.Router();

// CREATE NOTIFICATION HELPER
async function createNotification(userId, title, message, type = "info") {
    await db.query(
        `INSERT INTO notifications
         (user_id, title, message, type)
         VALUES ($1, $2, $3, $4)`,
        [userId, title, message, type]
    );
}

// CREATE TASK
router.post("/", verifyToken, async (req, res) => {
    try {
        const { title, description, status, due_date } = req.body;
        const userId = req.user.id;

        if (!title || !title.trim()) {
            return res.status(400).json({
                message: "Task title is required"
            });
        }

        const taskStatus = status || "Pending";

        const result = await db.query(
            `INSERT INTO tasks
             (title, description, status, user_id, due_date)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
                title.trim(),
                description || "",
                taskStatus,
                userId,
                due_date || null
            ]
        );

        await createNotification(
            userId,
            "New Task Created",
            `Your task "${title.trim()}" has been created successfully.`,
            "success"
        );

        res.status(201).json({
            message: "Task created successfully",
            taskId: result.rows[0].id
        });

    } catch (error) {
        console.error("Create task error:", error);

        res.status(500).json({
            message: "Unable to create task"
        });
    }
});

// GET LOGGED-IN USER TASKS
router.get("/", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM tasks
             WHERE user_id = $1
             ORDER BY id DESC`,
            [req.user.id]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Fetch tasks error:", error);

        res.status(500).json({
            message: "Unable to fetch tasks"
        });
    }
});

// UPDATE TASK
router.put("/:id", verifyToken, async (req, res) => {
    try {
        const { title, description, status, due_date } = req.body;
        const { id } = req.params;
        const userId = req.user.id;

        if (!title || !title.trim()) {
            return res.status(400).json({
                message: "Task title is required"
            });
        }

        const oldResult = await db.query(
            `SELECT * FROM tasks
             WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );

        const oldTask = oldResult.rows[0];

        if (!oldTask) {
            return res.status(404).json({
                message: "Task not found for this user"
            });
        }

        const newStatus = status || "Pending";

        await db.query(
            `UPDATE tasks
             SET title = $1,
                 description = $2,
                 status = $3,
                 due_date = $4
             WHERE id = $5 AND user_id = $6`,
            [
                title.trim(),
                description || "",
                newStatus,
                due_date || null,
                id,
                userId
            ]
        );

        if (
            oldTask.status !== "Completed" &&
            newStatus === "Completed"
        ) {
            await createNotification(
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
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `DELETE FROM tasks
             WHERE id = $1 AND user_id = $2`,
            [req.params.id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Task not found for this user"
            });
        }

        res.json({
            message: "Task deleted successfully"
        });

    } catch (error) {
        console.error("Delete task error:", error);

        res.status(500).json({
            message: "Unable to delete task"
        });
    }
});

// TASKFLOW SMART ASSISTANT
router.post("/assistant", verifyToken, async (req, res) => {
    try {
        const message = (req.body.message || "").trim().toLowerCase();
        const userId = req.user.id;

        if (!message) {
            return res.status(400).json({
                reply: "Please enter a message."
            });
        }

        const result = await db.query(
            `SELECT * FROM tasks
             WHERE user_id = $1
             ORDER BY id DESC`,
            [userId]
        );

        const tasks = result.rows;

        // MARK TASK AS COMPLETED
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
                await db.query(
                    `UPDATE tasks
                     SET status = 'Completed'
                     WHERE id = $1 AND user_id = $2`,
                    [task.id, userId]
                );

                await createNotification(
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

    } catch (error) {
        console.error("Assistant error:", error);

        res.status(500).json({
            reply: "Unable to process your request."
        });
    }
});

// GET SUBTASKS FOR A TASK
router.get("/:id/subtasks", verifyToken, async (req, res) => {
    try {
        const taskResult = await db.query(
            `SELECT id FROM tasks
             WHERE id = $1 AND user_id = $2`,
            [req.params.id, req.user.id]
        );

        if (taskResult.rows.length === 0) {
            return res.status(404).json({
                message: "Task not found."
            });
        }

        const result = await db.query(
            `SELECT id, task_id, title, is_completed
             FROM subtasks
             WHERE task_id = $1 AND user_id = $2
             ORDER BY id ASC`,
            [req.params.id, req.user.id]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Fetch subtasks error:", error);

        res.status(500).json({
            message: "Unable to fetch subtasks."
        });
    }
});

// UPDATE SUBTASK COMPLETION
router.patch("/:taskId/subtasks/:subtaskId", verifyToken, async (req, res) => {
    try {
        const { taskId, subtaskId } = req.params;
        const { is_completed } = req.body;

        if (typeof is_completed !== "boolean") {
            return res.status(400).json({
                message: "A valid completion status is required."
            });
        }

        const result = await db.query(
            `UPDATE subtasks
             SET is_completed = $1
             WHERE id = $2 AND task_id = $3 AND user_id = $4`,
            [
                is_completed,
                subtaskId,
                taskId,
                req.user.id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Subtask not found."
            });
        }

        const progressResult = await db.query(
            `SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE is_completed = TRUE) AS completed
             FROM subtasks
             WHERE task_id = $1 AND user_id = $2`,
            [taskId, req.user.id]
        );

        const progress = progressResult.rows[0];

        res.json({
            message: "Progress updated successfully!",
            total: Number(progress.total),
            completed: Number(progress.completed)
        });

    } catch (error) {
        console.error("Update subtask error:", error);

        res.status(500).json({
            message: "Unable to update subtask progress."
        });
    }
});

module.exports = router;