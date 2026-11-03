const express = require("express");
const Groq = require("groq-sdk");
const { verifyToken } = require("../authMiddleware");
const db = require("../database");

const router = express.Router();

if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is missing from .env");
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const MODEL = "openai/gpt-oss-20b";

const tutorInstructions = `
You are TaskFlow AI Tutor, a friendly and patient programming teacher.

LANGUAGE:
- Use simple English and easy Thanglish where helpful.
- Always use the programming language requested by the learner.
- Never change Java to Python or Python to Java.

RESPONSE STYLE:
- Answer exactly what the learner asks.
- Keep answers clear, short and beginner-friendly.
- Avoid unnecessary introductions.
- For Hi or Hello, give only a short greeting.
- Do not ask unnecessary follow-up questions.

PROGRAMMING RULES:
- When a program is requested, ALWAYS provide complete working code.
- Never give only an explanation when code is requested.
- Never use pseudocode instead of actual code.
- Do not provide unrelated programs or alternative languages.

FORMAT FOR PROGRAM REQUESTS:

### Program: [Program Name]

**Code:**
Provide complete code in a code block.

**Expected Output:**
Show sample output.

**Explanation (Simple Thanglish):**
Briefly explain the important lines.

JAVA LEARNING:
- If the learner asks for three Java programs, provide exactly three.
- Prefer beginner-friendly programs.
- Avoid repetition when previous learning history is available.
- Do not provide three programs unless requested.

CODE DEBUGGING:
- Identify the error.
- Explain why it happens.
- Provide corrected code.
- Never claim code was executed unless it actually was.

IMPORTANT:
- Always provide complete, runnable code.
- Never stop code in the middle of a line.
- Include all opening and closing braces.
- For Java programs, include the complete class and main method.
- After the code, show the expected output.
- Check that the code is complete before sending.

SUBJECTS:
Support Java, Python, SQL, React, JavaScript, HTML and CSS.

Be a helpful personal tutor, not a textbook.
Always prioritize the learner's exact request.
`;

function isTemporaryAIError(error) {
    const status = error.status || error.statusCode;
    const errorText = String(error.message || error);

    return (
        status === 429 ||
        status === 503 ||
        errorText.includes("429") ||
        errorText.includes("503") ||
        errorText.includes("rate_limit")
    );
}

function handleAIError(error, res, featureName) {
    console.error(`${featureName} Error:`, error.message);

    if (isTemporaryAIError(error)) {
        return res.status(503).json({
            message:
                `${featureName} is temporarily busy or its API limit has been reached. Please try again later.`
        });
    }

    return res.status(500).json({
        message:
            featureName === "AI Tutor"
                ? "AI Tutor could not respond. Please try again."
                : "Unable to generate task steps. Please try again."
    });
}

// FALLBACK BREAKDOWN
function createFallbackSteps(task) {
    const title = task.title.trim();
    const description = (task.description || "").trim();

    return [
        `Understand the goal of "${title}".`,
        description
            ? `Review the task details: ${description}`
            : "Write down the main requirements for this task.",
        "Divide the work into smaller manageable parts.",
        "Complete the first part and check your progress.",
        "Work through the remaining parts one by one.",
        "Review the completed work and make necessary corrections."
    ];
}

// SAVE GENERATED STEPS USING POSTGRESQL TRANSACTION
async function saveTaskSteps(taskId, userId, steps) {
    const client = await db.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `DELETE FROM subtasks
             WHERE task_id = $1 AND user_id = $2`,
            [taskId, userId]
        );

        for (const step of steps) {
            await client.query(
                `INSERT INTO subtasks
                 (task_id, user_id, title)
                 VALUES ($1, $2, $3)`,
                [taskId, userId, step.trim()]
            );
        }

        const result = await client.query(
            `SELECT id, task_id, title, is_completed
             FROM subtasks
             WHERE task_id = $1 AND user_id = $2
             ORDER BY id ASC`,
            [taskId, userId]
        );

        await client.query("COMMIT");

        return result.rows;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
}

// AI TUTOR
router.post("/chat", verifyToken, async (req, res) => {
    try {
        const { message } = req.body;

        if (
            !message ||
            typeof message !== "string" ||
            !message.trim()
        ) {
            return res.status(400).json({
                message: "Please enter a question."
            });
        }

        console.log("Groq AI Tutor request received");

        const completion = await groq.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: "system",
                    content: tutorInstructions
                },
                {
                    role: "user",
                    content: message.trim()
                }
            ],
            max_completion_tokens: 2000
        });

        const reply =
            completion.choices?.[0]?.message?.content;

        if (!reply) {
            throw new Error("AI returned an empty response.");
        }

        console.log("Groq AI Tutor response received");

        return res.json({ reply });

    } catch (error) {
        return handleAIError(error, res, "AI Tutor");
    }
});

// AI TASK BREAKDOWN
router.post("/breakdown", verifyToken, async (req, res) => {
    try {
        const { taskId } = req.body;
        const userId = req.user.id;

        if (!taskId) {
            return res.status(400).json({
                message: "Task ID is required."
            });
        }

        const taskResult = await db.query(
            `SELECT * FROM tasks
             WHERE id = $1 AND user_id = $2`,
            [taskId, userId]
        );

        const task = taskResult.rows[0];

        if (!task) {
            return res.status(404).json({
                message: "Task not found."
            });
        }

        const prompt = `
You are TaskFlow, an AI productivity assistant.

Break the following task into 4 to 8 small, practical,
beginner-friendly actionable steps.

Task: ${task.title}
Description: ${task.description || "No description provided"}

Return ONLY valid JSON in this exact format:
{
    "steps": [
        "First actionable step",
        "Second actionable step",
        "Third actionable step"
    ]
}

Rules:
- Each step must be clear and actionable.
- Keep each step short.
- Arrange steps in a sensible order.
- Do not include markdown or explanations.
`;

        let steps;
        let usedFallback = false;

        try {
            console.log("Groq AI Breakdown request received");

            const completion = await groq.chat.completions.create({
                model: MODEL,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_completion_tokens: 1000
            });

            const responseText =
                completion.choices?.[0]?.message?.content || "";

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error("AI returned an invalid response.");
            }

            const result = JSON.parse(jsonMatch[0]);

            if (
                !Array.isArray(result.steps) ||
                result.steps.length === 0 ||
                !result.steps.every(
                    step =>
                        typeof step === "string" &&
                        step.trim()
                )
            ) {
                throw new Error("AI did not return valid task steps.");
            }

            steps = result.steps;

        } catch (aiError) {
            if (!isTemporaryAIError(aiError)) {
                throw aiError;
            }

            console.log(
                "Groq unavailable. Using TaskFlow fallback breakdown."
            );

            steps = createFallbackSteps(task);
            usedFallback = true;
        }

        const savedSteps = await saveTaskSteps(
            taskId,
            userId,
            steps
        );

        return res.json({
            message: usedFallback
                ? "Task breakdown created using fallback mode."
                : "Task breakdown created successfully!",
            steps: savedSteps,
            usedFallback
        });

    } catch (error) {
        return handleAIError(error, res, "AI Breakdown");
    }
});

module.exports = router;