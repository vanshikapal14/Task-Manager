import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/register', form);
            login(data.token, data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-bg">
            <div className="floating-shapes">
                <div className="shape shape-1" />
                <div className="shape shape-2" />
                <div className="shape shape-3" />
            </div>

            <div className="auth-card" style={{ width: 460, maxWidth: '92vw' }}>
                <div className="step-indicators">
                    <div className="step-dot active" />
                    <div className="step-dot active" />
                    <div className="step-dot" />
                </div>

                <div className="card-badge">✦ Get Started</div>
                <h1 className="card-title">Create Account</h1>
                <p className="card-subtitle">Begin your productivity journey today</p>

                {error && <div className="error-msg">⚠ {error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Full Name</label>
                        <input
                            type="text"
                            placeholder="Your full name"
                            required
                            className="glass-input"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Email Address</label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            required
                            className="glass-input"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <input
                            type="password"
                            placeholder="Min. 6 characters"
                            required
                            minLength={6}
                            className="glass-input"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                        />
                        <p className="password-hint">Must be at least 6 characters</p>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? '✦ Creating account...' : '✦ Create Account'}
                    </button>
                </form>

                <div className="divider">or</div>

                <p className="auth-link">
                    Already have an account? <Link to="/login">Sign in →</Link>
                </p>
            </div>
        </div>
    );
}
