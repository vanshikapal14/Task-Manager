import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import TaskCard from '../components/TaskCard';
import SearchBar from '../components/SearchBar';

const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES   = ['todo', 'in-progress', 'completed'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS     = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

const empty = { title: '', description: '', priority: 'medium', status: 'todo', deadline: '', deadlineTime: '', category: '' };

const toDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const todayStr = toDateStr(new Date());

export default function Dashboard() {
    const [tasks, setTasks] = useState([]);
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [calDate, setCalDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(todayStr);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState('all');
    const [stats, setStats] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => { fetchTasks(); fetchStats(); }, []);

    const fetchTasks = async () => {
        const { data } = await api.get('/tasks');
        setTasks(data);
    };

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/analytics/stats');
            setStats(data);
        } catch { /* optional, won't break if analytics unavailable */ }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const payload = { ...form };
            if (payload.deadline && payload.deadlineTime) {
                payload.deadline = `${payload.deadline}T${payload.deadlineTime}:00`;
            }
            delete payload.deadlineTime;
            if (!payload.category) delete payload.category;

            if (editing) {
                await api.put(`/tasks/${editing}`, payload);
                setEditing(null);
            } else {
                await api.post('/tasks', payload);
            }
            setForm(empty);
            setShowForm(false);
            fetchTasks();
            fetchStats();
        } catch (err) {
            setError(err.response?.data?.message || 'Error saving task');
        }
    };

    const deleteTask = async (id) => {
        if (!confirm('Delete this task?')) return;
        await api.delete(`/tasks/${id}`);
        fetchTasks();
        fetchStats();
    };

    const startEdit = (task) => {
        setEditing(task._id);
        let deadlineDate = task.deadline?.split('T')[0] || '';
        let deadlineTime = '';
        if (task.deadline && task.deadline.includes('T')) {
            const timePart = task.deadline.split('T')[1];
            if (timePart && timePart !== '00:00:00.000Z' && timePart !== '00:00:00') {
                deadlineTime = timePart.substring(0, 5);
            }
        }
        setForm({
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            status: task.status,
            deadline: deadlineDate,
            deadlineTime,
            category: task.category || '',
        });
        setShowForm(true);
    };

    const toggleStatus = async (task) => {
        const next = { todo: 'in-progress', 'in-progress': 'completed', completed: 'todo' };
        await api.put(`/tasks/${task._id}`, { status: next[task.status] });
        fetchTasks();
        fetchStats();
    };

    const handleSearch = useCallback((q) => setSearchQuery(q), []);

    // Calendar
    const calYear = calDate.getFullYear();
    const calMonth = calDate.getMonth();

    const calCells = useMemo(() => {
        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        return cells;
    }, [calYear, calMonth]);

    const dayStats = useMemo(() => {
        const map = {};
        tasks.forEach(t => {
            if (!t.deadline) return;
            const ds = t.deadline.split('T')[0];
            if (!map[ds]) map[ds] = { total: 0, done: 0 };
            map[ds].total++;
            if (t.status === 'completed') map[ds].done++;
        });
        return map;
    }, [tasks]);

    const dayTasks = useMemo(() =>
        tasks.filter(t => t.deadline && t.deadline.split('T')[0] === selectedDay),
        [tasks, selectedDay]
    );

    const noDeadlineTasks = useMemo(() =>
        selectedDay === todayStr ? tasks.filter(t => !t.deadline) : [],
        [tasks, selectedDay]
    );

    const allVisibleTasks = [...dayTasks, ...noDeadlineTasks];

    // Apply status filter + search
    let filteredTasks = filter === 'all' ? allVisibleTasks : allVisibleTasks.filter(t => t.status === filter);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filteredTasks = filteredTasks.filter(t =>
            t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
        );
    }

    // Stats
    const totalDone = tasks.filter(t => t.status === 'completed').length;
    const overallPct = tasks.length ? Math.round((totalDone / tasks.length) * 100) : 0;
    const CIRC = 2 * Math.PI * 26;

    // Streak (client-side calc for immediate display)
    const streak = useMemo(() => {
        let s = 0, d = new Date();
        for (let i = 0; i < 60; i++) {
            const ds = toDateStr(d);
            const st = dayStats[ds];
            if (st && st.total > 0 && st.done === st.total) s++;
            else if (i > 0) break;
            d.setDate(d.getDate() - 1);
        }
        return s;
    }, [dayStats]);

    // Selected day
    const selDateObj = new Date(selectedDay + 'T00:00:00');
    const isToday = selectedDay === todayStr;
    const isFuture = selectedDay > todayStr;
    const selLabel = isToday ? 'Today' : selDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const handleDayClick = (d) => {
        const ds = toDateStr(new Date(calYear, calMonth, d));
        setSelectedDay(ds);
        setForm(f => ({ ...f, deadline: ds }));
        setShowForm(false);
    };

    // 7 day chart
    const weekBars = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - 6 + i);
            const ds = toDateStr(d);
            const st = dayStats[ds] || { total: 0, done: 0 };
            return {
                ds, day: DAYS_SHORT[d.getDay()],
                pct: st.total ? Math.round((st.done / st.total) * 100) : 0,
                hasData: st.total > 0,
                isToday: ds === todayStr,
            };
        });
    }, [dayStats]);

    return (
        <div className="app-layout">
            <button className="mobile-toggle" onClick={() => setSidebarOpen(s => !s)}>☰</button>
            <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
            <Sidebar stats={{ ...stats, streak: streak || stats.streak }} onClose={() => setSidebarOpen(false)} />

            <main className="main-content">
                <div className="dash-content page-enter">
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Stats */}
                        <div className="stats-grid">
                            <div className="stat-card pink">
                                <div className="stat-number">{tasks.length}</div>
                                <div className="stat-label">Total</div>
                            </div>
                            <div className="stat-card green">
                                <div className="stat-number">{totalDone}</div>
                                <div className="stat-label">Done</div>
                            </div>
                            <div className="stat-card purple">
                                <div className="stat-number">{tasks.filter(t => t.status === 'in-progress').length}</div>
                                <div className="stat-label">Active</div>
                            </div>
                            <div className="stat-card orange">
                                <div className="stat-number">{tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length}</div>
                                <div className="stat-label">Urgent</div>
                            </div>
                        </div>

                        {/* Calendar */}
                        <div className="glass-card">
                            <div className="cal-section">
                                <div className="cal-nav">
                                    <button className="cal-arrow" onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))}>‹</button>
                                    <div>
                                        <span className="cal-month">{MONTHS[calMonth]}</span>
                                        <span className="cal-year">{calYear}</span>
                                    </div>
                                    <button className="cal-arrow" onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))}>›</button>
                                </div>

                                <div className="cal-grid">
                                    {DAYS_SHORT.map(d => <div key={d} className="cal-day-header">{d[0]}</div>)}
                                    {calCells.map((d, i) => {
                                        if (!d) return <div key={`e${i}`} />;
                                        const ds = toDateStr(new Date(calYear, calMonth, d));
                                        const st = dayStats[ds];
                                        const isTd = ds === todayStr;
                                        const isSel = ds === selectedDay;
                                        const allDone = st && st.done === st.total && st.total > 0;
                                        const r = 11;
                                        const circ = 2 * Math.PI * r;
                                        const fill = st ? (st.done / st.total) * circ : 0;

                                        return (
                                            <div key={d}
                                                className={`cal-cell ${isTd ? 'today' : ''} ${isSel && !isTd ? 'selected' : ''} ${allDone && !isTd ? 'all-done' : ''}`}
                                                onClick={() => handleDayClick(d)}>
                                                {st && !isTd && (
                                                    <svg className="ring-svg" width="28" height="28" viewBox="0 0 28 28">
                                                        <circle cx="14" cy="14" r={r} fill="none" stroke="var(--accent-bg)" strokeWidth="2.5" />
                                                        <circle cx="14" cy="14" r={r} fill="none"
                                                            stroke={allDone ? 'var(--green)' : 'var(--accent)'}
                                                            strokeWidth="2.5"
                                                            strokeDasharray={`${fill} ${circ}`}
                                                            strokeLinecap="round"
                                                            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                                                    </svg>
                                                )}
                                                <span style={{ position: 'relative', zIndex: 1 }}>{d}</span>
                                                {st && (
                                                    <div className="dot-row">
                                                        {st.done > 0 && <div className="dot dot-green" />}
                                                        {(st.total - st.done) > 0 && <div className="dot dot-pink" />}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 7-Day chart */}
                            <div className="week-chart">
                                <div className="week-chart-title">7-Day Progress</div>
                                <div className="week-bars">
                                    {weekBars.map((bar, i) => (
                                        <div className="week-col" key={i} onClick={() => setSelectedDay(bar.ds)} style={{ cursor: 'pointer' }}>
                                            <div className="week-bar-wrap">
                                                <div className="week-bar" style={{
                                                    height: bar.hasData ? `${Math.max(bar.pct, 10)}%` : '8%',
                                                    background: bar.isToday
                                                        ? 'linear-gradient(180deg, var(--accent), var(--accent-dark))'
                                                        : bar.pct === 100
                                                            ? 'linear-gradient(180deg, var(--green), #81c784)'
                                                            : bar.hasData
                                                                ? 'linear-gradient(180deg, rgba(233,30,99,0.6), rgba(233,30,99,0.2))'
                                                                : 'var(--accent-bg)',
                                                    boxShadow: bar.isToday ? '0 -3px 10px rgba(233,30,99,0.4)' : 'none',
                                                }} />
                                            </div>
                                            <span className={`week-day ${bar.isToday ? 'current' : ''}`}>{bar.day[0]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Overall progress */}
                            <div className="progress-row">
                                <div className="progress-ring">
                                    <svg width="62" height="62" viewBox="0 0 64 64">
                                        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--accent-bg)" strokeWidth="5" />
                                        <circle cx="32" cy="32" r="26" fill="none"
                                            stroke="url(#pgr)" strokeWidth="5"
                                            strokeDasharray={`${(overallPct / 100) * CIRC} ${CIRC}`}
                                            strokeLinecap="round" />
                                        <defs>
                                            <linearGradient id="pgr" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="var(--accent-light)" />
                                                <stop offset="100%" stopColor="var(--accent)" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="progress-number">{overallPct}%</div>
                                </div>
                                <div className="progress-info">
                                    <div className="progress-title">Overall Progress</div>
                                    <div className="progress-sub">{totalDone} of {tasks.length} complete</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Day header */}
                        <div className="glass-card">
                            <div className="day-header">
                                <div className="day-label">
                                    {isToday ? '⚡ Today' : isFuture ? '📅 Scheduled' : '📜 Past Day'}
                                </div>
                                <div className="day-date">{selLabel}</div>
                                <div className="day-info">
                                    {selDateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                                    &nbsp;·&nbsp;
                                    {allVisibleTasks.length} task{allVisibleTasks.length !== 1 ? 's' : ''}
                                </div>
                                {isFuture && <span className="day-badge future">📆 Future — schedule ahead</span>}
                                {isToday && <span className="day-badge today">✦ Tasks due today</span>}
                                {!isToday && !isFuture && <span className="day-badge past">Past day</span>}
                            </div>

                            {dayStats[selectedDay] && (
                                <div className="day-progress">
                                    <div className="day-progress-row">
                                        <span>Day progress</span>
                                        <span className="day-progress-num">
                                            {dayStats[selectedDay].done}/{dayStats[selectedDay].total} done
                                            &nbsp;({Math.round(dayStats[selectedDay].done / dayStats[selectedDay].total * 100)}%)
                                        </span>
                                    </div>
                                    <div className="day-progress-track">
                                        <div className="day-progress-fill" style={{
                                            width: `${Math.round(dayStats[selectedDay].done / dayStats[selectedDay].total * 100)}%`
                                        }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Search */}
                        <SearchBar onSearch={handleSearch} />

                        {/* Filter + Add */}
                        <div className="topbar">
                            <div className="filter-bar">
                                {['all', ...STATUSES].map(f => (
                                    <button key={f} className={`filter-btn ${filter === f ? 'on' : 'off'}`} onClick={() => setFilter(f)}>
                                        {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
                                    </button>
                                ))}
                            </div>
                            <button className="add-btn" onClick={() => {
                                setShowForm(s => !s);
                                setEditing(null);
                                setForm({ ...empty, deadline: selectedDay });
                            }}>
                                {showForm ? '✕ Close' : '+ Add Task'}
                            </button>
                        </div>

                        {/* Task Form */}
                        {showForm && (
                            <div className="glass-card">
                                <div className="form-panel">
                                    <div className="form-title">{editing ? 'Edit Task' : `New Task · ${selLabel}`}</div>
                                    {error && <div className="form-error">⚠ {error}</div>}
                                    <form onSubmit={handleSubmit}>
                                        <div className="form-row">
                                            <label className="form-label">Task Title *</label>
                                            <input type="text" placeholder="What needs to be done?" required className="form-input"
                                                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                        </div>
                                        <div className="form-row">
                                            <label className="form-label">Description</label>
                                            <textarea placeholder="Add details (optional)..." rows={2} className="form-input" style={{ resize: 'none' }}
                                                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                        </div>
                                        <div className="form-grid">
                                            <div>
                                                <label className="form-label">Priority</label>
                                                <select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">Status</label>
                                                <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="form-grid">
                                            <div>
                                                <label className="form-label">Scheduled Date</label>
                                                <input type="date" className="form-input" value={form.deadline}
                                                    onChange={e => setForm({ ...form, deadline: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="form-label">Scheduled Time</label>
                                                <input type="time" className="form-input" value={form.deadlineTime}
                                                    onChange={e => setForm({ ...form, deadlineTime: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <label className="form-label">Category</label>
                                            <input type="text" placeholder="e.g. work, personal, study" className="form-input"
                                                value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                                        </div>
                                        <div className="form-actions">
                                            <button type="submit" className="form-submit">
                                                {editing ? '✦ Update Task' : '✦ Add Task'}
                                            </button>
                                            <button type="button" className="form-cancel"
                                                onClick={() => { setShowForm(false); setEditing(null); setForm(empty); }}>
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Task List */}
                        {filteredTasks.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">{isFuture ? '🗓️' : isToday ? '🌸' : '📭'}</div>
                                <div className="empty-title">
                                    {isFuture ? 'Nothing scheduled yet' : isToday ? 'No tasks for today' : 'No tasks on this day'}
                                </div>
                                <div className="empty-sub">
                                    {isFuture ? 'Click "+ Add Task" to plan ahead' : isToday ? 'Add a task to get started!' : 'No tasks recorded for this date'}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                                {filteredTasks.map(task => (
                                    <TaskCard
                                        key={task._id}
                                        task={task}
                                        onToggleStatus={toggleStatus}
                                        onEdit={startEdit}
                                        onDelete={deleteTask}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
