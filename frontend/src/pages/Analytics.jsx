import { useState, useEffect } from 'react';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';

const BADGE_DEFS = {
    first_task: { icon: '⭐', name: 'First Steps',        desc: 'Complete your first task' },
    ten_tasks:  { icon: '🎯', name: 'Getting Going',      desc: 'Complete 10 tasks' },
    fifty_tasks:{ icon: '🏆', name: 'Power User',         desc: 'Complete 50 tasks' },
    century:    { icon: '💎', name: 'Centurion',           desc: 'Complete 100 tasks' },
    streak_3:   { icon: '🔥', name: 'On Fire',            desc: '3-day streak' },
    streak_7:   { icon: '💪', name: 'Week Warrior',       desc: '7-day streak' },
    streak_14:  { icon: '🌟', name: 'Two Week Hero',      desc: '14-day streak' },
    streak_30:  { icon: '👑', name: 'Monthly Master',     desc: '30-day streak' },
    level_5:    { icon: '🚀', name: 'Rising Star',        desc: 'Reach level 5' },
    level_10:   { icon: '🎖️', name: 'Veteran',            desc: 'Reach level 10' },
};

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Analytics() {
    const [stats, setStats] = useState(null);
    const [weekly, setWeekly] = useState([]);
    const [productivity, setProductivity] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [s, w, p] = await Promise.all([
                api.get('/analytics/stats'),
                api.get('/analytics/weekly'),
                api.get('/analytics/productivity'),
            ]);
            setStats(s.data);
            setWeekly(w.data);
            setProductivity(p.data);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        }
    };

    if (!stats) {
        return (
            <div className="app-layout">
                <Sidebar stats={{}} onClose={() => {}} />
                <main className="main-content">
                    <div className="analytics-content page-enter" style={{ textAlign: 'center', paddingTop: 80 }}>
                        <p style={{ color: 'var(--text-muted)' }}>Loading analytics...</p>
                    </div>
                </main>
            </div>
        );
    }

    const allBadgeKeys = Object.keys(BADGE_DEFS);
    const unlockedSet = new Set(stats.badges || []);
    const maxBar = Math.max(...weekly.map(d => d.total), 1);

    return (
        <div className="app-layout">
            <button className="mobile-toggle" onClick={() => setSidebarOpen(s => !s)}>☰</button>
            <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
            <Sidebar stats={stats} onClose={() => setSidebarOpen(false)} />

            <main className="main-content">
                <div className="analytics-content page-enter">
                    <div className="analytics-header">
                        <h1 className="analytics-title">Analytics</h1>
                        <p className="analytics-subtitle">Your productivity at a glance</p>
                    </div>

                    {/* Top Stats */}
                    <div className="analytics-grid">
                        <div className="analytics-card" style={{ textAlign: 'center' }}>
                            <div className="analytics-card-title">Level</div>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 48,
                                fontWeight: 700,
                                color: 'var(--accent)',
                                lineHeight: 1,
                            }}>
                                {stats.level}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                {stats.xp} XP total
                            </div>
                        </div>

                        <div className="analytics-card" style={{ textAlign: 'center' }}>
                            <div className="analytics-card-title">Completion Rate</div>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 48,
                                fontWeight: 700,
                                color: 'var(--green)',
                                lineHeight: 1,
                            }}>
                                {stats.completionRate}%
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                {stats.completed} of {stats.total} tasks
                            </div>
                        </div>

                        <div className="analytics-card" style={{ textAlign: 'center' }}>
                            <div className="analytics-card-title">Current Streak</div>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 48,
                                fontWeight: 700,
                                color: '#e65100',
                                lineHeight: 1,
                            }}>
                                {stats.streak}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                {stats.streak === 1 ? 'day' : 'days'} in a row
                            </div>
                        </div>
                    </div>

                    {/* Weekly Chart */}
                    <div className="analytics-card" style={{ marginBottom: 16 }}>
                        <div className="analytics-card-title">Weekly Overview</div>
                        <div className="chart-bars">
                            {weekly.map((d, i) => (
                                <div className="chart-col" key={i}>
                                    <div className="chart-value">{d.done}/{d.total}</div>
                                    <div className="chart-bar-wrap">
                                        <div className="chart-bar" style={{
                                            height: d.total > 0 ? `${Math.max((d.total / maxBar) * 100, 10)}%` : '6%',
                                            background: d.pct === 100
                                                ? 'linear-gradient(180deg, #4caf50, #81c784)'
                                                : d.total > 0
                                                    ? `linear-gradient(180deg, var(--accent), var(--accent-light))`
                                                    : 'var(--accent-bg)',
                                        }} />
                                    </div>
                                    <span className="chart-label">{d.day}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Productivity Insights */}
                    {productivity && (
                        <div className="analytics-grid" style={{ marginBottom: 16 }}>
                            <div className="analytics-card">
                                <div className="analytics-card-title">Most Productive Time</div>
                                <div style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: 28,
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    marginBottom: 4,
                                }}>
                                    {productivity.bestHourLabel}
                                </div>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    You complete the most tasks around this hour
                                </p>
                            </div>

                            <div className="analytics-card">
                                <div className="analytics-card-title">Best Day</div>
                                <div style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: 28,
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    marginBottom: 4,
                                }}>
                                    {productivity.bestDay}
                                </div>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    Your most productive day of the week
                                </p>
                            </div>

                            <div className="analytics-card">
                                <div className="analytics-card-title">Activity by Day</div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
                                    {productivity.dayDistribution.map((d, i) => {
                                        const maxCount = Math.max(...productivity.dayDistribution.map(x => x.count), 1);
                                        return (
                                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                                <div style={{
                                                    width: '100%',
                                                    height: `${Math.max((d.count / maxCount) * 40, 4)}px`,
                                                    borderRadius: '3px 3px 0 0',
                                                    background: d.day === productivity.bestDay
                                                        ? 'linear-gradient(180deg, var(--accent), var(--accent-dark))'
                                                        : 'var(--accent-bg)',
                                                }} />
                                                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{d.day[0]}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Badges */}
                    <div className="analytics-card">
                        <div className="analytics-card-title">
                            Badges ({unlockedSet.size}/{allBadgeKeys.length})
                        </div>
                        <div className="badge-grid">
                            {allBadgeKeys.map(key => {
                                const badge = BADGE_DEFS[key];
                                const unlocked = unlockedSet.has(key);
                                return (
                                    <div key={key} className={`badge-item ${unlocked ? 'unlocked' : 'locked'}`}>
                                        <span className="badge-icon">{badge.icon}</span>
                                        <span className="badge-name">{badge.name}</span>
                                        <span className="badge-desc">{badge.desc}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
