import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { LogOut, RefreshCw, Check, Lock, AlertOctagon, Box, Ruler, User, Layers } from 'lucide-react';

export default function WorkerDashboard() {
    const navigate = useNavigate();
    const [groupedTasks, setGroupedTasks] = useState([]);
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

            // Group by Order ID
            const groups = {};
            pendingTasks.forEach(t => {
                const order = t.OrderItem?.Order;
                if (!order) return;
                const oid = order.id;

                if (!groups[oid]) {
                    groups[oid] = {
                        id: oid,
                        ref: order.referenceNumber, // Might be undefined, handled purely visually
                        distributor: order.Distributor,
                        items: []
                    };
                }
                groups[oid].items.push(t);
            });

            // Convert to Array
            const groupArray = Object.values(groups).sort((a, b) => a.id - b.id);

            // Sort items within group by priority?
            groupArray.forEach(g => {
                g.items.sort((a, b) => {
                    const aPrio = checkPriority(a) ? 1 : 0;
                    const bPrio = checkPriority(b) ? 1 : 0;
                    return bPrio - aPrio;
                });
            });

            setGroupedTasks(groupArray);
            setLoading(false);
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || error.message;
            toast.error(`Error: ${msg}`);
            setLoading(false);
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

    const handleComplete = (unitId) => {
        if (!navigator.geolocation) return toast.error('GPS not supported');

        const toastId = toast.loading('Verifying Location...');

        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                // Add tiny delay for toast to render
                await api.post('/workers/complete', {
                    workerId: worker.id,
                    unitId,
                    lat: latitude,
                    lng: longitude
                });
                toast.dismiss(toastId);
                toast.success('Done!');
                fetchTasks(); // Refresh list 
            } catch (error) {
                toast.dismiss(toastId);
                const msg = error.response?.data?.error || 'Failed';
                toast.error(msg);
            }
        }, (err) => {
            toast.dismiss(toastId);
            console.error(err);
            toast.error('Location Access Denied. enable GPS.');
        }, { enableHighAccuracy: true, timeout: 10000 });
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

            {/* Grouped List */}
            <div className="flex-1 p-3 max-w-xl mx-auto w-full space-y-6">
                {loading ? (
                    <div className="text-center py-20 text-gray-400 font-bold animate-pulse">Loading Tasks...</div>
                ) : groupedTasks.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={40} strokeWidth={4} />
                        </div>
                        <h2 className="text-xl font-black text-gray-800">All Clear</h2>
                    </div>
                ) : (
                    <>
                        <div className="px-1 text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                            <span>Pending Orders: {groupedTasks.length}</span>
                        </div>

                        {groupedTasks.map(group => (
                            <div key={group.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* GROUP HEADER */}
                                <div className="bg-indigo-50/50 px-4 py-3 border-b border-indigo-100 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-indigo-600 text-white font-mono font-bold text-xs px-2 py-1 rounded">#{group.id}</div>
                                        <div className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                                            <User size={12} /> {group.distributor?.shopName || 'Distributor'}
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1">
                                        <Layers size={12} /> {group.items.length} Units
                                    </div>
                                </div>

                                {/* UNIT LIST */}
                                <div className="divide-y divide-gray-100">
                                    {group.items.map(unit => {
                                        const item = unit.OrderItem;
                                        const design = item?.Design;
                                        const color = item?.Color;
                                        const dealer = item?.Order?.User;

                                        const { locked, reason } = checkDependencies(unit);
                                        const isHighPriority = checkPriority(unit);

                                        // CUSTOM RENDERING PER ROLE
                                        const showSize = ['PVC_CUT', 'FOIL_PASTING', 'DOOR_MAKING', 'PACKING'].includes(worker.role);
                                        const bigSize = ['PVC_CUT', 'DOOR_MAKING'].includes(worker.role);
                                        const showColor = ['FOIL_PASTING', 'EMBOSS', 'PACKING'].includes(worker.role);
                                        const bigColor = ['FOIL_PASTING'].includes(worker.role);
                                        const showDesign = ['EMBOSS', 'PACKING', 'PVC_CUT', 'DOOR_MAKING'].includes(worker.role);
                                        const showFullDetails = worker.role === 'PACKING';

                                        return (
                                            <div key={unit.id} className={`p-0 flex relative ${isHighPriority ? 'bg-red-50/30' : ''}`}>

                                                {isHighPriority && (
                                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg z-20 shadow-md">
                                                        Urgent
                                                    </div>
                                                )}

                                                {/* LEFT VISUALS */}
                                                <div className="w-24 bg-gray-100 relative shrink-0 border-r border-gray-100">
                                                    {/* Design Image */}
                                                    {showDesign && design?.imageUrl ? (
                                                        <img
                                                            src={`${BASE_URL}${design.imageUrl}`}
                                                            className={`w-full h-full object-cover ${locked ? 'grayscale opacity-60' : ''}`}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Box size={20} /></div>
                                                    )}

                                                    {/* Color Overlay (Big for Foil) */}
                                                    {showColor && color?.imageUrl && (
                                                        <div className={`absolute bottom-0 right-0 overflow-hidden shadow-sm border border-white ${bigColor ? 'w-full h-1/2' : 'w-8 h-8 rounded-tl-lg'}`}>
                                                            <img src={`${BASE_URL}${color.imageUrl}`} className="w-full h-full object-cover" />
                                                        </div>
                                                    )}

                                                    {/* Unit Number Badge */}
                                                    <div className="absolute top-1 left-1 bg-black/50 text-white text-[9px] font-mono px-1 rounded backdrop-blur-sm">
                                                        #{unit.unitNumber}
                                                    </div>
                                                </div>

                                                {/* RIGHT DETAILS */}
                                                <div className="flex-1 p-3 flex flex-col justify-between min-h-[100px]">
                                                    <div>
                                                        {/* Dimensions */}
                                                        {showSize && (
                                                            <div className={`font-black text-gray-800 flex items-center gap-1 ${bigSize ? 'text-xl' : 'text-sm'}`}>
                                                                <Ruler size={bigSize ? 16 : 12} className="text-gray-400" />
                                                                {item?.width}" × {item?.height}"
                                                            </div>
                                                        )}

                                                        {/* Design/Color Names */}
                                                        <div className="text-xs text-gray-500 font-medium truncate mt-0.5">
                                                            {design?.designNumber} • {color?.name}
                                                        </div>

                                                        {/* Full Details for Packing */}
                                                        {showFullDetails && (
                                                            <div className="mt-2 text-[10px] space-y-0.5 text-indigo-900 bg-indigo-50/50 p-1 rounded">
                                                                <div className="flex justify-between"><span>DLR: {dealer?.shopName}</span></div>
                                                                <div className="font-mono opacity-50 text-[9px]">{unit.uniqueCode}</div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* ACTION BUTTON */}
                                                    <div className="mt-2">
                                                        {locked ? (
                                                            <button disabled className="w-full bg-gray-50 text-gray-300 font-bold py-2 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed text-[10px] uppercase tracking-wide border border-gray-100">
                                                                <Lock size={10} /> {reason}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleComplete(unit.id)}
                                                                className={`w-full py-2 rounded-lg font-black text-white shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wide ${isHighPriority ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                                                            >
                                                                <Check size={14} strokeWidth={4} /> DONE
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
