import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Users from "./pages/user";
import Tasks from "./pages/Tasks";
import AIAssistant from "./pages/AIAssistant";

// ADMIN ROUTE PROTECTION
function AdminRoute({ children }) {
    const token = localStorage.getItem("token");

    let user = null;

    try {
        user = JSON.parse(
            localStorage.getItem("user") || "null"
        );
    } catch (error) {
        user = null;
    }

    if (!token || !user) {
        return <Navigate to="/" replace />;
    }

    if (user.role !== "admin") {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />

                <Route
                    path="/users"
                    element={
                        <AdminRoute>
                            <Users />
                        </AdminRoute>
                    }
                />

                <Route path="/tasks" element={<Tasks />} />
                <Route path="/ai-tutor" element={<AIAssistant />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;