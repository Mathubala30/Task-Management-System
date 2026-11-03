
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:5000/api";

function Users() {
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [search, setSearch] = useState("");
    const [toast, setToast] = useState("");
    const [error, setError] = useState("");

    const currentUser = JSON.parse(
        localStorage.getItem("user") || "null"
    );

    const token = localStorage.getItem("token");
    const currentAdminId = currentUser?.id;

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(""), 3000);
    };

    const getHeaders = () => ({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    });

    // FETCH USERS
    const fetchUsers = async () => {
        if (!token || currentUser?.role !== "admin") {
            setError("Admin access required. Please login again.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await fetch(`${API}/auth/users`, {
                headers: getHeaders()
            });

            const data = await response.json();

            if (response.status === 401 || response.status === 403) {
                setError(
                    data.message ||
                    "You are not authorized to access this page."
                );
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || "Unable to fetch users");
            }

            setUsers(Array.isArray(data) ? data : []);

        } catch (error) {
            setError(error.message || "Unable to connect to server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // SEARCH USERS
    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return users;

        return users.filter((user) =>
            user.name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.role?.toLowerCase().includes(query)
        );
    }, [users, search]);

    // UPDATE USER
    const updateUser = async () => {
        if (!editingUser?.name?.trim() || !editingUser?.email?.trim()) {
            showToast("Name and email are required");
            return;
        }

        try {
            setSaving(true);

            const response = await fetch(
                `${API}/auth/users/${editingUser.id}`,
                {
                    method: "PUT",
                    headers: getHeaders(),
                    body: JSON.stringify({
                        name: editingUser.name.trim(),
                        email: editingUser.email.trim()
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to update user");
            }

            setEditingUser(null);
            showToast("User updated successfully!");
            await fetchUsers();

        } catch (error) {
            showToast(error.message);
        } finally {
            setSaving(false);
        }
    };

    // DELETE USER
    const deleteUser = async (user) => {
        if (String(user.id) === String(currentAdminId)) {
            showToast("You cannot delete your own admin account here.");
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to permanently delete ${user.name}'s account?`
        );

        if (!confirmed) return;

        try {
            setDeletingId(user.id);

            const response = await fetch(
                `${API}/auth/users/${user.id}`,
                {
                    method: "DELETE",
                    headers: getHeaders()
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to delete user");
            }

            setUsers((currentUsers) =>
                currentUsers.filter(
                    (item) => String(item.id) !== String(user.id)
                )
            );

            showToast("User deleted successfully!");

        } catch (error) {
            showToast(error.message);
        } finally {
            setDeletingId(null);
        }
    };

    // START EDITING
    const startEditing = (user) => {
        setEditingUser({
            id: user.id,
            name: user.name || "",
            email: user.email || ""
        });
    };

    // ACCESS CHECK
    if (!currentUser || !token || currentUser.role !== "admin") {
        return (
            <div style={pageStyle}>
                <div style={accessCard}>
                    <h2>Access Restricted</h2>
                    <p>Only administrators can access this page.</p>

                    <button
                        style={primaryButton}
                        onClick={() => navigate("/dashboard")}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={pageStyle}>

            {/* TOAST */}
            {toast && (
                <div style={toastStyle}>
                    ✓ {toast}
                </div>
            )}

            {/* HEADER */}
            <header style={headerStyle}>
                <h1 style={logoStyle}>
                    Task<span style={{ color: "#16d9f5" }}>Flow</span>
                </h1>

                <button
                    onClick={() => navigate("/dashboard")}
                    style={backButton}
                >
                    ← Back to Dashboard
                </button>
            </header>

            <main style={mainStyle}>

                {/* PAGE HEADING */}
                <div style={headingStyle}>
                    <p style={smallTitle}>ADMINISTRATION</p>
                    <h1 style={titleStyle}>Manage Users</h1>
                    <p style={subtitleStyle}>
                        View and manage registered TaskFlow accounts.
                    </p>
                </div>

                {/* STATISTICS */}
                <div style={statsStyle}>
                    <div style={statCard}>
                        <p style={statLabel}>TOTAL USERS</p>
                        <h2 style={statNumber}>{users.length}</h2>
                    </div>

                    <div style={statCard}>
                        <p style={statLabel}>ADMINISTRATORS</p>
                        <h2 style={statNumber}>
                            {users.filter(user => user.role === "admin").length}
                        </h2>
                    </div>

                    <div style={statCard}>
                        <p style={statLabel}>NORMAL USERS</p>
                        <h2 style={statNumber}>
                            {users.filter(user => user.role !== "admin").length}
                        </h2>
                    </div>
                </div>

                {/* USERS SECTION */}
                <section style={sectionStyle}>

                    <div style={sectionHeader}>
                        <div>
                            <h2 style={sectionTitle}>Registered Users</h2>
                            <p style={subtitleStyle}>
                                Manage your TaskFlow members.
                            </p>
                        </div>

                        <button
                            onClick={fetchUsers}
                            style={refreshButton}
                            disabled={loading}
                        >
                            ↻ Refresh
                        </button>
                    </div>

                    {/* SEARCH */}
                    <input
                        type="text"
                        placeholder="Search by name, email or role..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={searchStyle}
                    />

                    {/* LOADING / ERROR / USERS */}
                    {loading ? (
                        <p style={messageStyle}>Loading users...</p>
                    ) : error ? (
                        <div style={errorStyle}>
                            <p>{error}</p>

                            <button
                                style={primaryButton}
                                onClick={fetchUsers}
                            >
                                Try Again
                            </button>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <p style={messageStyle}>
                            {users.length === 0
                                ? "No users registered yet."
                                : "No matching users found."}
                        </p>
                    ) : (

                        <div style={userGrid}>
                            {filteredUsers.map((user) => (
                                <div key={user.id} style={userCard}>

                                    {editingUser?.id === user.id ? (
                                        <div style={editContainer}>

                                            <h3 style={sectionTitle}>
                                                Update User
                                            </h3>

                                            <label style={labelStyle}>
                                                Full Name
                                            </label>

                                            <input
                                                style={inputStyle}
                                                value={editingUser.name}
                                                onChange={(e) =>
                                                    setEditingUser({
                                                        ...editingUser,
                                                        name: e.target.value
                                                    })
                                                }
                                                placeholder="Enter name"
                                            />

                                            <label style={labelStyle}>
                                                Email Address
                                            </label>

                                            <input
                                                style={inputStyle}
                                                type="email"
                                                value={editingUser.email}
                                                onChange={(e) =>
                                                    setEditingUser({
                                                        ...editingUser,
                                                        email: e.target.value
                                                    })
                                                }
                                                placeholder="Enter email"
                                            />

                                            <div style={buttonGroup}>
                                                <button
                                                    onClick={updateUser}
                                                    style={primaryButton}
                                                    disabled={saving}
                                                >
                                                    {saving
                                                        ? "Saving..."
                                                        : "Save Changes"}
                                                </button>

                                                <button
                                                    onClick={() => setEditingUser(null)}
                                                    style={cancelButton}
                                                    disabled={saving}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (

                                        <>
                                            {/* USER DETAILS */}
                                            <div style={userInfo}>
                                                <div style={avatarStyle}>
                                                    {(user.name || "U")
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>

                                                <h3 style={userName}>
                                                    {user.name}
                                                </h3>

                                                <p style={userEmail}>
                                                    {user.email}
                                                </p>
                                            </div>

                                            {/* ACCOUNT ROLE */}
                                            <div style={roleRow}>
                                                <span style={labelStyle}>
                                                    Account Role
                                                </span>

                                                <span style={
                                                    user.role === "admin"
                                                        ? adminBadge
                                                        : userBadge
                                                }>
                                                    {user.role === "admin"
                                                        ? "Administrator"
                                                        : "User"}
                                                </span>
                                            </div>

                                            {/* ACTION BUTTONS */}
                                            <div style={buttonGroup}>
                                                <button
                                                    onClick={() => startEditing(user)}
                                                    style={primaryButton}
                                                >
                                                    ✎ Update
                                                </button>

                                                <button
                                                    onClick={() => deleteUser(user)}
                                                    style={deleteButton}
                                                    disabled={
                                                        String(user.id) === String(currentAdminId) ||
                                                        deletingId === user.id
                                                    }
                                                >
                                                    {deletingId === user.id
                                                        ? "Deleting..."
                                                        : "Delete"}
                                                </button>
                                            </div>

                                            {String(user.id) === String(currentAdminId) && (
                                                <p style={ownAccountNote}>
                                                    Your administrator account
                                                </p>
                                            )}
                                        </>
                                    )}

                                </div>
                            ))}
                        </div>
                    )}

                </section>
            </main>
        </div>
    );
}

/* STYLES */

const pageStyle = {
    minHeight: "100vh",
    padding: "25px",
    boxSizing: "border-box",
    background: "#06111f",
    color: "#ffffff",
    fontFamily: '"Segoe UI", Arial, sans-serif'
};

const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
    marginBottom: "35px"
};

const logoStyle = {
    fontSize: "30px",
    margin: 0,
    fontWeight: "700"
};

const backButton = {
    padding: "11px 18px",
    borderRadius: "9px",
    border: "1px solid #24506b",
    background: "#10243a",
    color: "#ffffff",
    cursor: "pointer"
};

const mainStyle = {
    maxWidth: "1150px",
    margin: "0 auto"
};

const headingStyle = {
    marginBottom: "25px"
};

const smallTitle = {
    color: "#16d9f5",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "2px"
};

const titleStyle = {
    fontSize: "32px",
    margin: "8px 0"
};

const subtitleStyle = {
    color: "#94a3b8",
    margin: 0,
    fontSize: "13px"
};

const statsStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    marginBottom: "24px"
};

const statCard = {
    padding: "18px",
    borderRadius: "15px",
    background: "#10243a",
    border: "1px solid #24506b"
};

const statLabel = {
    color: "#94a3b8",
    fontSize: "12px",
    letterSpacing: "1px"
};

const statNumber = {
    fontSize: "30px",
    margin: "8px 0 0",
    color: "#16d9f5"
};

const sectionStyle = {
    padding: "20px",
    borderRadius: "18px",
    background: "#0d1b2e",
    border: "1px solid #24506b"
};

const sectionHeader = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "16px"
};

const sectionTitle = {
    color: "#ffffff",
    marginTop: 0
};

const refreshButton = {
    padding: "9px 15px",
    borderRadius: "8px",
    border: "1px solid #16d9f5",
    background: "transparent",
    color: "#16d9f5",
    cursor: "pointer"
};

const searchStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "9px",
    border: "1px solid #29465f",
    background: "#081629",
    color: "#ffffff",
    outline: "none"
};

const messageStyle = {
    color: "#94a3b8",
    padding: "15px 0"
};

const errorStyle = {
    padding: "20px",
    color: "#ff8a9a",
    background: "rgba(255, 70, 100, 0.08)",
    borderRadius: "10px"
};

/* COMPACT USER GRID */
const userGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px",
    alignItems: "start"
};

/* COMPACT USER CARD */
const userCard = {
    minWidth: 0,
    padding: "18px",
    borderRadius: "14px",
    background: "#142943",
    border: "1px solid #29465f",
    alignSelf: "start"
};

/* CENTERED USER DETAILS */
const userInfo = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "8px",
    marginBottom: "15px"
};

