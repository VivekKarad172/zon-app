import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { LogOut, RefreshCw, Check, Lock, AlertOctagon, Box } from 'lucide-react';

export default function WorkerDashboard() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const worker = JSON.parse(localStorage.getItem('workerToken'));

    // ROLE CONFIGURATION
    const ROLE_MAP = {
        'PVC_CUT': { flag: 'isPvcDone', deps: [], label: 'PVC Cut' },
        'FOIL_PASTING': { flag: 'isFoilDone', deps: [], label: 'Foil Pasting' },
        'EMBOSS': { flag: 'isEmbossDone', deps: ['isFoilDone'], depLabels: ['Foil'] },
        'DOOR_MAKING': { flag: 'isDoorMade', deps: ['isPvcDone', 'isFoilDone', 'isEmbossDone'], depLabels: ['PVC', 'Foil', 'Emboss'] },
        'PACKING': { flag: 'isPacked', deps: ['isDoorMade'], depLabels: ['Door Assembly'] }
    };

    const myRole = worker ? ROLE_MAP[worker.role] : null;

    useEffect(() => {
        if (!worker) {
            navigate('/worker/login');
            return;
        }
        fetchTasks();
        const interval = setInterval(fetchTasks, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await api.get('/workers/tasks', {
                headers: { 'x-worker-id': worker.id }
            });
            // Filter out tasks I have already done
            const pendingTasks = res.data.filter(t => !t[myRole.flag]);

            // Sort: High Priority First
            const sorted = pendingTasks.sort((a, b) => {
                const aPrio = checkPriority(a) ? 1 : 0;
                const bPrio = checkPriority(b) ? 1 : 0;
                return bPrio - aPrio; // High prio first
            });

            setTasks(sorted);
            setLoading(false);
        } catch (error) {
            console.error(error);
        }
    };

    const checkPriority = (unit) => {
        // Logic: Is downstream waiting ONLY for me?
        // PVC: If Foil & Emboss done (Door Making blocked by PVC)
        if (worker.role === 'PVC_CUT') {
            return unit.isFoilDone && unit.isEmbossDone;
        }
        // FOIL: If PVC done? (Door Making blocked by Foil + Emboss). Or if Emboss waiting?
        // Emboss waits for Foil. So if a unit exists, Emboss is waiting. 
        // So Foil is always high priority? Or maybe exclude if nothing else ready.
        // Let's say: If PVC done (Door Making starting soon).
        if (worker.role === 'FOIL_PASTING') {
            return unit.isPvcDone;
        }
        // EMBOSS: If Foil Done (I can start) AND PVC Done (Door Waiting).
        if (worker.role === 'EMBOSS') {
            return unit.isFoilDone && unit.isPvcDone;
        }
        return false;
    };

    const checkDependencies = (unit) => {
        if (!myRole.deps) return { locked: false };
        const missing = myRole.deps.filter(key => !unit[key]);
        if (missing.length > 0) {
            // Find labels
            const labels = missing.map(k => {
                const r = Object.values(ROLE_MAP).find(v => v.flag === k);
                return r ? r.label : k;
            });
            return { locked: true, reason: `Waiting for: ${labels.join(', ')}` };
        }
        return { locked: false };
    };

    const handleComplete = async (unitId) => {
        try {
            // Optimistic update? No, wait for confirmation due to generic "Locked" state risk
            await api.post('/workers/complete', {
                workerId: worker.id,
                unitId
            });
            toast.success('Done!');
            fetchTasks(); // Refresh to remove from list
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed');
        }
    };

    const handleLogout = () => {
        if (!confirm('Logout?')) return;
        localStorage.removeItem('workerToken');
        navigate('/worker/login');
    };

    if (!worker || !myRole) return null;

    const BASE_URL = api.defaults.baseURL.replace('/api', '');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-50">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">{worker.name}</h1>
                    <div className="text-xs font-bold uppercase text-indigo-600 tracking-widest">{myRole.label} DEPT</div>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchTasks} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl active:scale-95 shadow-sm">
                        <RefreshCw size={20} />
                    </button>
                    <button onClick={handleLogout} className="p-3 bg-red-50 text-red-500 rounded-xl active:scale-95 shadow-sm">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 p-4 max-w-xl mx-auto w-full space-y-4">
                {loading ? (
                    <div className="text-center py-20 text-gray-400 font-bold animate-pulse">Loading Floor Status...</div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <Check size={48} strokeWidth={4} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-wide">All Clear</h2>
                        <p className="text-gray-500 font-bold text-sm mt-2">No pending work for you.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-end px-2 mb-2">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Queue ({tasks.length})</span>
                        </div>

                        {tasks.map(unit => {
                            const item = unit.OrderItem;
                            const design = item?.Design;
                            const color = item?.Color;
                            const { locked, reason } = checkDependencies(unit);
                            const isHighPriority = checkPriority(unit);

                            return (
                                <div key={unit.id} className={`bg-white rounded-3xl shadow-sm border overflow-hidden relative group ${isHighPriority ? 'border-red-500 ring-4 ring-red-50' : 'border-gray-200'}`}>

                                    {isHighPriority && (
                                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl z-10 flex items-center gap-1">
                                            <AlertOctagon size={12} /> High Priority
                                        </div>
                                    )}

                                    <div className="flex">
                                        {/* Image Section */}
                                        <div className="w-1/3 bg-gray-100 relative min-h-[180px]">
                                            {design?.imageUrl ? (
                                                <img
                                                    src={`${BASE_URL}${design.imageUrl}`}
                                                    className={`w-full h-full object-cover ${locked ? 'grayscale opacity-70' : ''}`}
                                                    alt="Design"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300"><Box size={32} /></div>
                                            )}
                                            {/* Color Overlay */}
                                            {color?.imageUrl && (
                                                <div className="absolute bottom-0 right-0 w-12 h-12 border-4 border-white rounded-tl-xl overflow-hidden shadow-lg">
                                                    <img src={`${BASE_URL}${color.imageUrl}`} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="w-2/3 p-5 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="text-3xl font-black text-gray-900 tracking-tighter">
                                                        {item?.designNameSnapshot || design?.designNumber || 'N/A'}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">ID #{unit.unitNumber}</div>
                                                </div>

                                                <div className="text-sm font-bold text-gray-500 mb-3 truncate">
                                                    {item?.colorNameSnapshot || color?.name || 'N/A'}
                                                </div>

                                                <div className="flex gap-2 mb-3">
                                                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-bold uppercase">
                                                        {item?.width}" × {item?.height}"
                                                    </span>
                                                </div>

                                                {/* Dependency Status Tags */}
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {/* Show statuses of OTHER stages to help human judgment */}
                                                    <StatusBadge label="PVC" done={unit.isPvcDone} />
                                                    <StatusBadge label="Foil" done={unit.isFoilDone} />
                                                    <StatusBadge label="Emb" done={unit.isEmbossDone} />
                                                </div>
                                            </div>

                                            {locked ? (
                                                <button disabled className="w-full bg-gray-100 text-gray-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed text-xs uppercase tracking-wide">
                                                    <Lock size={16} /> {reason}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleComplete(unit.id)}
                                                    className={`w-full py-3 rounded-xl font-black text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-lg uppercase tracking-wide ${isHighPriority ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-green-500 hover:bg-green-600 shadow-green-200'}`}
                                                >
                                                    <Check size={24} strokeWidth={4} /> Mark Done
                                                </button>
                                            )}
                                        </div>
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

function StatusBadge({ label, done }) {
    return (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${done ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
            {label}
        </span>
    );
}
