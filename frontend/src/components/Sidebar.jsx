import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
    { path: '/dashboard', icon: '📋', label: 'Dashboard' },
    { path: '/kanban',    icon: '📊', label: 'Kanban Board' },
    { path: '/analytics', icon: '📈', label: 'Analytics' },
];

export default function Sidebar({ stats, onClose }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleNav = (path) => {
        navigate(path);
        onClose?.();
    };

    const xpForNextLevel = (stats?.level || 1) * 100;
    const currentXP = (stats?.xp || 0) % 100;
    const xpProgress = (currentXP / 100) * 100;

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-logo">✦</div>
                <span className="sidebar-title">TaskFlow</span>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section-label">Menu</div>
                {NAV_ITEMS.map(item => (
                    <button
                        key={item.path}
                        className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                        onClick={() => handleNav(item.path)}
                    >
                        <span className="link-icon">{item.icon}</span>
                        {item.label}
                    </button>
                ))}

                <div className="sidebar-section-label" style={{ marginTop: 'auto' }}>Account</div>
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="user-avatar">
                        {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="user-info">
                        <div className="user-name">{user?.name}</div>
                        <div className="user-level">Level {stats?.level || 1}</div>
                    </div>
                </div>

                {/* XP progress bar */}
                <div className="xp-bar-container">
                    <div className="xp-bar-label">
                        <span>{stats?.xp || 0} XP</span>
                        <span>Lvl {(stats?.level || 1) + 1} at {xpForNextLevel} XP</span>
                    </div>
                    <div className="xp-bar-track">
                        <div className="xp-bar-fill" style={{ width: `${xpProgress}%` }} />
                    </div>
                </div>

                {(stats?.streak || 0) > 0 && (
                    <div className="sidebar-streak">
                        🔥 {stats.streak}-day streak
                    </div>
                )}

                <button className="theme-toggle" onClick={toggleTheme}>
                    {theme === 'light' ? '🌙' : '☀️'}
                    <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </button>

                <button className="btn-logout" onClick={handleLogout}>
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
