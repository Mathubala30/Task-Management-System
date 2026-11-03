
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../components/NotificationBell";
import "./Dashboard.css";

function Dashboard() {
    const navigate = useNavigate();

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchTasks = async () => {
            if (!user?.id || !token) {
                navigate("/");
                return;
            }

            try {
                const response = await fetch(
                    `http://localhost:5000/api/tasks?user_id=${user.id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Unable to fetch tasks");
                }

                setTasks(Array.isArray(data) ? data : []);
            } catch (error) {
                alert(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [navigate]);

    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(
        task => task.status === "Completed"
    ).length;

    const pendingTasks = tasks.filter(
        task => task.status === "Pending"
    ).length;

    const inProgressTasks = tasks.filter(
        task => task.status === "In Progress"
    ).length;

    const progressPercentage = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    const recentTasks = tasks.slice(0, 4);

    // GET TASK DEADLINE
    const getTaskDeadline = (task) =>
        task.due_date || task.deadline || task.dueDate || null;

    // UPCOMING DEADLINES
    const upcomingTasks = tasks
        .filter(task => {
            const deadline = getTaskDeadline(task);

            if (!deadline || task.status === "Completed") {
                return false;
            }

            const deadlineDate = new Date(deadline);

            if (Number.isNaN(deadlineDate.getTime())) {
                return false;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            deadlineDate.setHours(0, 0, 0, 0);

            return deadlineDate >= today;
        })
        .sort((a, b) =>
            new Date(getTaskDeadline(a)) -
            new Date(getTaskDeadline(b))
        )
        .slice(0, 3);

    // SMART NEXT STEP
    const nextTask = tasks.find(
        task => task.status === "In Progress"
    ) || tasks.find(
        task => task.status === "Pending"
    );

    const formatDeadline = (date) =>
        new Date(date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/");
    };

    return (
        <div className="dashboard-layout">

            <aside className="sidebar">

                <h2 className="logo">
                    Task<span>Flow</span>
                </h2>

                <p className="menu-label">MAIN MENU</p>

                <nav className="sidebar-menu">

                    <button
                        className="menu-item active"
                        onClick={() => navigate("/dashboard")}
                    >
                        <span>▦</span>
                        Dashboard
                    </button>

                    <button
                        className="menu-item"
                        onClick={() => navigate("/tasks")}
                    >
                        <span>✓</span>
                        My Tasks
                    </button>

                    <button
                        className="menu-item"
                        onClick={() => navigate("/ai-tutor")}
                    >
                        <span>🤖</span>
                        AI Tutor
                    </button>

                    <button
                        className="menu-item"
                        onClick={() => navigate("/profile")}
                    >
                        <span>♙</span>
                        My Profile
                    </button>

                    {user?.role === "admin" && (
                        <button
                            className="menu-item"
                            onClick={() => navigate("/users")}
                        >
                            <span>♧</span>
                            Users
                        </button>
                    )}

                </nav>

                <div className="sidebar-bottom">

                    <div className="sidebar-user">

                        <div className="sidebar-avatar">
                            {user?.name?.charAt(0).toUpperCase() || "U"}
                        </div>

                        <div className="sidebar-user-info">
                            <strong>{user?.name || "User"}</strong>

                            <span>
                                {user?.role === "admin"
                                    ? "Administrator"
                                    : "Member"}
                            </span>
                        </div>

                    </div>

                    <button
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        <span>↪</span> Logout
                    </button>

                </div>

            </aside>

            <main className="dashboard-main">

                <header className="dashboard-header">

                    <div>
                        <p className="header-label">
                            WORKSPACE OVERVIEW
                        </p>

                        <h1>Dashboard</h1>

                        <p className="header-description">
                            Welcome back, {user?.name || "User"}!
                            Here's your task overview.
                        </p>
                    </div>

                    {/* NOTIFICATION BELL + PROFILE */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px"
                    }}>
                        <NotificationBell />

                        <button
                            className="profile-button"
                            onClick={() => navigate("/profile")}
                        >
                            <span>♙</span> My Account
                        </button>
                    </div>

                </header>

                <section className="welcome-card">

                    <div className="welcome-content">

                        <p className="welcome-tag">
                            ✦ YOUR PERSONAL WORKSPACE
                        </p>

                        <h2>
                            Stay focused.
                            <br />
                            <span>Get things done.</span>
                        </h2>

                        <p>
                            Organize your work, track your progress
                            and keep moving towards your goals.
                        </p>

                        <button
                            className="primary-button"
                            onClick={() => navigate("/tasks")}
                        >
                            Explore My Tasks <span>→</span>
                        </button>

                    </div>

                    <div className="welcome-visual">
                        <div className="welcome-orbit orbit-one"></div>
                        <div className="welcome-orbit orbit-two"></div>
                        <div className="welcome-visual-icon">✓</div>
                        <div className="welcome-glow"></div>
                    </div>

                </section>

                <section className="dashboard-section">

                    <div className="dashboard-section-heading">

                        <div>
                            <p className="section-eyebrow">
                                YOUR ACTIVITY
                            </p>

                            <h2>Task Overview</h2>
                        </div>

                        <span className="live-indicator">
                            <span></span> LIVE SUMMARY
                        </span>

                    </div>

                    <div className="stats-grid">

                        <div className="stat-card total-card">
                            <div className="stat-top">
                                <div className="stat-icon">▤</div>
                                <span className="stat-number-label">01</span>
                            </div>

                            <p>Total Tasks</p>
                            <h2>{loading ? "--" : totalTasks}</h2>

                            <span className="stat-description">
                                All your tasks
                            </span>
                        </div>

                        <div className="stat-card completed-card">
                            <div className="stat-top">
                                <div className="stat-icon">✓</div>
                                <span className="stat-number-label">02</span>
                            </div>

                            <p>Completed</p>
                            <h2>{loading ? "--" : completedTasks}</h2>

                            <span className="stat-description">
                                Finished tasks
                            </span>
                        </div>

                        <div className="stat-card pending-card">
                            <div className="stat-top">
                                <div className="stat-icon">◷</div>
                                <span className="stat-number-label">03</span>
                            </div>

                            <p>Pending</p>
                            <h2>{loading ? "--" : pendingTasks}</h2>

                            <span className="stat-description">
                                Tasks to complete
                            </span>
                        </div>

                        <div className="stat-card progress-stat-card">
                            <div className="stat-top">
                                <div className="stat-icon">↗</div>
                                <span className="stat-number-label">04</span>
                            </div>

                            <p>In Progress</p>
                            <h2>{loading ? "--" : inProgressTasks}</h2>

                            <span className="stat-description">
                                Currently working
                            </span>
                        </div>

                    </div>

                </section>

                <section className="dashboard-middle-grid">

                    <div className="progress-card">

                        <div className="card-heading">

                            <div>
                                <p className="section-eyebrow">
                                    PERFORMANCE
                                </p>

                                <h2>Your Progress</h2>
                            </div>

                            <span className="progress-icon">⌁</span>

                        </div>

                        <div className="progress-content">

                            <div className="progress-number">
                                <strong>
                                    {loading
                                        ? "--"
                                        : `${progressPercentage}%`}
                                </strong>

                                <span>Completed</span>
                            </div>

                            <div className="progress-track">
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: loading
                                            ? "0%"
                                            : `${progressPercentage}%`
                                    }}
                                ></div>
                            </div>

                            <p className="progress-description">
                                {loading
                                    ? "Calculating your progress..."
                                    : totalTasks === 0
                                        ? "Create your first task to start tracking your progress!"
                                        : `${completedTasks} out of ${totalTasks} tasks completed`}
                            </p>

                        </div>

                    </div>

                    <div className="quick-action-card">

                        <div className="quick-action-icon">＋</div>

                        <p className="section-eyebrow">
                            READY FOR MORE?
                        </p>

                        <h2>Plan your next task</h2>

                        <p>
                            Add a new task and keep your work moving forward.
                        </p>

                        <button
                            className="quick-action-button"
                            onClick={() => navigate("/tasks")}
                        >
                            Go to My Tasks <span>→</span>
                        </button>

                    </div>

                    <div className="quick-action-card ai-quick-card">

                        <div className="quick-action-icon">🤖</div>

                        <p className="section-eyebrow">
                            LEARN SOMETHING NEW
                        </p>

                        <h2>Meet Your AI Tutor</h2>

                        <p>
                            Learn Java, understand programming concepts,
                            practise coding and improve your skills.
                        </p>

                        <button
                            className="quick-action-button"
                            onClick={() => navigate("/ai-tutor")}
                        >
                            Explore AI Tutor <span>→</span>
                        </button>

                    </div>

                </section>

                {/* SMART NEXT STEP */}
                <section className="smart-next-card">

                    <div className="smart-next-icon">✦</div>

                    <div className="smart-next-content">

                        <p className="section-eyebrow">
                            YOUR NEXT MOVE
                        </p>

                        <h2>Smart Next Step</h2>

                        {loading ? (
                            <p>Finding your next task...</p>
                        ) : nextTask ? (
                            <>
                                <h3>{nextTask.title}</h3>

                                <p>
                                    {nextTask.status === "In Progress"
                                        ? "Continue working on this task to make progress."
                                        : "Start this task when you're ready to move forward."}
                                </p>

                                <button
                                    className="quick-action-button"
                                    onClick={() => navigate("/tasks")}
                                >
                                    Continue Task <span>→</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <h3>You're all caught up!</h3>

                                <p>
                                    Add a new task and keep your productivity going.
                                </p>

                                <button
                                    className="quick-action-button"
                                    onClick={() => navigate("/tasks")}
                                >
                                    Create a Task <span>→</span>
                                </button>
                            </>
                        )}

                    </div>

                </section>

                {/* UPCOMING DEADLINES */}
                <section className="upcoming-deadlines-card">

                    <div className="section-heading">

                        <div>
                            <p className="section-eyebrow">
                                STAY ON TRACK
                            </p>

                            <h2>Upcoming Deadlines</h2>

                            <p>Keep an eye on your tasks and due dates.</p>
                        </div>

                        <button
                            className="view-button"
                            onClick={() => navigate("/tasks")}
                        >
                            View Tasks <span>→</span>
                        </button>

                    </div>

                    {loading ? (
                        <p className="deadline-empty">
                            Loading deadlines...
                        </p>
                    ) : upcomingTasks.length > 0 ? (
                        <div className="deadline-list">

                            {upcomingTasks.map(task => (
                                <div
                                    className="deadline-item"
                                    key={task.id}
                                >
                                    <div className="deadline-icon">◷</div>

                                    <div className="deadline-info">
                                        <h3>{task.title}</h3>

                                        <p>
                                            Due: {formatDeadline(
                                                getTaskDeadline(task)
                                            )}
                                        </p>
                                    </div>

                                    <span className="deadline-status">
                                        {task.status}
                                    </span>
                                </div>
                            ))}

                        </div>
                    ) : (
                        <div className="deadline-empty">
                            <span>✓</span>

                            <h3>No upcoming deadlines</h3>

                            <p>
                                Tasks with due dates will appear here.
                            </p>
                        </div>
                    )}

                </section>

                {/* RECENT TASKS */}
                <section className="recent-section">

                    <div className="section-heading">

                        <div>
                            <p className="section-eyebrow">
                                LATEST ACTIVITY
                            </p>

                            <h2>Recent Tasks</h2>

                            <p>
                                Your latest activities will appear here.
                            </p>
                        </div>

                        <button
                            className="view-button"
                            onClick={() => navigate("/tasks")}
                        >
                            View All <span>→</span>
                        </button>

                    </div>

                    {loading ? (

                        <div className="empty-tasks">
                            <div className="loading-indicator"></div>
                            <h3>Loading your tasks...</h3>
                        </div>

                    ) : recentTasks.length === 0 ? (

                        <div className="empty-tasks">

                            <div className="empty-icon">✓</div>

                            <h3>Your workspace is ready!</h3>

                            <p>
                                Your tasks will appear here once you
                                start adding them.
                            </p>

                            <button
                                className="primary-button"
                                onClick={() => navigate("/tasks")}
                            >
                                + Create Your First Task
                            </button>

                        </div>

                    ) : (

                        <div className="recent-task-list">

                            {recentTasks.map(task => (

                                <div
                                    key={task.id}
                                    className="recent-task-item"
                                >

                                    <div className="recent-task-symbol">
                                        ✓
                                    </div>

                                    <div className="recent-task-info">

                                        <h3>{task.title}</h3>

                                        <p>
                                            {task.description || "No description"}
                                        </p>

                                    </div>

                                    <span
                                        className={`task-status ${task.status.toLowerCase().replace(" ", "-")}`}
                                    >
                                        {task.status}
                                    </span>

                                </div>

                            ))}

                        </div>

                    )}

                </section>

                <footer className="dashboard-footer">
                    © 2026 TaskFlow · Simple. Smart. Organized.
                </footer>

            </main>

        </div>
    );
}

export default Dashboard;
