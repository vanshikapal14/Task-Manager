import { useState, useEffect } from 'react';

export default function SearchBar({ onSearch }) {
    const [query, setQuery] = useState('');

    // Debounce so we don't fire on every keystroke
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch(query.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [query, onSearch]);

    return (
        <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
                type="text"
                className="search-input"
                placeholder="Search tasks..."
                value={query}
                onChange={e => setQuery(e.target.value)}
            />
        </div>
    );
}
