import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Users, AlertTriangle, CheckCircle, Unlock, RefreshCw, Search } from 'lucide-react';

export default function AdminWorkerControl() {
    const [workers, setWorkers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('tasks'); // 'status' | 'tasks'
    const [searchOrder, setSearchOrder] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [wRes, tRes] = await Promise.all([
                api.get('/workers/public'), // Get all workers
                api.get('/admin/workers/all-tasks') // Need new endpoint
            ]);
            setWorkers(wRes.data);
            setTasks(tRes.data);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleOverride = async (unitId, actionType) => {
        if (!confirm('Are you sure you want to force this action?')) return;

        try {
            await api.post('/admin/workers/override', {
                unitId,
                actionType // 'COMPLETE_PVC', 'COMPLETE_FOIL', etc.
            });
            toast.success('Override Successful');
            fetchData();
        } catch (error) {
            toast.error('Override Failed');
        }
    };

    const unlockTask = async (unitId) => {
        // Logic to remove dependency locks if needed
        toast('Unlock feature coming soon');
    };

    // Filter tasks based on search
    const filteredTasks = tasks.filter(t =>
        !searchOrder || t.OrderItem.Order.id.toString().includes(searchOrder)
    );

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Users className="text-indigo-600" /> Worker Control Panel
            </h1>

            {/* TABS */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`px-4 py-2 font-bold rounded-lg ${activeTab === 'tasks' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500'}`}
                >
                    Task Override
                </button>
                <button
                    onClick={() => setActiveTab('status')}
                    className={`px-4 py-2 font-bold rounded-lg ${activeTab === 'status' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500'}`}
                >
                    Live Status
                </button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : activeTab === 'tasks' ? (
                <div>
                    {/* SEARCH */}
                    <div className="mb-4 flex gap-2">
                        <input
                            type="text"
                            placeholder="Search Order #..."
                            className="border p-2 rounded-lg"
                            value={searchOrder}
                            onChange={e => setSearchOrder(e.target.value)}
                        />
                        <button onClick={fetchData} className="p-2 bg-gray-100 rounded-lg"><RefreshCw size={20} /></button>
                    </div>

                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Unit</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Current Status</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredTasks.map(task => (
                                    <tr key={task.id} className="hover:bg-gray-50">
                                        <td className="p-3">
                                            <div className="font-bold">#{task.unitNumber} - Order #{task.OrderItem.Order.id}</div>
                                            <div className="text-xs text-gray-500">{task.OrderItem.Design.designNumber}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-1 flex-wrap">
                                                {task.isPvcDone && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">PVC</span>}
                                                {task.isFoilDone && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">Foil</span>}
                                                {task.isEmbossDone && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">Emboss</span>}
                                                {task.isDoorMade && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">Door</span>}
                                                {task.isPacked && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">Packed</span>}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-2">
                                                {!task.isPacked && (
                                                    <button
                                                        onClick={() => handleOverride(task.id, 'Force Complete')}
                                                        className="text-indigo-600 font-bold text-xs border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50"
                                                    >
                                                        Force Next Step
                                                    </button>
                                                )}
                                                <button onClick={() => unlockTask(task.id)} className="text-gray-400 hover:text-gray-600">
                                                    <Unlock size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* WORKER STATUS CARDS */}
                    {workers.map(w => (
                        <div key={w.id} className="bg-white p-4 rounded-xl shadow border border-gray-100">
                            <div className="font-black text-lg">{w.name}</div>
                            <div className="text-xs font-bold text-gray-400 uppercase mb-4">{w.role}</div>
                            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                                <span className="block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Online
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
