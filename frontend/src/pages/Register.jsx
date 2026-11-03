import { useState } from "react";
import "./Register.css";

function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [toast, setToast] = useState({
        show: false,
        message: "",
        type: "success"
    });

    const [loading, setLoading] = useState(false);

    const showToast = (message, type = "success") => {
        setToast({
            show: true,
            message,
            type
        });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:5000/api/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                showToast("Account created successfully!");

                setTimeout(() => {
                    window.location.href = "/";
                }, 1500);

            } else {
                showToast(
                    data.message || "Registration failed",
                    "error"
                );
            }

        } catch (error) {
            showToast(
                "Unable to connect to server",
                "error"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">

            {toast.show && (
                <div className={`toast-message ${toast.type}`}>
                    <span className="toast-icon">
                        {toast.type === "success" ? "✓" : "!"}
                    </span>

                    <span>{toast.message}</span>

                    <button
                        type="button"
                        onClick={() =>
                            setToast({ ...toast, show: false })
                        }
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="register-container">

                <div className="register-brand">
                    <div className="register-icon">✓</div>

                    <h1>
                        Task<span>Flow</span>
                    </h1>

                    <h2>Create your account.</h2>

                    <p>
                        Start organizing your tasks and manage
                        your work efficiently.
                    </p>
                </div>

                <div className="register-card">

                    <div className="register-heading">
                        <p>GET STARTED</p>
                        <h2>Create an Account</h2>
                        <span>Enter your details to get started</span>
                    </div>

                    <form onSubmit={handleRegister}>

                        <label>Full Name</label>

                        <div className="register-input">
                            <span>👤</span>

                            <input
                                type="text"
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) =>
                                    setName(e.target.value)
                                }
                                required
                            />
                        </div>

                        <label>Email Address</label>

                        <div className="register-input">
                            <span>✉</span>

                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                required
                            />
                        </div>

                        <label>Password</label>

                        <div className="register-input">
                            <span>🔒</span>

                            <input
                                type={
                                    showPassword ? "text" : "password"
                                }
                                placeholder="Create a password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                required
                                minLength={8}
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() =>
                                    setShowPassword(!showPassword)
                                }
                            >
                                {showPassword ? "🙈" : "👁"}
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="register-submit"
                            disabled={loading}
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                            <span>→</span>
                        </button>

                        <p className="login-text">
                            Already have an account?
                        </p>

                        <button
                            type="button"
                            className="back-login"
                            onClick={() => {
                                window.location.href = "/";
                            }}
                        >
                            Back to Login
                        </button>

                    </form>
                </div>

            </div>
        </div>
    );
}

export default Register;