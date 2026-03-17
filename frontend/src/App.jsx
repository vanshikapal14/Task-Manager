import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import KanbanBoard from './pages/KanbanBoard';
import Analytics from './pages/Analytics';

function PrivateRoute({ children }) {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/" element={
                            <PrivateRoute><Dashboard /></PrivateRoute>
                        } />
                        <Route path="/dashboard" element={
                            <PrivateRoute><Dashboard /></PrivateRoute>
                        } />
                        <Route path="/kanban" element={
                            <PrivateRoute><KanbanBoard /></PrivateRoute>
                        } />
                        <Route path="/analytics" element={
                            <PrivateRoute><Analytics /></PrivateRoute>
                        } />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}
