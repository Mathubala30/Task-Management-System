require("dotenv").config();

const express = require("express");
const cors = require("cors");

const db = require("./database");

const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const aiRoutes = require("./routes/ai");
const notificationRoutes = require("./routes/notifications");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
    res.send("Task Management Backend is running!");
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await db.initializeDatabase();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
}

startServer();