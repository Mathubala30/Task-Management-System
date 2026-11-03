import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Tasks.css";

const API = "http://https://task-management-system-5tpw.onrender.com/api";

function Tasks() {
    const navigate = useNavigate();

    const [tasks, setTasks] = useState([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("Pending");
    const [dueDate, setDueDate] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);

    const [subtasks, setSubtasks] = useState({});
    const [expandedTask, setExpandedTask] = useState(null);
    const [breakdownLoading, setBreakdownLoading] = useState(null);
    const [stepLoading, setStepLoading] = useState(null);

    const [toast, setToast] = useState("");
    const [deleteTaskId, setDeleteTaskId] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");

    // COMMON AUTH HEADERS
    const authHeaders = {
        Authorization: `Bearer ${token}`
    };

    // TOAST NOTIFICATION
    const showToast = (message) => {
        setToast(message);

        setTimeout(() => {
            setToast("");
        }, 2500);
    };

    // FETCH USER TASKS
    const fetchTasks = async () => {
        if (!user?.id || !token) {
            navigate("/");
            return;
        }

        try {
            const response = await fetch(`${API}/tasks`, {
                headers: authHeaders
            });

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

    useEffect(() => {
        fetchTasks();
    }, []);

    // CREATE OR UPDATE TASK
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim() || !user?.id || !token) return;

        const wasEditing = Boolean(editingId);

        const taskData = {
            title: title.trim(),
            description,
            status,
            due_date: dueDate || null
        };

        try {
            const url = wasEditing
                ? `${API}/tasks/${editingId}`
                : `${API}/tasks`;

            const response = await fetch(url, {
                method: wasEditing ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders
                },
                body: JSON.stringify(taskData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Task operation failed");
            }

            setTitle("");
            setDescription("");
            setStatus("Pending");
            setDueDate("");
            setEditingId(null);

            showToast(
                wasEditing
                    ? "Task updated successfully"
                    : "Task created successfully"
            );

            await fetchTasks();

        } catch (error) {
            alert(error.message);
        }
    };

    // EDIT TASK
    const handleEdit = (task) => {
        setTitle(task.title);
        setDescription(task.description || "");
        setStatus(task.status);
        setDueDate(task.due_date || "");
        setEditingId(task.id);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    // DELETE TASK
    const handleDelete = async () => {
        if (deleteTaskId === null || deleteLoading) return;

        const id = deleteTaskId;

        setDeleteLoading(true);

        try {
            const response = await fetch(`${API}/tasks/${id}`, {
                method: "DELETE",
                headers: authHeaders
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to delete task");
            }

            setSubtasks(previous => {
                const updated = { ...previous };
                delete updated[id];
                return updated;
            });

            if (expandedTask === id) {
                setExpandedTask(null);
            }

            if (editingId === id) {
                handleCancel();
            }

            setDeleteTaskId(null);

            showToast("Task deleted successfully");

            await fetchTasks();

        } catch (error) {
            alert(error.message);

        } finally {
            setDeleteLoading(false);
        }
    };

    // CANCEL EDIT
    const handleCancel = () => {
        setEditingId(null);
        setTitle("");
        setDescription("");
        setStatus("Pending");
        setDueDate("");
    };

    // LOGOUT
    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/");
    };

    // FETCH SAVED SUBTASKS
    const fetchSubtasks = async (taskId) => {
        try {
            const response = await fetch(
                `${API}/tasks/${taskId}/subtasks`,
                {
                    headers: authHeaders
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to fetch steps");
            }

            setSubtasks(previous => ({
                ...previous,
                [taskId]: data
            }));

            return data;

        } catch (error) {
            alert(error.message);
            return null;
        }
    };

    // GENERATE AI TASK BREAKDOWN
    const handleBreakdown = async (taskId) => {
        setBreakdownLoading(taskId);

        try {
            const response = await fetch(`${API}/ai/breakdown`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders
                },
                body: JSON.stringify({ taskId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "AI breakdown failed");
            }

            setSubtasks(previous => ({
                ...previous,
                [taskId]: data.steps || []
            }));

            setExpandedTask(taskId);

        } catch (error) {
            alert(error.message);

        } finally {
            setBreakdownLoading(null);
        }
    };

    // TOGGLE SUBTASK COMPLETION
    const handleStepToggle = async (taskId, step) => {
        const loadingKey = `${taskId}-${step.id}`;

        setStepLoading(loadingKey);

        try {
            const newCompleted = !Boolean(step.is_completed);

            const response = await fetch(
                `${API}/tasks/${taskId}/subtasks/${step.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        ...authHeaders
                    },
                    body: JSON.stringify({
                        is_completed: newCompleted
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to update progress");
            }

            setSubtasks(previous => ({
                ...previous,
                [taskId]: previous[taskId].map(item =>
                    item.id === step.id
                        ? {
                            ...item,
                            is_completed: newCompleted ? 1 : 0
                        }
                        : item
                )
            }));

        } catch (error) {
            alert(error.message);

        } finally {
            setStepLoading(null);
        }
    };

    // SEARCH AND FILTER
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesFilter =
            filter === "All" || task.status === filter;

        return matchesSearch && matchesFilter;
    });

    // FORMAT DUE DATE
    const formatDueDate = (date) => {
        if (!date) return "";

        return new Date(`${date}T00:00:00`).toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );
    };

    // CHECK OVERDUE TASK
    const isOverdue = (task) => {
        if (!task.due_date || task.status === "Completed") {
            return false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const deadline = new Date(`${task.due_date}T00:00:00`);

        return deadline < today;
    };

    return (
        <div className="tasks-page">

            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className="task-toast">
                    <span>✓</span>
                    {toast}
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deleteTaskId !== null && (
                <div
                    className="delete-modal-overlay"
                    onClick={(e) => {
                        if (
                            e.target === e.currentTarget &&
                            !deleteLoading
                        ) {
                            setDeleteTaskId(null);
                        }
                    }}
                >
                    <div className="delete-modal">

                        <div className="delete-modal-icon">
                            !
                        </div>

                        <h2>Delete Task?</h2>

                        <p>
                            Are you sure you want to delete this task?
                            This action cannot be undone.
                        </p>

                        <div className="delete-modal-actions">

                            <button
                                type="button"
                                className="cancel-delete"
                                disabled={deleteLoading}
                                onClick={() => setDeleteTaskId(null)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="confirm-delete"
                                disabled={deleteLoading}
                                onClick={handleDelete}
                            >
                                {deleteLoading
                                    ? "Deleting..."
                                    : "Delete Task"}
                            </button>

                        </div>

                    </div>
                </div>
            )}

            {/* SIDEBAR */}
            <aside className="tasks-sidebar">

                <h2 className="tasks-logo">
                    Task<span>Flow</span>
                </h2>

                <p className="tasks-menu-label">MENU</p>

                <button
                    className="tasks-nav"
                    onClick={() => navigate("/dashboard")}
                >
                    ▦ Dashboard
                </button>

                <button className="tasks-nav active">
                    ✓ My Tasks
                </button>

                <button
                    className="tasks-nav"
                    onClick={() => navigate("/ai-tutor")}
                >
                    🤖 AI Tutor
                </button>

                <button
                    className="tasks-nav"
                    onClick={() => navigate("/profile")}
                >
                    ♙ My Profile
                </button>

                {user?.role === "admin" && (
                    <button
                        className="tasks-nav"
                        onClick={() => navigate("/users")}
                    >
                        ♧ Users
                    </button>
                )}

                <button
                    className="tasks-logout"
                    onClick={handleLogout}
                >
                    ↪ Logout
                </button>

            </aside>

            {/* MAIN CONTENT */}
            <main className="tasks-main">

                <header className="tasks-header">

                    <div>
                        <h1>My Tasks</h1>
                        <p>
                            Organize your work and track your progress.
                        </p>
                    </div>

                    <button
                        className="tasks-back"
                        onClick={() => navigate("/dashboard")}
                    >
                        ← Dashboard
                    </button>

                </header>

                {/* TASK SUMMARY */}
                <section className="task-summary">

                    <div className="task-summary-card">
                        <span>Total Tasks</span>
                        <h2>{tasks.length}</h2>
                    </div>

                    <div className="task-summary-card">
                        <span>Pending</span>
                        <h2>
                            {tasks.filter(
                                t => t.status === "Pending"
                            ).length}
                        </h2>
                    </div>

                    <div className="task-summary-card">
                        <span>In Progress</span>
                        <h2>
                            {tasks.filter(
                                t => t.status === "In Progress"
                            ).length}
                        </h2>
                    </div>

                    <div className="task-summary-card">
                        <span>Completed</span>
                        <h2>
                            {tasks.filter(
                                t => t.status === "Completed"
                            ).length}
                        </h2>
                    </div>

                </section>

                {/* CREATE / UPDATE TASK */}
                <section className="task-form-card">

                    <h2>
                        {editingId ? "Edit Task" : "Create New Task"}
                    </h2>

                    <form onSubmit={handleSubmit}>

                        <div className="task-form-grid">

                            <div className="task-input-group">
                                <label>Task Title</label>

                                <input
                                    type="text"
                                    placeholder="Enter task title"
                                    value={title}
                                    onChange={e =>
                                        setTitle(e.target.value)
                                    }
                                    required
                                />
                            </div>

                            <div className="task-input-group">
                                <label>Status</label>

                                <select
                                    value={status}
                                    onChange={e =>
                                        setStatus(e.target.value)
                                    }
                                >
                                    <option>Pending</option>
                                    <option>In Progress</option>
                                    <option>Completed</option>
                                </select>
                            </div>

                            {/* DUE DATE */}
                            <div className="task-input-group">
                                <label>Due Date</label>

                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={e =>
                                        setDueDate(e.target.value)
                                    }
                                />
                            </div>

                            <div className="task-input-group full-width">
                                <label>Description</label>

                                <textarea
                                    placeholder="Describe your task..."
                                    value={description}
                                    onChange={e =>
                                        setDescription(e.target.value)
                                    }
                                    rows="3"
                                />
                            </div>

                        </div>

                        <div className="task-form-actions">

                            <button
                                type="submit"
                                className="task-submit"
                            >
                                {editingId
                                    ? "Update Task"
                                    : "+ Add Task"}
                            </button>

                            {editingId && (
                                <button
                                    type="button"
                                    className="task-cancel"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </button>
                            )}

                        </div>

                    </form>

                </section>

                {/* TASK LIST */}
                <section className="task-list-section">

                    <div className="task-list-heading">
                        <div>
                            <h2>All Tasks</h2>
                            <p>Manage your daily activities.</p>
                        </div>
                    </div>

                    <div className="task-tools">

                        <input
                            type="search"
                            placeholder="Search tasks..."
                            value={search}
                            onChange={e =>
                                setSearch(e.target.value)
                            }
                        />

                        <select
                            value={filter}
                            onChange={e =>
                                setFilter(e.target.value)
                            }
                        >
                            <option>All</option>
                            <option>Pending</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                        </select>

                    </div>

                    <div className="task-list">

                        {loading ? (

                            <div className="task-empty">
                                <h3>Loading tasks...</h3>
                            </div>

                        ) : filteredTasks.length === 0 ? (

                            <div className="task-empty">
                                <div>✓</div>
                                <h3>No tasks found</h3>
                                <p>Add a new task to get started!</p>
                            </div>

                        ) : (

                            filteredTasks.map(task => {
                                const steps = subtasks[task.id] || [];

                                const completed = steps.filter(
                                    step => Boolean(step.is_completed)
                                ).length;

                                const total = steps.length;

                                const progress = total
                                    ? Math.round(
                                        (completed / total) * 100
                                    )
                                    : 0;

                                const isExpanded =
                                    expandedTask === task.id;

                                return (
                                    <div
                                        className="task-item"
                                        key={task.id}
                                    >

                                        <div className="task-item-info">

                                            <h3>{task.title}</h3>

                                            <p>
                                                {task.description ||
                                                    "No description"}
                                            </p>

                                            <span
                                                className={`task-status ${task.status.toLowerCase().replace(" ", "-")}`}
                                            >
                                                {task.status}
                                            </span>

                                            {/* DUE DATE DISPLAY */}
                                            {task.due_date && (
                                                <p
                                                    className={`task-due-date ${isOverdue(task) ? "overdue" : ""}`}
                                                >
                                                    📅 Due: {formatDueDate(task.due_date)}
                                                    {isOverdue(task) &&
                                                        " · Overdue"}
                                                </p>
                                            )}

                                        </div>

                                        <div className="task-item-actions">

                                            <button
                                                type="button"
                                                disabled={
                                                    breakdownLoading === task.id
                                                }
                                                onClick={() =>
                                                    handleBreakdown(task.id)
                                                }
                                            >
                                                {breakdownLoading === task.id
                                                    ? "Generating..."
                                                    : "✨ AI Breakdown"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (isExpanded) {
                                                        setExpandedTask(null);
                                                    } else {
                                                        setExpandedTask(task.id);
                                                        await fetchSubtasks(task.id);
                                                    }
                                                }}
                                            >
                                                {isExpanded
                                                    ? "Hide Steps"
                                                    : "View Steps"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleEdit(task)
                                                }
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                className="delete-task"
                                                onClick={() =>
                                                    setDeleteTaskId(task.id)
                                                }
                                            >
                                                Delete
                                            </button>

                                        </div>

                                        {/* AI BREAKDOWN */}
                                        {isExpanded && (
                                            <div className="task-breakdown">

                                                <div className="breakdown-heading">
                                                    <div>
                                                        <h4>✨ AI Action Plan</h4>
                                                        <p>
                                                            {completed} of {total} steps completed
                                                        </p>
                                                    </div>

                                                    <strong>{progress}%</strong>
                                                </div>

                                                <div className="breakdown-progress">
                                                    <div
                                                        className="breakdown-progress-fill"
                                                        style={{
                                                            width: `${progress}%`
                                                        }}
                                                    />
                                                </div>

                                                {total === 0 ? (
                                                    <p className="breakdown-empty">
                                                        No steps yet. Click AI Breakdown to generate your plan.
                                                    </p>
                                                ) : (
                                                    <div className="breakdown-steps">

                                                        {steps.map((step, index) => (
                                                            <label
                                                                className={`breakdown-step ${Boolean(step.is_completed) ? "completed" : ""}`}
                                                                key={step.id}
                                                            >

                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(step.is_completed)}
                                                                    disabled={
                                                                        stepLoading === `${task.id}-${step.id}`
                                                                    }
                                                                    onChange={() =>
                                                                        handleStepToggle(task.id, step)
                                                                    }
                                                                />

                                                                <span className="step-number">
                                                                    {index + 1}
                                                                </span>

                                                                <span className="step-title">
                                                                    {step.title}
                                                                </span>

                                                            </label>
                                                        ))}

                                                    </div>
                                                )}

                                            </div>
                                        )}

                                    </div>
                                );
                            })

                        )}

                    </div>

                </section>

            </main>

        </div>
    );
}

export default Tasks;
