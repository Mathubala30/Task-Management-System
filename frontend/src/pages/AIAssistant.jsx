import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./AIAssistant.css";

function formatMarkdown(text) {
    return text.replace(
        /\\([`*_{}[\]()#+.!|>~-])/g,
        "$1"
    );
}

function CodeBlock({ children }) {
    const [copied, setCopied] = useState(false);

    const code = React.Children.toArray(children)
        .map(child => {
            if (typeof child === "string") return child;
            return child.props?.children || "";
        })
        .join("")
        .replace(/\n$/, "");

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);

            setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="ai-code-wrapper">
            <div className="ai-code-header">
                <span>CODE</span>

                <button onClick={copyCode}>
                    {copied ? "✓ Copied" : "Copy code"}
                </button>
            </div>

            <pre className="ai-code-block">
                {children}
            </pre>
        </div>
    );
}

function AIAssistant() {
    const navigate = useNavigate();

    const savedUser = JSON.parse(
        localStorage.getItem("user") || "null"
    );

    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);

    const suggestions = [
        "Teach me Java basics",
        "Give me 3 Java programs",
        "Explain OOP concepts",
        "Help me debug my code"
    ];

    const handleSend = async (text = message) => {
        const userMessage = text.trim();

        if (!userMessage || isTyping) return;

        const token = localStorage.getItem("token");

        if (!token) {
            alert("Please login again.");
            navigate("/");
            return;
        }

        setMessages(prev => [
            ...prev,
            {
                sender: "user",
                text: userMessage
            }
        ]);

        setMessage("");
        setIsTyping(true);

        try {
            const response = await fetch(
                "http://localhost:5000/api/ai/chat",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        message: userMessage
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to get AI response."
                );
            }

            setMessages(prev => [
                ...prev,
                {
                    sender: "assistant",
                    text: data.reply || "No response received."
                }
            ]);

        } catch (error) {
            console.error("AI Tutor Error:", error);

            setMessages(prev => [
                ...prev,
                {
                    sender: "assistant",
                    text: `Sorry! ${error.message}. Please try again.`
                }
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/");
    };

    return (
        <div className="ai-dashboard">

            <aside className="ai-sidebar">

                <h2 className="ai-logo">
                    Task<span>Flow</span>
                </h2>

                <p className="ai-menu-title">WORKSPACE</p>

                <nav className="ai-navigation">

                    <button onClick={() => navigate("/dashboard")}>
                        <span>▦</span> Dashboard
                    </button>

                    <button onClick={() => navigate("/tasks")}>
                        <span>✓</span> My Tasks
                    </button>

                    <button onClick={() => navigate("/profile")}>
                        <span>♙</span> My Profile
                    </button>

                    {savedUser?.role === "admin" && (
                        <button onClick={() => navigate("/users")}>
                            <span>♧</span> Users
                        </button>
                    )}

                    <button className="ai-nav-active">
                        <span>✧</span> AI Tutor
                    </button>

                </nav>

                <div className="ai-sidebar-bottom">

                    <div className="ai-user-card">

                        <div className="ai-user-avatar">
                            {savedUser?.name?.charAt(0).toUpperCase() || "U"}
                        </div>

                        <div>
                            <strong>{savedUser?.name || "Learner"}</strong>
                            <p>Learning Account</p>
                        </div>

                    </div>

                    <button
                        className="ai-logout"
                        onClick={handleLogout}
                    >
                        ↪ Logout
                    </button>

                </div>

            </aside>

            <main className="ai-main">

                <header className="ai-topbar">

                    <div>
                        <p className="ai-eyebrow">
                            YOUR PERSONAL LEARNING SPACE
                        </p>

                        <h1>AI Learning Assistant</h1>
                    </div>

                    <div className="ai-status">
                        <span></span> Learning Mode
                    </div>

                </header>

                <div className="ai-content-grid">

                    <section className="ai-chat-panel">

                        <div className="ai-chat-heading">

                            <div className="ai-mini-robot">
                                🤖
                            </div>

                            <div>
                                <h2>TaskFlow AI Tutor</h2>
                                <p>Your learning companion</p>
                            </div>

                            <span className="ai-online-badge">
                                ● READY
                            </span>

                        </div>

                        <div className="ai-chat-body">

                            {messages.length === 0 ? (

                                <div className="ai-welcome">

                                    <div className="ai-robot">
                                        <img
                                            src="/taskflow-robot.png"
                                            alt="TaskFlow AI Tutor Robot"
                                            className="ai-robot-image"
                                        />
                                    </div>

                                    <p className="ai-welcome-label">
                                        HELLO, LEARNER!
                                    </p>

                                    <h2>
                                        What shall we <span>learn</span> today?
                                    </h2>

                                    <p className="ai-welcome-description">
                                        Explore programming, understand concepts,
                                        practise coding and improve your skills.
                                    </p>

                                    <div className="ai-suggestions">

                                        {suggestions.map((item, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSend(item)}
                                            >
                                                ✧ {item}
                                            </button>
                                        ))}

                                    </div>

                                </div>

                            ) : (

                                <div className="ai-message-list">

                                    {messages.map((item, index) => (

                                        <div
                                            key={index}
                                            className={`ai-message ${item.sender}`}
                                        >

                                            {item.sender === "assistant" && (
                                                <div className="ai-message-avatar">
                                                    🤖
                                                </div>
                                            )}

                                            <div className="ai-message-content">

                                                <span>
                                                    {item.sender === "user"
                                                        ? "You"
                                                        : "TaskFlow Tutor"}
                                                </span>

                                                {item.sender === "assistant" ? (
                                                    <div className="ai-markdown">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                pre: CodeBlock
                                                            }}
                                                        >
                                                            {formatMarkdown(item.text)}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p>{item.text}</p>
                                                )}

                                            </div>

                                        </div>

                                    ))}

                                    {isTyping && (
                                        <div className="ai-typing">
                                            Tutor is preparing a response...
                                        </div>
                                    )}

                                </div>

                            )}

                        </div>

                        <div className="ai-input-area">

                            <input
                                type="text"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") {
                                        handleSend();
                                    }
                                }}
                                placeholder="Ask me anything about programming..."
                                disabled={isTyping}
                            />

                            <button
                                onClick={() => handleSend()}
                                disabled={!message.trim() || isTyping}
                            >
                                {isTyping ? "Thinking..." : "Send ↗"}
                            </button>

                        </div>

                        <p className="ai-input-note">
                            Ask questions, practise coding and learn with your AI Tutor.
                        </p>

                    </section>

                    <aside className="ai-right-panel">

                        <div className="ai-progress-card">

                            <p className="ai-card-label">
                                YOUR LEARNING SPACE
                            </p>

                            <div className="ai-progress-icon">
                                ✧
                            </div>

                            <h3>Keep Growing!</h3>

                            <p>
                                Every question is a new opportunity
                                to learn something.
                            </p>

                        </div>

                        <div className="ai-topics-card">

                            <h3>Explore Topics</h3>

                            <button
                                onClick={() => handleSend("Teach me Java programming")}
                                disabled={isTyping}
                            >
                                <span>☕</span>
                                <div>
                                    <strong>Java</strong>
                                    <p>Programming fundamentals</p>
                                </div>
                                <b>→</b>
                            </button>

                            <button
                                onClick={() => handleSend("Teach me Python basics")}
                                disabled={isTyping}
                            >
                                <span>🐍</span>
                                <div>
                                    <strong>Python</strong>
                                    <p>Learn Python basics</p>
                                </div>
                                <b>→</b>
                            </button>

                            <button
                                onClick={() => handleSend("Teach me SQL")}
                                disabled={isTyping}
                            >
                                <span>▤</span>
                                <div>
                                    <strong>SQL</strong>
                                    <p>Database fundamentals</p>
                                </div>
                                <b>→</b>
                            </button>

                            <button
                                onClick={() => handleSend("Teach me React")}
                                disabled={isTyping}
                            >
                                <span>⚛</span>
                                <div>
                                    <strong>React</strong>
                                    <p>Frontend development</p>
                                </div>
                                <b>→</b>
                            </button>

                        </div>

                        <div className="ai-tip-card">

                            <span>✦ QUICK TIP</span>

                            <p>
                                Consistent practice and curiosity
                                help you become a better programmer.
                            </p>

                        </div>

                    </aside>

                </div>

                <footer className="ai-footer">
                    © 2026 TaskFlow · Learn. Practise. Grow.
                </footer>

            </main>

        </div>
    );
}

export default AIAssistant;