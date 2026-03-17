const priorityConfig = {
    low:    { color: '#4caf50', bg: 'rgba(76,175,80,0.13)',  label: 'Low',  icon: '↓' },
    medium: { color: '#ff9800', bg: 'rgba(255,152,0,0.13)',  label: 'Med',  icon: '→' },
    high:   { color: '#f44336', bg: 'rgba(244,67,54,0.13)',  label: 'High', icon: '↑' },
};

const statusConfig = {
    'todo':        { color: '#9c27b0', bg: 'rgba(156,39,176,0.1)', label: 'Todo' },
    'in-progress': { color: '#e91e63', bg: 'rgba(233,30,99,0.1)',  label: 'In Progress' },
    'completed':   { color: '#4caf50', bg: 'rgba(76,175,80,0.1)',  label: 'Done' },
};

const todayStr = new Date().toISOString().split('T')[0];

export default function TaskCard({ task, onToggleStatus, onEdit, onDelete, draggable, onDragStart }) {
    const pConfig = priorityConfig[task.priority];
    const sConfig = statusConfig[task.status];

    // Build the toggle button's class
    let toggleClass = 'status-toggle';
    if (task.status === 'completed') toggleClass += ' completed';
    else if (task.status === 'in-progress') toggleClass += ' in-progress';

    // Toggle icon
    const toggleIcon = task.status === 'completed' ? '✓' : task.status === 'in-progress' ? '▶' : '';

    return (
        <div
            className={`task-card priority-${task.priority} ${task.status === 'completed' ? 'done' : ''}`}
            draggable={draggable}
            onDragStart={(e) => onDragStart?.(e, task)}
        >
            <button className={toggleClass} onClick={() => onToggleStatus(task)}>
                {toggleIcon}
            </button>

            <div className="task-body">
                <div className="task-top">
                    <h3 className={`task-title ${task.status === 'completed' ? 'crossed' : ''}`}>
                        {task.title}
                    </h3>
                    <span className="priority-badge" style={{ background: pConfig.bg, color: pConfig.color }}>
                        {pConfig.icon} {pConfig.label}
                    </span>
                </div>

                {task.description && <p className="task-desc">{task.description}</p>}

                <div className="task-meta">
                    <span className="status-badge" style={{ background: sConfig.bg, color: sConfig.color }}>
                        {sConfig.label}
                    </span>

                    {task.category && task.category !== 'general' && (
                        <span className="status-badge" style={{ background: 'rgba(33,150,243,0.1)', color: '#1565c0' }}>
                            {task.category}
                        </span>
                    )}

                    {task.deadline ? (
                        <span className="deadline-text">
                            📅 {new Date(task.deadline.includes('T') ? task.deadline : task.deadline + 'T00:00:00')
                                .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {task.deadline.includes('T') && task.deadline.split('T')[1] &&
                             task.deadline.split('T')[1] !== '00:00:00.000Z' &&
                             task.deadline.split('T')[1] !== '00:00:00' && (
                                <span style={{ marginLeft: 4 }}>
                                    🕐 {new Date(task.deadline).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </span>
                            )}
                            {task.deadline.split('T')[0] > todayStr && (
                                <span style={{ color: '#1565c0', marginLeft: 4, fontSize: '10px' }}>· upcoming</span>
                            )}
                        </span>
                    ) : (
                        <span className="deadline-text" style={{ opacity: 0.5 }}>No deadline</span>
                    )}
                </div>
            </div>

            <div className="task-actions">
                <button className="action-btn edit" onClick={() => onEdit(task)}>Edit</button>
                <button className="action-btn delete" onClick={() => onDelete(task._id)}>Del</button>
            </div>
        </div>
    );
}
