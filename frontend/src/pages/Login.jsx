import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Login() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', form);
            login(data.token, data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .auth-bg {
          min-height: 100vh;
          background: linear-gradient(135deg, #fff0f6 0%, #fce4ec 30%, #f8bbd0 60%, #f48fb1 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .auth-bg::before {
          content: '';
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,182,193,0.4) 0%, transparent 70%);
          top: -150px;
          right: -150px;
          animation: floatOrb 8s ease-in-out infinite;
        }

        .auth-bg::after {
          content: '';
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,105,135,0.2) 0%, transparent 70%);
          bottom: -100px;
          left: -100px;
          animation: floatOrb 6s ease-in-out infinite reverse;
        }

        @keyframes floatOrb {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }

        .orb-mid {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,20,80,0.12) 0%, transparent 70%);
          top: 40%;
          left: 10%;
          animation: floatOrb 10s ease-in-out infinite;
        }

        .glass-card {
          position: relative;
          z-index: 10;
          width: 420px;
          background: rgba(255, 255, 255, 0.35);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 28px;
          padding: 48px 44px;
          box-shadow:
            0 8px 40px rgba(233, 30, 99, 0.15),
            0 2px 8px rgba(255,255,255,0.8) inset,
            0 -2px 8px rgba(233,30,99,0.08) inset;
          transform-style: preserve-3d;
          animation: cardIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(40px) rotateX(8deg) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) rotateX(0deg) scale(1); }
        }

        .glass-card:hover {
          box-shadow:
            0 16px 60px rgba(233, 30, 99, 0.22),
            0 2px 8px rgba(255,255,255,0.8) inset,
            0 -2px 8px rgba(233,30,99,0.1) inset;
          transform: translateY(-4px);
          transition: all 0.4s ease;
        }

        .card-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, rgba(233,30,99,0.12), rgba(255,64,129,0.08));
          border: 1px solid rgba(233,30,99,0.2);
          border-radius: 50px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 500;
          color: #c2185b;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .card-badge::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #e91e63;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }

        .card-title {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          color: #880e4f;
          margin-bottom: 6px;
          line-height: 1.1;
        }

        .card-subtitle {
          font-size: 14px;
          color: rgba(136,14,79,0.6);
          margin-bottom: 32px;
          font-weight: 300;
        }

        .input-group {
          position: relative;
          margin-bottom: 16px;
        }

        .input-label {
          display: block;
          font-size: 11px;
          font-weight: 500;
          color: #c2185b;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          margin-bottom: 6px;
        }

        .glass-input {
          width: 100%;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.55);
          border: 1.5px solid rgba(233, 30, 99, 0.2);
          border-radius: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          color: #880e4f;
          outline: none;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(233,30,99,0.06), 0 1px 2px rgba(255,255,255,0.8) inset;
        }

        .glass-input::placeholder { color: rgba(194,24,91,0.35); }

        .glass-input:focus {
          background: rgba(255, 255, 255, 0.75);
          border-color: #e91e63;
          box-shadow: 0 0 0 4px rgba(233,30,99,0.1), 0 2px 8px rgba(233,30,99,0.12);
          transform: translateY(-1px);
        }

        .btn-primary {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #e91e63, #c2185b, #ad1457);
          border: none;
          border-radius: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          letter-spacing: 0.5px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(233,30,99,0.4), 0 1px 0 rgba(255,255,255,0.2) inset;
          margin-top: 8px;
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transition: left 0.5s ease;
        }

        .btn-primary:hover::before { left: 100%; }

        .btn-primary:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 10px 30px rgba(233,30,99,0.5);
        }

        .btn-primary:active {
          transform: translateY(0) scale(0.99);
        }

        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .error-msg {
          background: rgba(255,82,82,0.1);
          border: 1px solid rgba(255,82,82,0.3);
          color: #c62828;
          font-size: 13px;
          padding: 10px 14px;
          border-radius: 10px;
          margin-bottom: 16px;
          text-align: center;
        }

        .auth-link {
          text-align: center;
          margin-top: 24px;
          font-size: 14px;
          color: rgba(136,14,79,0.6);
        }

        .auth-link a {
          color: #e91e63;
          font-weight: 500;
          text-decoration: none;
          border-bottom: 1px solid rgba(233,30,99,0.3);
          padding-bottom: 1px;
          transition: border-color 0.2s;
        }

        .auth-link a:hover { border-color: #e91e63; }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
          color: rgba(194,24,91,0.3);
          font-size: 12px;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(233,30,99,0.15);
        }

        .floating-shapes {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }

        .shape {
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid rgba(233,30,99,0.12);
          animation: spinShape 20s linear infinite;
        }

        .shape-1 { width: 100px; height: 100px; top: 10%; left: 5%; animation-duration: 25s; }
        .shape-2 { width: 60px; height: 60px; top: 70%; right: 8%; animation-duration: 18s; border-color: rgba(255,105,135,0.15); }
        .shape-3 { width: 140px; height: 140px; bottom: 10%; left: 15%; animation-duration: 30s; border-color: rgba(233,30,99,0.08); }

        @keyframes spinShape {
          from { transform: rotate(0deg) translate(20px) rotate(0deg); }
          to   { transform: rotate(360deg) translate(20px) rotate(-360deg); }
        }
      `}</style>

            <div className="auth-bg">
                <div className="floating-shapes">
                    <div className="shape shape-1" />
                    <div className="shape shape-2" />
                    <div className="shape shape-3" />
                </div>
                <div className="orb-mid" />

                <div className="glass-card">
                    <div className="card-badge">✦ Welcome Back</div>
                    <h1 className="card-title">Sign In</h1>
                    <p className="card-subtitle">Access your task workspace</p>

                    {error && <div className="error-msg">⚠ {error}</div>}

                    <form onSubmit={handleSubmit}>
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
                                placeholder="Enter your password"
                                required
                                className="glass-input"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                            />
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? '✦ Signing in...' : '✦ Sign In'}
                        </button>
                    </form>

                    <div className="divider">or</div>

                    <p className="auth-link">
                        New here? <Link to="/register">Create an account →</Link>
                    </p>
                </div>
            </div>
        </>
    );
}
