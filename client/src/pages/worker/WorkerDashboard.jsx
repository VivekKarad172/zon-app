import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { LogOut, RefreshCw, Check, Lock, AlertOctagon, Box, Ruler, User } from 'lucide-react';

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
                return bPrio - aPrio;
            });

            setTasks(sorted);
            setLoading(false);
        } catch (error) {
            console.error(error);
        }
    };

    const checkPriority = (unit) => {
        if (worker.role === 'PVC_CUT') return unit.isFoilDone && unit.isEmbossDone;
        if (worker.role === 'FOIL_PASTING') return unit.isPvcDone;
        if (worker.role === 'EMBOSS') return unit.isFoilDone && unit.isPvcDone;
        return false;
    };

    const checkDependencies = (unit) => {
        if (!myRole.deps) return { locked: false };
        const missing = myRole.deps.filter(key => !unit[key]);
        if (missing.length > 0) {
            const labels = missing.map(k => Object.values(ROLE_MAP).find(v => v.flag === k)?.label || k);
            return { locked: true, reason: `Wait: ${labels.join(', ')}` };
        }
        return { locked: false };
    };

    const handleComplete = async (unitId) => {
        try {
            await api.post('/workers/complete', { workerId: worker.id, unitId });
            toast.success('Done!');
            fetchTasks();
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
            <div className="bg-white p-3 shadow-sm flex items-center justify-between sticky top-0 z-50">
                <div>
                    <h1 className="text-lg font-black text-gray-900 leading-none">{worker.name}</h1>
                    <div className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-1 rounded inline-block mt-1">{myRole.label}</div>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchTasks} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg active:scale-95 border border-indigo-100">
                        <RefreshCw size={18} />
                    </button>
                    <button onClick={handleLogout} className="p-2 bg-red-50 text-red-500 rounded-lg active:scale-95 border border-red-100">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 p-3 max-w-xl mx-auto w-full space-y-3">
                {loading ? (
                    <div className="text-center py-20 text-gray-400 font-bold animate-pulse">Loading...</div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={40} strokeWidth={4} />
                        </div>
                        <h2 className="text-xl font-black text-gray-800">All Clear</h2>
                    </div>
                ) : (
                    <>
                        <div className="px-1 text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                            <span>Pending: {tasks.length}</span>
                        </div>

                        {tasks.map(unit => {
                            const item = unit.OrderItem;
                            const design = item?.Design;
                            const color = item?.Color;
                            const order = item?.Order;
                            const distributor = order?.Distributor;
                            const dealer = order?.User; // The Creator

                            const { locked, reason } = checkDependencies(unit);
                            const isHighPriority = checkPriority(unit);

                            // CUSTOM RENDERING PER ROLE
                            const showSize = ['PVC_CUT', 'FOIL_PASTING', 'DOOR_MAKING', 'PACKING'].includes(worker.role);
                            const bigSize = ['PVC_CUT', 'DOOR_MAKING'].includes(worker.role);
                            const showColor = ['FOIL_PASTING', 'EMBOSS', 'PACKING'].includes(worker.role);
                            const bigColor = ['FOIL_PASTING'].includes(worker.role);
                            const showDesign = ['EMBOSS', 'PACKING', 'PVC_CUT', 'DOOR_MAKING'].includes(worker.role); // Standard show
                            const showFullDetails = worker.role === 'PACKING';

                            return (
                                <div key={unit.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden relative ${isHighPriority ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200'}`}>

                                    {isHighPriority && (
                                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-bl-lg z-20 flex items-center gap-1 shadow-md">
                                            <AlertOctagon size={10} /> Urgent
                                        </div>
                                    )}

                                    {/* SHARED HEADER: Order Info */}
                                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex justify-between items-center text-xs">
                                        <span className="font-mono font-bold text-gray-500">Order #{order?.id || 'Ref'} / Unit {unit.unitNumber}</span>
                                        <span className="font-bold text-indigo-700 flex items-center gap-1">
                                            <User size={10} /> {distributor?.shopName || 'Distributor'}
                                        </span>
                                    </div>

                                    <div className="flex">
                                        {/* LEFT VISUALS */}
                                        <div className="w-1/3 bg-gray-200 relative min-h-[140px]">
                                            {/* Design Image */}
                                            {showDesign && design?.imageUrl ? (
                                                <img
                                                    src={`${BASE_URL}${design.imageUrl}`}
                                                    className={`w-full h-full object-cover ${locked ? 'grayscale opacity-60' : ''}`}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400"><Box size={24} /></div>
                                            )}

                                            {/* Color Overlay (Big for Foil) */}
                                            {showColor && color?.imageUrl && (
                                                <div className={`absolute bottom-0 right-0 overflow-hidden shadow-lg border-2 border-white ${bigColor ? 'w-2/3 h-2/3 rounded-tl-2xl' : 'w-10 h-10 rounded-tl-lg'}`}>
                                                    <img src={`${BASE_URL}${color.imageUrl}`} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>

                                        {/* RIGHT DETAILS */}
                                        <div className="w-2/3 p-3 flex flex-col justify-between">
                                            <div>
                                                {/* Dimensions (Highlight for PVC/Door) */}
                                                {showSize && (
                                                    <div className={`font-black text-gray-800 flex items-center gap-1 mb-1 ${bigSize ? 'text-2xl' : 'text-sm'}`}>
                                                        <Ruler size={bigSize ? 20 : 12} className="text-gray-400" />
                                                        {item?.width}" × {item?.height}"
                                                    </div>
                                                )}

                                                {/* Design/Color Names */}
                                                <div className="text-xs text-gray-600 font-bold mb-1 truncate">
                                                    {design?.designNumber} - {color?.name}
                                                </div>

                                                {/* Full Details for Packing */}
                                                {showFullDetails && (
                                                    <div className="mt-2 bg-indigo-50 rounded p-2 text-[10px] space-y-1 text-indigo-900 border border-indigo-100">
                                                        <div><span className="opacity-50 font-bold">DLR:</span> {dealer?.shopName}</div>
                                                        <div><span className="opacity-50 font-bold">ORD:</span> #{order?.id} ({order?.referenceNumber})</div>
                                                        <div><span className="opacity-50 font-bold">SPEC:</span> {item?.width}x{item?.height} | {color?.name}</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ACTION BUTTON */}
                                            <div className="mt-2">
                                                {locked ? (
                                                    <button disabled className="w-full bg-gray-100 text-gray-400 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed text-[10px] uppercase tracking-wide">
                                                        <Lock size={12} /> {reason}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleComplete(unit.id)}
                                                        className={`w-full py-2.5 rounded-xl font-black text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-wide ${isHighPriority ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                                                    >
                                                        <Check size={18} strokeWidth={4} /> DONE
                                                    </button>
                                                )}
                                            </div>
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
