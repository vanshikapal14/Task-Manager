import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['todo', 'in-progress', 'completed'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const empty = { title: '', description: '', priority: 'medium', status: 'todo', deadline: '', deadlineTime: '' };

const priorityConfig = {
    low: { color: '#4caf50', bg: 'rgba(76,175,80,0.13)', label: 'Low', icon: '↓' },
    medium: { color: '#ff9800', bg: 'rgba(255,152,0,0.13)', label: 'Med', icon: '→' },
    high: { color: '#f44336', bg: 'rgba(244,67,54,0.13)', label: 'High', icon: '↑' },
};

const statusConfig = {
    'todo': { color: '#9c27b0', bg: 'rgba(156,39,176,0.1)', label: 'Todo' },
    'in-progress': { color: '#e91e63', bg: 'rgba(233,30,99,0.1)', label: 'In Progress' },
    'completed': { color: '#4caf50', bg: 'rgba(76,175,80,0.1)', label: 'Done' },
};

const toDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const todayStr = toDateStr(new Date());

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [tasks, setTasks] = useState([]);
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [calDate, setCalDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(todayStr);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState('all');

    useEffect(() => { fetchTasks(); }, []);

    const fetchTasks = async () => {
        const { data } = await api.get('/tasks');
        setTasks(data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setError('');
        try {
            const payload = { ...form };
            // Combine date + time into a single deadline ISO string
            if (payload.deadline && payload.deadlineTime) {
                payload.deadline = `${payload.deadline}T${payload.deadlineTime}:00`;
            }
            delete payload.deadlineTime;
            if (editing) { await api.put(`/tasks/${editing}`, payload); setEditing(null); }
            else { await api.post('/tasks', payload); }
            setForm(empty); setShowForm(false); fetchTasks();
        } catch (err) { setError(err.response?.data?.message || 'Error saving task'); }
    };

    const deleteTask = async (id) => {
        if (!confirm('Delete this task?')) return;
        await api.delete(`/tasks/${id}`); fetchTasks();
    };

    const startEdit = (task) => {
        setEditing(task._id);
        // Parse time from deadline if it has a time component
        let deadlineDate = task.deadline?.split('T')[0] || '';
        let deadlineTime = '';
        if (task.deadline && task.deadline.includes('T')) {
            const timePart = task.deadline.split('T')[1];
            if (timePart && timePart !== '00:00:00.000Z' && timePart !== '00:00:00') {
                deadlineTime = timePart.substring(0, 5); // HH:MM
            }
        }
        setForm({ title: task.title, description: task.description || '', priority: task.priority, status: task.status, deadline: deadlineDate, deadlineTime });
        setShowForm(true);
    };

    const toggleStatus = async (task) => {
        const next = { todo: 'in-progress', 'in-progress': 'completed', completed: 'todo' };
        await api.put(`/tasks/${task._id}`, { status: next[task.status] });
        fetchTasks();
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    // ── Calendar grid ──
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

    // ── Day stats map: dateStr → { total, done } ──
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

    // ── Tasks for selected day ──
    const dayTasks = useMemo(() =>
        tasks.filter(t => t.deadline && t.deadline.split('T')[0] === selectedDay),
        [tasks, selectedDay]
    );

    // Tasks without deadline shown only on today
    const noDeadlineTasks = useMemo(() =>
        selectedDay === todayStr ? tasks.filter(t => !t.deadline) : [],
        [tasks, selectedDay]
    );

    const allVisibleTasks = [...dayTasks, ...noDeadlineTasks];
    const filteredTasks = filter === 'all' ? allVisibleTasks : allVisibleTasks.filter(t => t.status === filter);

    // ── Overall stats ──
    const totalDone = tasks.filter(t => t.status === 'completed').length;
    const overallPct = tasks.length ? Math.round((totalDone / tasks.length) * 100) : 0;
    const CIRC = 2 * Math.PI * 26; // r=26

    // ── Streak ──
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

    // ── Selected day labels ──
    const selDateObj = new Date(selectedDay + 'T00:00:00');
    const isToday = selectedDay === todayStr;
    const isFuture = selectedDay > todayStr;
    const selLabel = isToday
        ? 'Today'
        : selDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const handleDayClick = (d) => {
        const ds = toDateStr(new Date(calYear, calMonth, d));
        setSelectedDay(ds);
        setForm(f => ({ ...f, deadline: ds }));
        setShowForm(false);
    };

    // ── 7-day chart data ──
    const weekBars = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - 6 + i);
            const ds = toDateStr(d);
            const st = dayStats[ds] || { total: 0, done: 0 };
            return { ds, day: DAYS_SHORT[d.getDay()], pct: st.total ? Math.round((st.done / st.total) * 100) : 0, hasData: st.total > 0, isToday: ds === todayStr };
        });
    }, [dayStats]);

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --pk:#e91e63;--pk-d:#c2185b;--pk-dd:#880e4f;
          --wg:rgba(255,255,255,0.48);--wg2:rgba(255,255,255,0.32);
          --sh:0 6px 28px rgba(233,30,99,0.14),0 1px 0 rgba(255,255,255,0.72) inset;
          --sh2:0 14px 48px rgba(233,30,99,0.22),0 1px 0 rgba(255,255,255,0.72) inset;
        }
        .root{min-height:100vh;background:linear-gradient(135deg,#fff0f6 0%,#fce4ec 22%,#f8bbd0 52%,#f48fb1 78%,#ec407a 100%);font-family:'DM Sans',sans-serif;position:relative;}
        .root::before,.root::after{content:'';position:fixed;border-radius:50%;pointer-events:none;z-index:0;animation:orb 12s ease-in-out infinite;}
        .root::before{width:720px;height:720px;background:radial-gradient(circle,rgba(255,255,255,0.26) 0%,transparent 65%);top:-260px;right:-190px;}
        .root::after{width:520px;height:520px;background:radial-gradient(circle,rgba(173,20,87,0.13) 0%,transparent 65%);bottom:-190px;left:-130px;animation-direction:reverse;}
        @keyframes orb{0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-35px) scale(1.05);}}

        /* NAV */
        .nav{position:sticky;top:0;z-index:200;background:rgba(255,255,255,0.42);backdrop-filter:blur(22px);border-bottom:1px solid rgba(255,255,255,0.55);padding:0 28px;height:64px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 20px rgba(233,30,99,0.1);}
        .nav-brand{display:flex;align-items:center;gap:11px;}
        .nav-ic{width:36px;height:36px;border-radius:11px;background:linear-gradient(135deg,var(--pk),var(--pk-d));display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(233,30,99,0.4);}
        .nav-tt{font-family:'Playfair Display',serif;font-size:19px;font-weight:700;color:var(--pk-dd);}
        .nav-r{display:flex;align-items:center;gap:14px;}
        .uchip{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,0.55);border:1px solid rgba(233,30,99,0.14);border-radius:50px;padding:5px 14px 5px 7px;}
        .uav{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--pk),var(--pk-d));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:12px;}
        .unm{font-size:13px;color:var(--pk-dd);font-weight:500;}
        .btn-out{padding:7px 16px;background:linear-gradient(135deg,var(--pk),var(--pk-d));border:none;border-radius:9px;color:#fff;font-family:'DM Sans',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;box-shadow:0 4px 12px rgba(233,30,99,0.38);transition:all .25s;}
        .btn-out:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(233,30,99,0.48);}

        /* LAYOUT */
        .layout{max-width:1400px;margin:0 auto;padding:22px 22px;display:grid;grid-template-columns:330px 1fr;gap:20px;position:relative;z-index:1;}
        @media(max-width:960px){.layout{grid-template-columns:1fr;}}

        /* GLASS CARD */
        .gc{background:var(--wg);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,0.68);border-radius:22px;box-shadow:var(--sh);transition:box-shadow .3s,transform .3s;overflow:hidden;}
        .gc:hover{box-shadow:var(--sh2);}

        /* STATS */
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:18px;}
        .sc{background:var(--wg);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.65);border-radius:16px;padding:13px 8px;text-align:center;box-shadow:var(--sh);transition:all .3s cubic-bezier(.34,1.56,.64,1);position:relative;overflow:hidden;}
        .sc::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:3px 3px 0 0;}
        .sc.c1::before{background:linear-gradient(90deg,#e91e63,#f48fb1);}
        .sc.c2::before{background:linear-gradient(90deg,#9c27b0,#ce93d8);}
        .sc.c3::before{background:linear-gradient(90deg,#4caf50,#a5d6a7);}
        .sc.c4::before{background:linear-gradient(90deg,#ff9800,#ffcc80);}
        .sc:hover{transform:translateY(-3px) scale(1.04);}
        .sn{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:var(--pk-dd);}
        .sl{font-size:10px;font-weight:600;color:rgba(136,14,79,0.5);text-transform:uppercase;letter-spacing:1px;margin-top:3px;}

        /* CALENDAR */
        .cal{padding:16px 16px 12px;}
        .calnav{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
        .calmo{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:var(--pk-dd);}
        .calyr{font-size:11px;color:rgba(136,14,79,0.45);margin-left:5px;}
        .calarr{width:27px;height:27px;border-radius:8px;background:rgba(233,30,99,0.1);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--pk-d);font-size:13px;transition:all .2s;}
        .calarr:hover{background:rgba(233,30,99,0.2);transform:scale(1.1);}
        .calgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
        .caldh{text-align:center;font-size:9.5px;font-weight:600;color:rgba(136,14,79,0.38);text-transform:uppercase;letter-spacing:.7px;padding:3px 0 7px;}
        .cell{
          aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
          border-radius:9px;cursor:pointer;position:relative;font-size:11.5px;font-weight:500;
          color:rgba(136,14,79,0.65);transition:all .2s cubic-bezier(.34,1.56,.64,1);
          border:1.5px solid transparent;
        }
        .cell:hover{background:rgba(233,30,99,0.1);transform:scale(1.1);}
        .cell.istoday{background:linear-gradient(135deg,var(--pk),var(--pk-d));color:#fff;box-shadow:0 4px 14px rgba(233,30,99,0.42);border-color:transparent;}
        .cell.istoday .ring-svg{display:none;}
        .cell.isselected:not(.istoday){background:rgba(233,30,99,0.13);border-color:rgba(233,30,99,0.38);color:var(--pk-d);font-weight:700;}
        .cell.alldone:not(.istoday){background:rgba(76,175,80,0.13);border-color:rgba(76,175,80,0.3);}
        .dot-row{display:flex;gap:2px;margin-top:2px;}
        .dot{width:3.5px;height:3.5px;border-radius:50%;}
        .dot-g{background:#4caf50;}
        .dot-p{background:rgba(233,30,99,0.55);}
        .ring-svg{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;}

        /* WEEK CHART */
        .wkchart{padding:12px 16px 14px;border-top:1px solid rgba(233,30,99,0.07);}
        .wct{font-size:9.5px;font-weight:700;color:var(--pk);text-transform:uppercase;letter-spacing:1.6px;margin-bottom:10px;}
        .wkbars{display:flex;gap:6px;align-items:flex-end;height:50px;}
        .wkcol{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;}
        .wkbw{flex:1;display:flex;flex-direction:column;justify-content:flex-end;width:100%;}
        .wkb{width:100%;border-radius:4px 4px 0 0;min-height:3px;transition:height .7s cubic-bezier(.34,1.56,.64,1);}
        .wkd{font-size:9px;font-weight:600;color:rgba(136,14,79,0.42);text-transform:uppercase;}
        .wkd.ct{color:var(--pk);font-weight:700;}

        /* PROGRESS RING */
        .progrow{display:flex;align-items:center;gap:14px;padding:14px 16px;border-top:1px solid rgba(233,30,99,0.07);}
        .pring{position:relative;width:62px;height:62px;flex-shrink:0;}
        .pring svg{transform:rotate(-90deg);}
        .pnum{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:12.5px;font-weight:700;color:var(--pk-dd);}
        .pinf{flex:1;}
        .pt{font-size:11px;font-weight:600;color:rgba(136,14,79,0.55);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;}
        .ps{font-size:11px;color:rgba(136,14,79,0.4);}
        .streak{display:flex;align-items:center;gap:6px;padding:6px 14px;background:linear-gradient(135deg,rgba(255,152,0,0.11),rgba(255,87,34,0.09));border:1px solid rgba(255,152,0,0.24);border-radius:50px;font-size:11px;font-weight:600;color:#e65100;width:fit-content;margin:0 16px 14px;}

        /* RIGHT COLUMN */
        .rcol{display:flex;flex-direction:column;gap:14px;}

        /* DAY HEADER */
        .dayhead{padding:18px 20px 14px;}
        .dhlabel{font-size:9.5px;font-weight:700;color:var(--pk);text-transform:uppercase;letter-spacing:1.8px;margin-bottom:3px;}
        .dhdate{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:var(--pk-dd);line-height:1.1;}
        .dhday{font-size:12px;color:rgba(136,14,79,0.45);margin-top:2px;}
        .dhbadge{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:50px;font-size:11px;font-weight:600;margin-top:8px;}
        .dhbadge.fut{background:rgba(33,150,243,0.1);color:#1565c0;border:1px solid rgba(33,150,243,0.2);}
        .dhbadge.tdy{background:rgba(233,30,99,0.1);color:var(--pk-d);border:1px solid rgba(233,30,99,0.2);}
        .dhbadge.pst{background:rgba(156,39,176,0.09);color:#6a1b9a;border:1px solid rgba(156,39,176,0.18);}
        .dayprog{padding:10px 20px 16px;border-top:1px solid rgba(233,30,99,0.07);}
        .dprow{display:flex;justify-content:space-between;font-size:11px;color:rgba(136,14,79,0.5);margin-bottom:6px;}
        .dprn{font-weight:700;color:var(--pk);}
        .dptrack{height:5px;background:rgba(233,30,99,0.1);border-radius:5px;overflow:hidden;}
        .dpfill{height:100%;background:linear-gradient(90deg,#f48fb1,var(--pk));border-radius:5px;box-shadow:0 0 8px rgba(233,30,99,0.35);transition:width .9s cubic-bezier(.34,1.56,.64,1);}

        /* FILTER + ADD */
        .topbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
        .fbar{display:flex;gap:7px;flex-wrap:wrap;padding:11px 14px;background:var(--wg);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.65);border-radius:16px;box-shadow:var(--sh);flex:1;}
        .fp{padding:6px 13px;border-radius:50px;font-size:11px;font-weight:500;cursor:pointer;transition:all .25s cubic-bezier(.34,1.56,.64,1);border:1.5px solid transparent;font-family:'DM Sans',sans-serif;}
        .fp.off{background:rgba(255,255,255,0.6);border-color:rgba(233,30,99,0.14);color:rgba(136,14,79,0.6);}
        .fp.off:hover{background:rgba(255,255,255,0.85);border-color:rgba(233,30,99,0.3);transform:translateY(-1px);}
        .fp.on{background:linear-gradient(135deg,var(--pk),var(--pk-d));color:#fff;box-shadow:0 4px 12px rgba(233,30,99,0.36);transform:translateY(-1px);}
        .addbtn{display:flex;align-items:center;gap:7px;padding:9px 18px;background:linear-gradient(135deg,var(--pk),var(--pk-d));border:none;border-radius:12px;color:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;box-shadow:0 5px 16px rgba(233,30,99,0.38);transition:all .3s cubic-bezier(.34,1.56,.64,1);white-space:nowrap;}
        .addbtn:hover{transform:translateY(-2px);box-shadow:0 9px 24px rgba(233,30,99,0.48);}

        /* FORM */
        .formpanel{padding:18px 20px;}
        .fptitle{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--pk-dd);margin-bottom:14px;}
        .flbl{display:block;font-size:10px;font-weight:700;color:var(--pk);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:5px;}
        .fi{width:100%;padding:10px 12px;background:rgba(255,255,255,0.58);border:1.5px solid rgba(233,30,99,0.17);border-radius:11px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--pk-dd);outline:none;transition:all .25s;box-shadow:0 2px 6px rgba(233,30,99,0.04);}
        .fi::placeholder{color:rgba(194,24,91,0.28);}
        .fi:focus{background:rgba(255,255,255,0.84);border-color:var(--pk);box-shadow:0 0 0 3px rgba(233,30,99,0.1);transform:translateY(-1px);}
        .fg2{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:10px;}
        .frow{margin-bottom:10px;}
        .fsub{width:100%;padding:11px;background:linear-gradient(135deg,#f06292,var(--pk),var(--pk-d));border:none;border-radius:11px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:#fff;cursor:pointer;box-shadow:0 5px 16px rgba(233,30,99,0.34);transition:all .3s cubic-bezier(.34,1.56,.64,1);}
        .fsub:hover{transform:translateY(-2px);box-shadow:0 9px 24px rgba(233,30,99,0.44);}
        .fcanc{padding:11px 14px;background:rgba(255,255,255,0.5);border:1.5px solid rgba(233,30,99,0.2);border-radius:11px;font-family:'DM Sans',sans-serif;font-size:12px;color:var(--pk-d);cursor:pointer;transition:all .2s;}
        .fcanc:hover{background:rgba(255,255,255,0.8);}
        .fbrow{display:flex;gap:8px;}
        .fbrow .fsub{flex:1;}
        .ferr{background:rgba(255,82,82,0.08);border:1px solid rgba(255,82,82,0.2);color:#c62828;font-size:12px;padding:8px 12px;border-radius:9px;margin-bottom:11px;text-align:center;}
        select.fi{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='%23e91e63' d='M0 0l5 5 5-5z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center;}

        /* TASK CARD */
        .tc{background:rgba(255,255,255,0.52);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.72);border-radius:17px;padding:13px 15px;display:flex;gap:11px;align-items:flex-start;box-shadow:var(--sh);transition:all .3s cubic-bezier(.34,1.56,.64,1);position:relative;overflow:hidden;}
        .tc::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:4px 0 0 4px;}
        .tc.pl::before{background:linear-gradient(180deg,#4caf50,#a5d6a7);}
        .tc.pm::before{background:linear-gradient(180deg,#ff9800,#ffcc80);}
        .tc.ph::before{background:linear-gradient(180deg,#f44336,#ff8a80);}
        .tc:hover{transform:translateX(4px) translateY(-2px);box-shadow:var(--sh2);}
        .tc.tdone{opacity:.62;}
        .stog{width:22px;height:22px;border-radius:50%;border:2px solid rgba(233,30,99,0.28);background:transparent;cursor:pointer;flex-shrink:0;margin-top:1px;transition:all .25s cubic-bezier(.34,1.56,.64,1);display:flex;align-items:center;justify-content:center;font-size:10px;}
        .stog:hover{border-color:var(--pk);transform:scale(1.15);}
        .stog.sd{background:linear-gradient(135deg,#4caf50,#81c784);border-color:#4caf50;color:#fff;box-shadow:0 2px 8px rgba(76,175,80,0.4);}
        .stog.si{background:linear-gradient(135deg,var(--pk),var(--pk-d));border-color:var(--pk);color:#fff;box-shadow:0 2px 8px rgba(233,30,99,0.4);}
        .tbody{flex:1;min-width:0;}
        .ttop{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:2px;}
        .ttit{font-size:13.5px;font-weight:500;color:var(--pk-dd);line-height:1.3;}
        .ttit.x{text-decoration:line-through;color:rgba(136,14,79,0.3);}
        .pbdg{font-size:9px;font-weight:700;padding:2.5px 8px;border-radius:50px;flex-shrink:0;letter-spacing:.5px;text-transform:uppercase;}
        .tdsc{font-size:12px;color:rgba(136,14,79,0.46);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .tmeta{display:flex;gap:9px;align-items:center;flex-wrap:wrap;}
        .sbdg{font-size:9px;font-weight:700;padding:2.5px 9px;border-radius:50px;text-transform:uppercase;letter-spacing:.5px;}
        .dltxt{font-size:10.5px;color:rgba(136,14,79,0.4);}
        .tacts{display:flex;gap:3px;flex-shrink:0;}
        .bic{padding:5px 10px;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;border:none;transition:all .2s;font-family:'DM Sans',sans-serif;}
        .be{background:rgba(233,30,99,0.08);color:var(--pk-d);}
        .be:hover{background:rgba(233,30,99,0.16);transform:translateY(-1px);}
        .bd{background:rgba(244,67,54,0.08);color:#c62828;}
        .bd:hover{background:rgba(244,67,54,0.15);transform:translateY(-1px);}

        /* EMPTY */
        .emp{background:rgba(255,255,255,0.4);backdrop-filter:blur(12px);border:1.5px dashed rgba(233,30,99,0.22);border-radius:20px;padding:48px 20px;text-align:center;}
        .eic{font-size:34px;margin-bottom:10px;opacity:.5;}
        .et{font-family:'Playfair Display',serif;font-size:17px;color:var(--pk-dd);margin-bottom:5px;}
        .es{font-size:12px;color:rgba(136,14,79,0.4);}
      `}</style>

            <div className="root">
                {/* ── NAV ── */}
                <nav className="nav">
                    <div className="nav-brand">
                        <div className="nav-ic">✦</div>
                        <span className="nav-tt">TaskFlow</span>
                    </div>
                    <div className="nav-r">
                        <div className="uchip">
                            <div className="uav">{user?.name?.[0]?.toUpperCase()}</div>
                            <span className="unm">Hello, {user?.name}</span>
                        </div>
                        <button className="btn-out" onClick={handleLogout}>Sign out</button>
                    </div>
                </nav>

                <div className="layout">
                    {/* ══════════ LEFT COLUMN ══════════ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Stats */}
                        <div className="stats">
                            <div className="sc c1"><div className="sn">{tasks.length}</div><div className="sl">Total</div></div>
                            <div className="sc c3"><div className="sn">{totalDone}</div><div className="sl">Done</div></div>
                            <div className="sc c2"><div className="sn">{tasks.filter(t => t.status === 'in-progress').length}</div><div className="sl">Active</div></div>
                            <div className="sc c4"><div className="sn">{tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length}</div><div className="sl">Urgent</div></div>
                        </div>

                        {/* Calendar */}
                        <div className="gc">
                            <div className="cal">
                                {/* Month nav */}
                                <div className="calnav">
                                    <button className="calarr" onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))}>‹</button>
                                    <div>
                                        <span className="calmo">{MONTHS[calMonth]}</span>
                                        <span className="calyr">{calYear}</span>
                                    </div>
                                    <button className="calarr" onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))}>›</button>
                                </div>

                                {/* Day headers */}
                                <div className="calgrid">
                                    {DAYS_SHORT.map(d => <div key={d} className="caldh">{d[0]}</div>)}

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
                                                className={`cell ${isTd ? 'istoday' : ''} ${isSel && !isTd ? 'isselected' : ''} ${allDone && !isTd ? 'alldone' : ''}`}
                                                onClick={() => handleDayClick(d)}>

                                                {/* SVG progress ring */}
                                                {st && !isTd && (
                                                    <svg className="ring-svg" width="28" height="28" viewBox="0 0 28 28">
                                                        <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(233,30,99,0.1)" strokeWidth="2.5" />
                                                        <circle cx="14" cy="14" r={r} fill="none"
                                                            stroke={allDone ? '#4caf50' : '#e91e63'}
                                                            strokeWidth="2.5"
                                                            strokeDasharray={`${fill} ${circ}`}
                                                            strokeLinecap="round"
                                                            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                                                    </svg>
                                                )}

                                                <span style={{ position: 'relative', zIndex: 1 }}>{d}</span>

                                                {st && (
                                                    <div className="dot-row">
                                                        {st.done > 0 && <div className="dot dot-g" />}
                                                        {(st.total - st.done) > 0 && <div className="dot dot-p" />}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 7-Day bar chart */}
                            <div className="wkchart">
                                <div className="wct">7-Day Progress</div>
                                <div className="wkbars">
                                    {weekBars.map((bar, i) => (
                                        <div className="wkcol" key={i} onClick={() => setSelectedDay(bar.ds)} style={{ cursor: 'pointer' }}>
                                            <div className="wkbw">
                                                <div className="wkb" style={{
                                                    height: bar.hasData ? `${Math.max(bar.pct, 10)}%` : '8%',
                                                    background: bar.isToday
                                                        ? 'linear-gradient(180deg,#e91e63,#c2185b)'
                                                        : bar.pct === 100
                                                            ? 'linear-gradient(180deg,#4caf50,#81c784)'
                                                            : bar.hasData
                                                                ? 'linear-gradient(180deg,rgba(233,30,99,0.6),rgba(233,30,99,0.2))'
                                                                : 'rgba(233,30,99,0.08)',
                                                    boxShadow: bar.isToday ? '0 -3px 10px rgba(233,30,99,0.4)' : 'none',
                                                }} />
                                            </div>
                                            <span className={`wkd ${bar.isToday ? 'ct' : ''}`}>{bar.day[0]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Overall progress ring */}
                            <div className="progrow">
                                <div className="pring">
                                    <svg width="62" height="62" viewBox="0 0 64 64">
                                        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(233,30,99,0.1)" strokeWidth="5" />
                                        <circle cx="32" cy="32" r="26" fill="none"
                                            stroke="url(#pgr)" strokeWidth="5"
                                            strokeDasharray={`${(overallPct / 100) * CIRC} ${CIRC}`}
                                            strokeLinecap="round" />
                                        <defs>
                                            <linearGradient id="pgr" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#f48fb1" />
                                                <stop offset="100%" stopColor="#e91e63" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="pnum">{overallPct}%</div>
                                </div>
                                <div className="pinf">
                                    <div className="pt">Overall Progress</div>
                                    <div className="ps">{totalDone} of {tasks.length} complete</div>
                                </div>
                            </div>

                            {streak > 0 && (
                                <div className="streak">🔥 {streak}-day streak — keep going!</div>
                            )}
                        </div>
                    </div>

                    {/* ══════════ RIGHT COLUMN ══════════ */}
                    <div className="rcol">

                        {/* Day Header */}
                        <div className="gc">
                            <div className="dayhead">
                                <div className="dhlabel">
                                    {isToday ? '⚡ Today' : isFuture ? '📅 Scheduled' : '📜 Past Day'}
                                </div>
                                <div className="dhdate">{selLabel}</div>
                                <div className="dhday">
                                    {selDateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                                    &nbsp;·&nbsp;
                                    {allVisibleTasks.length} task{allVisibleTasks.length !== 1 ? 's' : ''}
                                </div>
                                {isFuture && <span className="dhbadge fut">📆 Future — schedule ahead</span>}
                                {isToday && <span className="dhbadge tdy">✦ Tasks due today</span>}
                                {!isToday && !isFuture && <span className="dhbadge pst">Past day</span>}
                            </div>

                            {/* Day-specific progress bar */}
                            {dayStats[selectedDay] && (
                                <div className="dayprog">
                                    <div className="dprow">
                                        <span>Day progress</span>
                                        <span className="dprn">
                                            {dayStats[selectedDay].done}/{dayStats[selectedDay].total} done
                                            &nbsp;({Math.round(dayStats[selectedDay].done / dayStats[selectedDay].total * 100)}%)
                                        </span>
                                    </div>
                                    <div className="dptrack">
                                        <div className="dpfill" style={{
                                            width: `${Math.round(dayStats[selectedDay].done / dayStats[selectedDay].total * 100)}%`
                                        }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Filter + Add */}
                        <div className="topbar">
                            <div className="fbar">
                                {['all', ...STATUSES].map(f => (
                                    <button key={f} className={`fp ${filter === f ? 'on' : 'off'}`} onClick={() => setFilter(f)}>
                                        {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
                                    </button>
                                ))}
                            </div>
                            <button className="addbtn" onClick={() => {
                                setShowForm(s => !s);
                                setEditing(null);
                                setForm({ ...empty, deadline: selectedDay });
                            }}>
                                {showForm ? '✕ Close' : '+ Add Task'}
                            </button>
                        </div>

                        {/* Task Form */}
                        {showForm && (
                            <div className="gc">
                                <div className="formpanel">
                                    <div className="fptitle">{editing ? 'Edit Task' : `New Task · ${selLabel}`}</div>
                                    {error && <div className="ferr">⚠ {error}</div>}
                                    <form onSubmit={handleSubmit}>
                                        <div className="frow">
                                            <label className="flbl">Task Title *</label>
                                            <input type="text" placeholder="What needs to be done?" required className="fi"
                                                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                        </div>
                                        <div className="frow">
                                            <label className="flbl">Description</label>
                                            <textarea placeholder="Add details (optional)..." rows={2} className="fi" style={{ resize: 'none' }}
                                                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                        </div>
                                        <div className="fg2">
                                            <div>
                                                <label className="flbl">Priority</label>
                                                <select className="fi" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="flbl">Status</label>
                                                <select className="fi" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="fg2">
                                            <div>
                                                <label className="flbl">Scheduled Date</label>
                                                <input type="date" className="fi" value={form.deadline}
                                                    onChange={e => setForm({ ...form, deadline: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="flbl">Scheduled Time</label>
                                                <input type="time" className="fi" value={form.deadlineTime}
                                                    onChange={e => setForm({ ...form, deadlineTime: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="fbrow">
                                            <button type="submit" className="fsub">
                                                {editing ? '✦ Update Task' : '✦ Add Task'}
                                            </button>
                                            <button type="button" className="fcanc"
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
                            <div className="emp">
                                <div className="eic">{isFuture ? '🗓️' : isToday ? '🌸' : '📭'}</div>
                                <div className="et">
                                    {isFuture ? 'Nothing scheduled yet'
                                        : isToday ? 'No tasks for today'
                                            : 'No tasks on this day'}
                                </div>
                                <div className="es">
                                    {isFuture
                                        ? 'Click "+ Add Task" to plan ahead for this day'
                                        : isToday
                                            ? 'Add a task to get started!'
                                            : 'No tasks were recorded for this date'}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                                {filteredTasks.map(task => (
                                    <div key={task._id}
                                        className={`tc p${task.priority[0]} ${task.status === 'completed' ? 'tdone' : ''}`}>

                                        <button
                                            className={`stog ${task.status === 'completed' ? 'sd' : task.status === 'in-progress' ? 'si' : ''}`}
                                            onClick={() => toggleStatus(task)}>
                                            {task.status === 'completed' ? '✓' : task.status === 'in-progress' ? '▶' : ''}
                                        </button>

                                        <div className="tbody">
                                            <div className="ttop">
                                                <h3 className={`ttit ${task.status === 'completed' ? 'x' : ''}`}>{task.title}</h3>
                                                <span className="pbdg"
                                                    style={{ background: priorityConfig[task.priority].bg, color: priorityConfig[task.priority].color }}>
                                                    {priorityConfig[task.priority].icon} {priorityConfig[task.priority].label}
                                                </span>
                                            </div>
                                            {task.description && <p className="tdsc">{task.description}</p>}
                                            <div className="tmeta">
                                                <span className="sbdg"
                                                    style={{ background: statusConfig[task.status].bg, color: statusConfig[task.status].color }}>
                                                    {statusConfig[task.status].label}
                                                </span>
                                                {task.deadline
                                                    ? <span className="dltxt">
                                                        📅 {new Date(task.deadline.includes('T') ? task.deadline : task.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        {task.deadline.includes('T') && task.deadline.split('T')[1] && task.deadline.split('T')[1] !== '00:00:00.000Z' && task.deadline.split('T')[1] !== '00:00:00'
                                                            ? <span style={{ marginLeft: 4 }}>🕐 {new Date(task.deadline).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                                                            : null
                                                        }
                                                        {task.deadline.split('T')[0] > todayStr && <span style={{ color: '#1565c0', marginLeft: 4, fontSize: '10px' }}>· upcoming</span>}
                                                    </span>
                                                    : <span className="dltxt" style={{ color: 'rgba(136,14,79,0.28)' }}>No deadline</span>
                                                }
                                            </div>
                                        </div>

                                        <div className="tacts">
                                            <button className="bic be" onClick={() => startEdit(task)}>Edit</button>
                                            <button className="bic bd" onClick={() => deleteTask(task._id)}>Del</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
