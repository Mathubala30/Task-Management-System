
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

const API = "http://https://task-management-system-5tpw.onrender.com/api";

function Profile() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const editFormRef = useRef(null);

    const savedUser = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");

    const [name, setName] = useState(savedUser?.name || "");
    const [email, setEmail] = useState(savedUser?.email || "");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    const [tasks, setTasks] = useState([]);
    const [photo, setPhoto] = useState(
        localStorage.getItem(`profilePhoto_${savedUser?.id}`) || ""
    );

    const [toast, setToast] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const userId = savedUser?.id;
    const isAdmin = savedUser?.role === "admin";

    // LOGIN CHECK
    useEffect(() => {
        if (!savedUser) {
            navigate("/");
        }
    }, []);

    // SCROLL TO EDIT FORM WHEN OPENED
    useEffect(() => {
        if (editing) {
            const timer = setTimeout(() => {
                editFormRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }, 150);

            return () => clearTimeout(timer);
        }
    }, [editing]);

    // FETCH TASKS
    const fetchTasks = async () => {
        try {
            const response = await fetch(`${API}/tasks`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok && Array.isArray(data)) {
                setTasks(data);
            }
        } catch (error) {
            console.error("Unable to fetch task statistics:", error);
        }
    };

    useEffect(() => {
        if (savedUser && token) {
            fetchTasks();
        }
    }, []);

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(""), 2500);
    };

    // PROFILE PHOTO UPLOAD
    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showToast("Please select an image file");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast("Image size must be below 2 MB");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            const imageData = reader.result;

            try {
                localStorage.setItem(
                    `profilePhoto_${userId}`,
                    imageData
                );

                setPhoto(imageData);
                showToast("Profile photo updated!");
            } catch {
                showToast("Unable to save this image");
            }
        };

        reader.readAsDataURL(file);
        e.target.value = "";
    };

    // UPDATE PROFILE
    const handleUpdate = async () => {
        if (!name.trim() || !email.trim()) {
            showToast("Name and email are required");
            return;
        }

        if (!token) {
            showToast("Please login again");
            navigate("/");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                `${API}/auth/users/${userId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        email: email.trim(),
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to update account"
                );
            }

            const updatedUser = {
                ...savedUser,
                name: name.trim(),
                email: email.trim()
            };

            localStorage.setItem(
                "user",
                JSON.stringify(updatedUser)
            );

            setPassword("");
            setEditing(false);

            showToast("Account updated successfully!");

        } catch (error) {
            showToast(error.message);
        } finally {
            setLoading(false);
        }
    };

    // DELETE ACCOUNT
    const handleDelete = async () => {
        if (!token) {
            showToast("Please login again");
            navigate("/");
            return;
        }

        setDeleteLoading(true);

        try {
            const response = await fetch(
                `${API}/auth/users/${userId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to delete account"
                );
            }

            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem(`profilePhoto_${userId}`);

            navigate("/");

        } catch (error) {
            showToast(error.message);
            setShowDeleteModal(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    // LOGOUT
    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/");
    };

    // CANCEL EDIT
    const handleCancelEdit = () => {
        setName(savedUser.name || "");
        setEmail(savedUser.email || "");
        setPassword("");
        setEditing(false);
        setShowPassword(false);
    };

    // PRODUCTIVITY STATISTICS
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

    const completionPercentage = totalTasks
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    // AVATAR
    const Avatar = ({ large = false }) => (
        <div className={large ? "main-avatar" : "top-avatar"}>
            {photo ? (
                <img
                    src={photo}
                    alt="Profile"
                    className="profile-photo"
                />
            ) : (
                name.charAt(0).toUpperCase()
            )}
        </div>
    );

    if (!savedUser) {
        return (
            <div className="profile-page">
                <div className="profile-login-card">
                    <h2>Please login first</h2>
                    <button onClick={() => navigate("/")}>
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-dashboard">

            {/* TOAST */}
            {toast && (
                <div className="task-toast">
                    <span>✓</span>
                    {toast}
                </div>
            )}

            {/* DELETE CONFIRMATION */}
            {showDeleteModal && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal">
                        <div className="delete-modal-icon">!</div>

                        <h2>Delete Account?</h2>

                        <p>
                            This will permanently delete your account.
                            This action cannot be undone.
                        </p>

                        <div className="delete-modal-actions">
                            <button
                                className="cancel-delete"
                                disabled={deleteLoading}
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </button>

                            <button
                                className="confirm-delete"
                                disabled={deleteLoading}
                                onClick={handleDelete}
                            >
                                {deleteLoading ? "Deleting..." : "Delete Account"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SIDEBAR */}
            <aside className="profile-sidebar">
                <h2 className="profile-logo">
                    Task<span>Flow</span>
                </h2>

                <p className="profile-menu-label">MAIN MENU</p>

                <nav className="profile-navigation">
                    <button
                        className="profile-nav-item"
                        onClick={() => navigate("/dashboard")}
                    >
                        <span>▦</span> Dashboard
                    </button>

                    <button
                        className="profile-nav-item"
                        onClick={() => navigate("/tasks")}
                    >
                        <span>✓</span> My Tasks
                    </button>

                    <button
                        className="profile-nav-item"
                        onClick={() => navigate("/ai-tutor")}
                    >
                        <span>🤖</span> AI Tutor
                    </button>

                    <button className="profile-nav-item selected">
                        <span>♙</span> My Profile
                    </button>

                    {isAdmin && (
                        <button
                            className="profile-nav-item"
                            onClick={() => navigate("/users")}
                        >
                            <span>♧</span> Users
                        </button>
                    )}
                </nav>

                <button
                    className="profile-logout"
                    onClick={handleLogout}
                >
                    ↪ Logout
                </button>
            </aside>

            {/* MAIN CONTENT */}
            <main className="profile-main">

                {/* TOP BAR */}
                <header className="profile-topbar">
                    <div>
                        <p className="profile-top-label">ACCOUNT CENTER</p>
                        <h1>My Profile</h1>
                    </div>

                    <div className="top-user">
                        <Avatar />
                        <span>{name}</span>
                    </div>
                </header>

                {/* WELCOME BANNER */}
                <section className="profile-banner">
                    <div className="banner-content">
                        <p>YOUR PERSONAL SPACE</p>

                        <h2>
                            Welcome to <span>TaskFlow</span>
                        </h2>

                        <p className="banner-description">
                            Manage your account and track your productivity
                            in one place.
                        </p>
                    </div>

                    <div className="banner-symbol">✦</div>
                </section>

                {/* PROFILE INTRO */}
                <section className="profile-intro">
                    <div className="profile-avatar-wrapper">
                        <Avatar large />

                        <button
                            type="button"
                            className="change-photo-button"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            ✎
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handlePhotoChange}
                        />
                    </div>

                    <div className="profile-identity">
                        <h2>{name}</h2>

                        <p className="identity-email">
                            ✉ {email}
                        </p>

                        <span className="role-badge">
                            ✦ {isAdmin ? "Administrator" : "User"}
                        </span>
                    </div>

                    <button
                        className="edit-profile-button"
                        onClick={() => {
                            if (editing) {
                                handleCancelEdit();
                            } else {
                                setEditing(true);
                            }
                        }}
                    >
                        ✎ {editing ? "Cancel Editing" : "Edit Profile"}
                    </button>
                </section>

                {/* PRODUCTIVITY STATISTICS */}
                <section className="profile-stats-section">
                    <div className="profile-section-heading">
                        <h2>My Productivity</h2>
                        <p>Your task completion overview</p>
                    </div>

                    <div className="profile-stats-grid">
                        <div className="profile-stat-card">
                            <span className="stat-icon">▦</span>
                            <p>Total Tasks</p>
                            <h2>{totalTasks}</h2>
                        </div>

                        <div className="profile-stat-card">
                            <span className="stat-icon">✓</span>
                            <p>Completed</p>
                            <h2>{completedTasks}</h2>
                        </div>

                        <div className="profile-stat-card">
                            <span className="stat-icon">◷</span>
                            <p>Pending</p>
                            <h2>{pendingTasks}</h2>
                        </div>

                        <div className="profile-stat-card">
                            <span className="stat-icon">↗</span>
                            <p>In Progress</p>
                            <h2>{inProgressTasks}</h2>
                        </div>
                    </div>

                    <div className="profile-completion-card">
                        <div className="completion-heading">
                            <div>
                                <h3>Overall Completion</h3>
                                <p>Your completed task percentage</p>
                            </div>

                            <strong>{completionPercentage}%</strong>
                        </div>

                        <div className="profile-completion-track">
                            <div
                                className="profile-completion-fill"
                                style={{
                                    width: `${completionPercentage}%`
                                }}
                            />
                        </div>
                    </div>
                </section>

                {/* INFORMATION CARDS */}
                <section className="profile-information-grid">
                    <div className="profile-info-card">
                        <div className="info-card-heading">
                            <span className="info-icon">♙</span>
                            <h3>Personal Information</h3>
                        </div>

                        <div className="info-divider" />

                        <div className="info-row">
                            <span>Name</span>
                            <strong>{name}</strong>
                        </div>

                        <div className="info-row">
                            <span>Email Address</span>
                            <strong>{email}</strong>
                        </div>

                        <div className="info-row">
                            <span>Account Type</span>
                            <strong>{isAdmin ? "Admin" : "User"}</strong>
                        </div>
                    </div>

                    <div className="profile-info-card">
                        <div className="info-card-heading">
                            <span className="info-icon">⬡</span>
                            <h3>Account Security</h3>
                        </div>

                        <div className="info-divider" />

                        <div className="security-row">
                            <div>
                                <span className="security-icon">♙</span>
                                <span>Password</span>
                            </div>

                            <strong>••••••••</strong>

                            <button
                                className="small-action-button"
                                onClick={() => setEditing(true)}
                            >
                                Update
                            </button>
                        </div>

                        <div className="security-row">
                            <div>
                                <span className="security-icon">✉</span>
                                <span>Account Status</span>
                            </div>

                            <strong className="account-active">
                                ● Active
                            </strong>
                        </div>
                    </div>
                </section>

                {/* EDIT ACCOUNT FORM */}
                {editing && (
                    <section
                        className="profile-edit-card"
                        ref={editFormRef}
                    >
                        <div className="info-card-heading">
                            <span className="info-icon">✎</span>
                            <h3>Edit Account Details</h3>
                        </div>

                        <div className="edit-form-grid">
                            <div className="edit-field">
                                <label>Full Name</label>

                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Enter your name"
                                />
                            </div>

                            <div className="edit-field">
                                <label>Email Address</label>

                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                />
                            </div>

                            <div className="edit-field password-field">
                                <label>New Password</label>

                                <div className="password-input-wrap">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Leave empty to keep current password"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            className="save-profile-button"
                            onClick={handleUpdate}
                            disabled={loading}
                        >
                            {loading ? "Saving..." : "Save Changes →"}
                        </button>
                    </section>
                )}

                {/* ACCOUNT SETTINGS */}
                <section className="account-settings-card">
                    <div className="settings-symbol">⚙</div>

                    <div className="settings-content">
                        <h3>Account Settings</h3>
                        <p>
                            Manage your account settings and preferences.
                        </p>
                    </div>

                    <button
                        className="delete-profile-button"
                        onClick={() => setShowDeleteModal(true)}
                    >
                        ✕ Delete Account
                    </button>
                </section>

                <footer className="profile-footer">
                    © 2026 TaskFlow · Simple. Smart. Organized.
                </footer>
            </main>
        </div>
    );
}

export default Profile;
