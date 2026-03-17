import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import TaskCard from '../components/TaskCard';
import SearchBar from '../components/SearchBar';

const STATUSES = ['todo', 'in-progress', 'completed'];

const columnLabels = {
    'todo': '📋 Todo',
    'in-progress': '⚡ In Progress',
    'completed': '✅ Done',
};

export default function KanbanBoard() {
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [dragOverCol, setDragOverCol] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        fetchTasks();
        fetchStats();
    }, []);

    const fetchTasks = async () => {
        const { data } = await api.get('/tasks');
        setTasks(data);
    };

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/analytics/stats');
            setStats(data);
        } catch { /* stats are optional */ }
    };

    const toggleStatus = async (task) => {
        const next = { todo: 'in-progress', 'in-progress': 'completed', completed: 'todo' };
        await api.put(`/tasks/${task._id}`, { status: next[task.status] });
        fetchTasks();
        fetchStats();
    };

    const deleteTask = async (id) => {
        if (!confirm('Delete this task?')) return;
        await api.delete(`/tasks/${id}`);
        fetchTasks();
        fetchStats();
    };

    // Drag and drop handlers
    const handleDragStart = (e, task) => {
        e.dataTransfer.setData('taskId', task._id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, status) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(status);
    };

    const handleDragLeave = () => setDragOverCol(null);

    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        setDragOverCol(null);
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;
        await api.put(`/tasks/${taskId}`, { status: newStatus });
        fetchTasks();
        fetchStats();
    };

    const handleSearch = useCallback((q) => setSearchQuery(q), []);

    // Filter tasks by search
    const filtered = tasks.filter(t => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    });

    return (
        <div className="app-layout">
            <button className="mobile-toggle" onClick={() => setSidebarOpen(s => !s)}>☰</button>
            <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
            <Sidebar stats={stats} onClose={() => setSidebarOpen(false)} />
            <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ display: 'none' }} />

            <main className="main-content">
                <div style={{ maxWidth: 1300, margin: '0 auto', padding: '22px' }}>
                    <div style={{ marginBottom: 20 }}>
                        <h1 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 28,
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: 4,
                        }}>
                            Kanban Board
                        </h1>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                            Drag tasks between columns to update their status
                        </p>
                    </div>
                    <SearchBar onSearch={handleSearch} />
                </div>

                <div className="kanban-board">
                    {STATUSES.map(status => {
                        const colTasks = filtered.filter(t => t.status === status);
                        return (
                            <div
                                key={status}
                                className="kanban-column"
                                onDragOver={(e) => handleDragOver(e, status)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, status)}
                            >
                                <div className="kanban-header">
                                    <span className="kanban-title">{columnLabels[status]}</span>
                                    <span className="kanban-count">{colTasks.length}</span>
                                </div>
                                <div className={`kanban-body ${dragOverCol === status ? 'drag-over' : ''}`}>
                                    {colTasks.length === 0 ? (
                                        <div className="kanban-empty">Drop tasks here</div>
                                    ) : (
                                        colTasks.map(task => (
                                            <TaskCard
                                                key={task._id}
                                                task={task}
                                                onToggleStatus={toggleStatus}
                                                onEdit={() => {}}
                                                onDelete={deleteTask}
                                                draggable
                                                onDragStart={handleDragStart}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
