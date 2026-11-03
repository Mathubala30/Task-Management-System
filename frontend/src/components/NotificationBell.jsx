import { useEffect, useState, useCallback } from "react";

function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        const token = localStorage.getItem("token");

        if (!token) return;

        setLoading(true);

        try {
            const response = await fetch(
               " https://task-management-system-5tpw.onrender.com",
                {
                    method: "GET",
                    cache: "no-store",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Cache-Control": "no-cache"
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Notification API error: ${response.status}`);
            }

            const data = await response.json();

            setNotifications(data);

            const unread = data.filter(
                item => Number(item.is_read) === 0
            ).length;

            setUnreadCount(unread);

        } catch (error) {
            console.error("Notification fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch and automatic refresh every 10 seconds
    useEffect(() => {
        fetchNotifications();

        const interval = setInterval(() => {
            fetchNotifications();
        }, 10000);

        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const markAsRead = async (id) => {
        const token = localStorage.getItem("token");

        try {
            const response = await fetch(
                `" https://task-management-system-5tpw.onrender.com/${id}/read`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) throw new Error("Unable to update notification");

            await fetchNotifications();

        } catch (error) {
            console.error(error);
        }
    };

    const markAllAsRead = async () => {
        const token = localStorage.getItem("token");

        try {
            const response = await fetch(
                " https://task-management-system-5tpw.onrender.com",
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) throw new Error("Unable to update notifications");

            await fetchNotifications();

        } catch (error) {
            console.error(error);
        }
    };

    const deleteNotification = async (id) => {
        const token = localStorage.getItem("token");

        try {
            const response = await fetch(
                `https://task-management-system-5tpw.onrender.com/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) throw new Error("Unable to delete notification");

            await fetchNotifications();

        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <button
                onClick={() => {
                    setOpen(previous => !previous);
                    fetchNotifications();
                }}
                style={{
                    position: "relative",
                    background: "#17243a",
                    color: "white",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                    padding: "11px 14px",
                    cursor: "pointer",
                    fontSize: "20px"
                }}
                aria-label="Notifications"
            >
                🔔

                {unreadCount > 0 && (
                    <span style={{
                        position: "absolute",
                        top: "-7px",
                        right: "-7px",
                        background: "#ef4444",
                        color: "white",
                        borderRadius: "50%",
                        minWidth: "19px",
                        height: "19px",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div style={{
                    position: "absolute",
                    right: 0,
                    top: "50px",
                    width: "320px",
                    maxHeight: "400px",
                    overflowY: "auto",
                    background: "#101c30",
                    color: "white",
                    border: "1px solid #334155",
                    borderRadius: "14px",
                    padding: "15px",
                    zIndex: 1000,
                    boxShadow: "0 12px 30px rgba(0,0,0,0.35)"
                }}>
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px"
                    }}>
                        <strong>Notifications</strong>

                        <button
                            onClick={markAllAsRead}
                            style={smallButton}
                        >
                            Mark all read
                        </button>
                    </div>

                    {loading ? (
                        <p>Loading...</p>
                    ) : notifications.length === 0 ? (
                        <p style={{
                            color: "#94a3b8",
                            textAlign: "center"
                        }}>
                            No notifications yet.
                        </p>
                    ) : (
                        notifications.map(item => (
                            <div
                                key={item.id}
                                style={{
                                    padding: "12px",
                                    marginBottom: "9px",
                                    borderRadius: "10px",
                                    background: Number(item.is_read)
                                        ? "#17243a"
                                        : "#1e3652",
                                    border: "1px solid #334155"
                                }}
                            >
                                <strong>{item.title}</strong>

                                <p style={{
                                    color: "#cbd5e1",
                                    fontSize: "13px",
                                    margin: "6px 0"
                                }}>
                                    {item.message}
                                </p>

                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "8px"
                                }}>
                                    {!Number(item.is_read) && (
                                        <button
                                            onClick={() => markAsRead(item.id)}
                                            style={smallButton}
                                        >
                                            Mark read
                                        </button>
                                    )}

                                    <button
                                        onClick={() => deleteNotification(item.id)}
                                        style={{
                                            ...smallButton,
                                            color: "#f87171"
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

const smallButton = {
    background: "transparent",
    border: "none",
    color: "#38bdf8",
    cursor: "pointer",
    fontSize: "12px",
    padding: "4px"
};

export default NotificationBell;