const avatarStyle = {
    width: "48px",
    height: "48px",
    minWidth: "48px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #087eaa, #16d9f5)",
    color: "#061522",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "700"
};

const userName = {
    color: "#ffffff",
    margin: 0,
    fontSize: "17px"
};

const userEmail = {
    color: "#a9c7df",
    margin: 0,
    fontSize: "13px",
    overflowWrap: "anywhere"
};

const roleRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "15px"
};

const adminBadge = {
    padding: "6px 11px",
    borderRadius: "20px",
    color: "#16d9f5",
    background: "rgba(22, 217, 245, 0.1)",
    border: "1px solid rgba(22, 217, 245, 0.3)",
    fontSize: "11px"
};

const userBadge = {
    padding: "6px 11px",
    borderRadius: "20px",
    color: "#a5b4fc",
    background: "rgba(129, 140, 248, 0.1)",
    border: "1px solid rgba(129, 140, 248, 0.3)",
    fontSize: "11px"
};

/* BUTTONS IN SEPARATE LINES */
const buttonGroup = {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "100%"
};

const primaryButton = {
    width: "100%",
    boxSizing: "border-box",
    background: "linear-gradient(100deg, #087eaa, #16d9f5)",
    color: "#061522",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600"
};

const cancelButton = {
    width: "100%",
    boxSizing: "border-box",
    background: "#303b5b",
    color: "#ffffff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer"
};

const deleteButton = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255, 70, 100, 0.1)",
    color: "#ff7d91",
    border: "1px solid #713849",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer"
};

const editContainer = {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
};

const labelStyle = {
    color: "#b8cee2",
    fontSize: "13px"
};

const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px",
    borderRadius: "8px",
    border: "1px solid #394665",
    background: "#081629",
    color: "#ffffff",
    outline: "none"
};

const ownAccountNote = {
    color: "#16d9f5",
    fontSize: "11px",
    marginBottom: 0,
    textAlign: "center"
};

const toastStyle = {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 1000,
    padding: "14px 20px",
    borderRadius: "10px",
    background: "#123b43",
    border: "1px solid #16d9f5",
    color: "#ffffff"
};

const accessCard = {
    maxWidth: "420px",
    margin: "100px auto",
    padding: "35px",
    textAlign: "center",
    borderRadius: "16px",
    background: "#10243a",
    border: "1px solid #24506b"
};

export default Users;
