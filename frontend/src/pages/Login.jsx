import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "./Login.css";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [toast, setToast] = useState({
        show: false,
        message: "",
        type: "success"
    });

    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const showToast = (message, type = "success") => {
        setToast({
            show: true,
            message,
            type
        });
    };

    const saveLogin = (data) => {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        showToast("Welcome to TaskFlow!");

        setTimeout(() => {
            navigate("/dashboard");
        }, 1000);
    };

    // Normal Email and Password Login
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(
                "https://task-management-system-5tpw.onrender.com/api/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                saveLogin(data);
            } else {
                showToast(
                    data.message || "Invalid email or password",
                    "error"
                );
            }
        } catch (error) {
            showToast("Unable to connect to server", "error");
        } finally {
            setLoading(false);
        }
    };

    // Google Login
    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);

        try {
            const response = await fetch(
                "https://task-management-system-5tpw.onrender.com/api/auth/google",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        credential: credentialResponse.credential
                    }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                saveLogin(data);
            } else {
                showToast(
                    data.message || "Google login failed",
                    "error"
                );
            }
        } catch (error) {
            showToast("Unable to connect to server", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">

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

            <div className="background-glow glow-one"></div>
            <div className="background-glow glow-two"></div>

            <div className="login-container">

                <div className="brand-section">
                    <div className="brand-icon">✓</div>

                    <h1>
                        Task<span>Flow</span>
                    </h1>

                    <h2>
                        Manage your work.
                        <br />
                        Stay in control.
                    </h2>

                    <p>
                        Organize tasks, track progress and keep your
                        work moving forward — all in one place.
                    </p>

                    <div className="feature-list">
                        <div>✓ Easy Task Management</div>
                        <div>✓ Track Your Progress</div>
                        <div>✓ Stay Organized</div>
                    </div>
                </div>

                <div className="login-card">

                    <div className="login-heading">
                        <p className="welcome">WELCOME BACK</p>
                        <h2>Sign in to TaskFlow</h2>
                        <p>Enter your details to continue</p>
                    </div>

                    <form onSubmit={handleLogin}>

                        <div className="input-group">
                            <label>Email Address</label>

                            <div className="input-wrapper">
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
                        </div>

                        <div className="input-group">
                            <label>Password</label>

                            <div className="input-wrapper">
                                <span>🔒</span>

                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    required
                                />

                                <button
                                    type="button"
                                    className="eye-btn"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                >
                                    {showPassword ? "🙈" : "👁"}
                                </button>
                            </div>
                        </div>

                        <button
                            className="login-btn"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Signing In..." : "Sign In"}
                            <span>→</span>
                        </button>

                        <div className="divider">
                            <span>OR CONTINUE WITH</span>
                        </div>

                        <div className="google-login-wrapper">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() =>
                                    showToast(
                                        "Google login failed",
                                        "error"
                                    )
                                }
                                theme="outline"
                                size="large"
                                shape="rectangular"
                                width="280"
                            />
                        </div>

                        <div className="divider">
                            <span>NEW TO TASKFLOW?</span>
                        </div>

                        <button
                            className="create-btn"
                            type="button"
                            onClick={() => navigate("/register")}
                        >
                            Create an Account
                        </button>

                    </form>
                </div>
            </div>

            <div className="footer-text">
                © 2026 TaskFlow · Simple. Smart. Organized.
            </div>

        </div>
    );
}

export default Login;