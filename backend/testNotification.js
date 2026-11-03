require("dotenv").config();

const db = require("./database");

const user = db.prepare(
    "SELECT id FROM users WHERE email = ?"
).get("balamathu885@gmail.com");

if (!user) {
    console.log("User not found. Check your registered email.");
    process.exit();
}

db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, ?, ?, ?)
`).run(
    user.id,
    "Welcome to TaskFlow!",
    "Your notification system is working successfully.",
    "success"
);

console.log("Test notification created successfully!");
process.exit();