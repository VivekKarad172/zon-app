import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function WorkerDashboard() {
    const navigate = useNavigate();
    const worker = JSON.parse(localStorage.getItem('workerToken'));

    const handleLogout = () => {
        localStorage.removeItem('workerToken');
        navigate('/worker/login');
    };

    if (!worker) { navigate('/worker/login'); return null; }

    return (
        <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center justify-center">
            <h1 className="text-3xl font-black mb-4">Worker Dashboard</h1>
            <p className="text-xl mb-8">Hello, {worker.name} ({worker.role})</p>
            <p>Task List Coming Soon...</p>
            <button onClick={handleLogout} className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold mt-8">Exit</button>
        </div>
    );
}
