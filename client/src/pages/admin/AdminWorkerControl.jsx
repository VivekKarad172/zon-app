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
    const [expandedOrderId, setExpandedOrderId] = useState(null); // NEW: Separate state for expansion

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            console.log('AdminWorkerControl: Fetching data...');

            const [wRes, tRes] = await Promise.all([
                api.get('/workers/public'), // Get all workers
                api.get('/workers/admin/all-tasks') // Corrected path
            ]);

            console.log('Workers received:', wRes.data.length);
            console.log('Tasks received:', tRes.data.length);

            setWorkers(wRes.data || []);
            setTasks(tRes.data || []);

            toast.success(`Loaded ${tRes.data.length} tasks`);
        } catch (error) {
            console.error('AdminWorkerControl fetch error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);

            const errorMsg = error.response?.data?.error || error.message || 'Failed to load data';
            toast.error(`Error: ${errorMsg}`);

            // Set empty arrays to prevent crashes
            setWorkers([]);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOverride = async (unitId, actionType) => {
        if (!confirm('Are you sure you want to force this action?')) return;

        try {
            await api.post('/workers/admin/override', { // Corrected path
                unitId,
                actionType // 'Force Complete'
            });
            toast.success('Override Successful');
            fetchData();
        } catch (error) {
            console.error('Override error:', error);
            toast.error(error.response?.data?.error || 'Override Failed');
        }
    };

    const unlockTask = async (unitId) => {
        // Logic to remove dependency locks if needed
        toast('Unlock feature coming soon');
    };

    // Filter tasks based on search - with safe property access
    const filteredTasks = tasks.filter(t => {
        if (!searchOrder) return true;
        return t?.OrderItem?.Order?.id?.toString().includes(searchOrder);
    });

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

                    {/* GROUPED TASKS VIEW */}
                    <div className="space-y-4">
                        {Object.entries(
                            filteredTasks.reduce((acc, task) => {
                                const orderId = task?.OrderItem?.Order?.id || 'Unknown';
                                if (!acc[orderId]) acc[orderId] = [];
                                acc[orderId].push(task);
                                return acc;
                            }, {})
                        ).map(([orderId, orderTasks]) => {
                            const isExpanded = expandedOrderId === orderId || searchOrder; // Auto-expand if searching
                            const totalUnits = orderTasks.length;
                            const completedUnits = orderTasks.filter(t => t.isPacked).length; // Packed = fully done
                            const progress = Math.round((completedUnits / totalUnits) * 100);

                            return (
                                <div key={orderId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    {/* ORDER HEADER */}
                                    <div
                                        onClick={() => setExpandedOrderId(isExpanded ? null : orderId)} // Correctly toggle expansion
                                        className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="bg-indigo-600 text-white font-black text-lg w-10 h-10 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
                                                {orderId === 'Unknown' ? '?' : orderId}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">Order #{orderId}</h3>
                                                <p className="text-xs text-gray-500 font-bold">{totalUnits} Units • {progress}% Complete</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                            </div>
                                            <div className="text-gray-400">
                                                {isExpanded ? '▲' : '▼'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ORDER TASKS TABLE (Collapsible) */}
                                    {(isExpanded || searchOrder) && (
                                        <div className="border-t border-gray-100">
                                            <table className="w-full text-left">
                                                <thead className="bg-white text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    <tr>
                                                        <th className="p-3 pl-4">Unit</th>
                                                        <th className="p-3">Design</th>
                                                        <th className="p-3">Status</th>
                                                        <th className="p-3">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {orderTasks.map(task => (
                                                        <tr key={task.id} className="hover:bg-indigo-50/30 transition-colors">
                                                            <td className="p-3 pl-4 font-bold text-indigo-900">#{task.unitNumber}</td>
                                                            <td className="p-3 text-sm font-medium">
                                                                {task?.OrderItem?.Design?.designNumber || 'N/A'} <span className="text-gray-400 text-xs">({task?.OrderItem?.Color?.name})</span>
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="flex gap-1 flex-wrap">
                                                                    {task.isPvcDone ? <span className="w-2 h-2 rounded-full bg-green-500" title="PVC Done"></span> : <span className="w-2 h-2 rounded-full bg-gray-200" title="PVC Pending"></span>}
                                                                    {task.isFoilDone ? <span className="w-2 h-2 rounded-full bg-green-500" title="Foil Done"></span> : <span className="w-2 h-2 rounded-full bg-gray-200" title="Foil Pending"></span>}
                                                                    {task.isEmbossDone ? <span className="w-2 h-2 rounded-full bg-green-500" title="Emboss Done"></span> : <span className="w-2 h-2 rounded-full bg-gray-200" title="Emboss Pending"></span>}
                                                                    {task.isDoorMade ? <span className="w-2 h-2 rounded-full bg-green-500" title="Door Done"></span> : <span className="w-2 h-2 rounded-full bg-gray-200" title="Door Pending"></span>}
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase">
                                                                    {!task.isPvcDone ? 'PVC Pending' : !task.isFoilDone ? 'Foil Pending' : !task.isEmbossDone ? 'Emboss Pending' : !task.isDoorMade ? 'Door Pending' : 'Packing'}
                                                                </div>
                                                            </td>
                                                            <td className="p-3">
                                                                {!task.isPacked && (
                                                                    <button
                                                                        onClick={() => handleOverride(task.id, 'Force Complete')}
                                                                        className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                                                    >
                                                                        Force Next
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {filteredTasks.length === 0 && (
                            <div className="text-center p-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                                <Search size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-bold">No tasks found</p>
                                <p className="text-sm">Try searching for a different order.</p>
                            </div>
                        )}
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
