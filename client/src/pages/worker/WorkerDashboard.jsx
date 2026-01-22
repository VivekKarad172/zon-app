import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { LogOut, RefreshCw, Check, AlertTriangle, Box } from 'lucide-react';

export default function WorkerDashboard() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const worker = JSON.parse(localStorage.getItem('workerToken'));

    useEffect(() => {
        if (!worker) {
            navigate('/worker/login');
            return;
        }
        fetchTasks();
        const interval = setInterval(fetchTasks, 30000); // 30s Poll
        return () => clearInterval(interval);
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await api.get('/workers/tasks', {
                headers: { 'x-worker-id': worker.id }
            });
            setTasks(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            // Don't toast on poll error to avoid spam
            if (loading) toast.error('Check internet connection');
        }
    };

    const handleLogout = () => {
        if (!confirm('Logout?')) return;
        localStorage.removeItem('workerToken');
        navigate('/worker/login');
    };

    const handleComplete = async (unitId) => {
        // Optimistic Update
        const previousTasks = [...tasks];
        setTasks(tasks.filter(t => t.id !== unitId));

        try {
            await api.post('/workers/complete', {
                workerId: worker.id,
                unitId
            });
            toast.success('MARKED DONE ✅');
            // Check if list empty?
        } catch (error) {
            setTasks(previousTasks); // Revert
            toast.error('Failed. Try again.');
        }
    };

    if (!worker) return null;

    // BASE URL for images
    const BASE_URL = api.defaults.baseURL.replace('/api', '');

    const getRoleParams = (role) => {
        switch (role) {
            case 'PVC_CUT': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
            case 'FOIL_PASTING': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
            case 'EMBOSS': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
            case 'DOOR_MAKING': return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' };
            case 'PACKING': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
            default: return { bg: 'bg-gray-50', text: 'text-gray-700' };
        }
    };
    const theme = getRoleParams(worker.role);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-50">
                <div>
                    <h1 className="text-lg font-black text-gray-900">{worker.name}</h1>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${theme.bg} ${theme.text} border ${theme.border}`}>
                        {worker.role.replace('_', ' ')}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchTasks} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl active:scale-95 shadow-sm border border-indigo-100">
                        <RefreshCw size={20} />
                    </button>
                    <button onClick={handleLogout} className="p-3 bg-gray-100 text-red-500 rounded-xl active:scale-95 shadow-sm border border-gray-200">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
                {loading ? (
                    <div className="text-center py-20 text-gray-400 font-bold animate-pulse">Loading work...</div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <Check size={48} strokeWidth={4} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-wide">All Done!</h2>
                        <p className="text-gray-500 font-bold text-sm mt-2">Waiting for new doors...</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-2 flex justify-between items-end px-2">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Pending List</span>
                            <span className="text-xl font-black text-indigo-600">{tasks.length}</span>
                        </div>

                        {tasks.map(unit => {
                            const item = unit.OrderItem;
                            const design = item?.Design;
                            const color = item?.Color;

                            return (
                                <div key={unit.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative group">
                                    <div className="flex">
                                        {/* Image Section - Left 1/3 */}
                                        <div className="w-1/3 bg-gray-200 relative min-h-[160px]">
                                            {design?.imageUrl ? (
                                                <img
                                                    src={`${BASE_URL}${design.imageUrl}`}
                                                    className="w-full h-full object-cover"
                                                    alt="Design"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400"><Box size={32} /></div>
                                            )}
                                            {color?.imageUrl && (
                                                <div className="absolute bottom-0 right-0 w-12 h-12 border-4 border-white rounded-tl-xl overflow-hidden shadow-lg">
                                                    <img src={`${BASE_URL}${color.imageUrl}`} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content - Right 2/3 */}
                                        <div className="w-2/3 p-5 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="text-3xl font-black text-gray-900 tracking-tighter">
                                                        {item?.designNameSnapshot || design?.designNumber || 'N/A'}
                                                    </div>
                                                    <div className="text-xs font-mono text-gray-300">#{unit.unitNumber}</div>
                                                </div>
                                                <div className="text-sm font-bold text-gray-500 mb-4 truncate">
                                                    {item?.colorNameSnapshot || color?.name || 'N/A'}
                                                </div>

                                                <div className="flex gap-2 flex-wrap">
                                                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-bold uppercase">
                                                        {item?.width}" × {item?.height}"
                                                    </span>
                                                    {item?.remarks && (
                                                        <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md text-xs font-bold uppercase flex items-center gap-1">
                                                            <AlertTriangle size={10} /> Note
                                                        </span>
                                                    )}
                                                </div>
                                                {item?.remarks && (
                                                    <p className="text-[10px] text-yellow-600 mt-2 font-medium bg-yellow-50/50 p-1.5 rounded leading-tight">
                                                        "{item.remarks}"
                                                    </p>
                                                )}
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleComplete(unit.id);
                                                }}
                                                className="w-full mt-4 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-black py-4 rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg uppercase tracking-wide"
                                            >
                                                <Check size={28} strokeWidth={4} /> DONE
                                            </button>
                                        </div>
                                    </div>

                                    {/* Order Ref */}
                                    <div className="absolute bottom-1.5 left-2 text-[8px] font-mono text-gray-300">
                                        {unit.uniqueCode}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}
