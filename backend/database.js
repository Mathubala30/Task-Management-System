
const Database = require("better-sqlite3");

const db = new Database("tasks.db");

db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        google_id TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'Pending',
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        is_completed INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
`);

// Safely add missing columns to existing databases
const userColumns = db.prepare("PRAGMA table_info(users)").all();

if (!userColumns.some(column => column.name === "role")) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
    `);
}

if (!userColumns.some(column => column.name === "google_id")) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN google_id TEXT
    `);
}

// Add due_date to existing tasks table
const taskColumns = db.prepare("PRAGMA table_info(tasks)").all();

if (!taskColumns.some(column => column.name === "due_date")) {
    db.exec(`
        ALTER TABLE tasks
        ADD COLUMN due_date TEXT
    `);
}

// Indexes
db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_users_google_id
    ON users(google_id)
    WHERE google_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS
    idx_notifications_user_id
    ON notifications(user_id);

    CREATE INDEX IF NOT EXISTS
    idx_notifications_created_at
    ON notifications(created_at);
`);

console.log("Database connected successfully!");

module.exports = db;
