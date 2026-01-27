import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { LogOut, RefreshCw, Check, Lock, AlertOctagon, Box, Ruler, User, Layers, Search, Filter, X, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';

import { getDesignType, getOptimalBlankSize } from '../../utils/designLogicClient';
import { useSound } from '../../hooks/useSound';
import { saveTasksToCache, getCachedTasks, queueOfflineAction, getOfflineQueue, removeActionFromQueue } from '../../utils/offlineSync';

export default function WorkerDashboard() {
    const navigate = useNavigate();
    const { playSuccess, playError, playClick, muted, toggleMute } = useSound();
    const [groupedTasks, setGroupedTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const worker = JSON.parse(localStorage.getItem('workerToken'));

    // HELPERS FOR SYNC
    const processOfflineQueue = async () => {
        const queue = getOfflineQueue();
        if (queue.length === 0) return;

        const toastId = toast.loading(`Syncing ${queue.length} offline actions...`);
        let successCount = 0;

        for (const action of queue) {
            try {
                if (action.type === 'COMPLETE') {
                    await api.post('/workers/complete', action.payload);
                } else if (action.type === 'BATCH') {
                    await api.post('/workers/complete-batch', action.payload);
                }
                removeActionFromQueue(action.id);
                successCount++;
            } catch (error) {
                console.error('Sync failed for action', action, error);
                // removing even on failure to prevent block? Or keep?
                // For now, let's keep it if network error, remove if logic error (4xx)
                if (error.response && error.response.status >= 400) {
                    removeActionFromQueue(action.id);
                }
            }
        }

        toast.dismiss(toastId);
        if (successCount > 0) {
            playSuccess();
            toast.success(`Synced ${successCount} actions`);
            fetchTasks();
        }
    };

    // NETWORK LISTENERS
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Back Online');
            processOfflineQueue();
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast('Offline Mode Active', { icon: '📡' });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial sync if online
        if (navigator.onLine) {
            processOfflineQueue();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // NEW STATE
    const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'history'
    const [history, setHistory] = useState([]);
    const [todayCompleted, setTodayCompleted] = useState(0); // Today's completion count
    const [isRefreshing, setIsRefreshing] = useState(false); // Auto-refresh indicator

    // SEARCH & FILTER STATE
    const [searchText, setSearchText] = useState(''); // Search by order/design/dealer
    const [showUrgentOnly, setShowUrgentOnly] = useState(false); // Urgent filter toggle

    // BATCH ACTIONS STATE
    const [selectedUnits, setSelectedUnits] = useState(new Set()); // Selected task IDs for batch completion

    // DAILY TARGET STATE
    const dailyTargets = {
        'PVC_CUT': 80,
        'FOIL_PASTING': 50,
        'EMBOSS': 40,
        'DOOR_MAKING': 60,
        'PACKING': 70
    };
    const myTarget = dailyTargets[worker?.role] || 50;

    const fetchHistory = async () => {
        try {
            setLoading(true);
            console.log('[HISTORY] Fetching history for worker:', worker.id);
            const res = await api.get('/workers/history', {
                headers: { 'x-worker-id': worker.id }
            });
            console.log('[HISTORY] Received data:', res.data);
            setHistory(res.data);
            setLoading(false);
        } catch (error) {
            console.error('[HISTORY] Error fetching history:', error);
            console.error('[HISTORY] Error response:', error.response?.data);
            console.error('[HISTORY] Error status:', error.response?.status);
            toast.error(error.response?.data?.error || 'Failed to load history');
            setLoading(false);
        }
    };

    const handleUndo = async (recordId) => {
        if (!window.confirm('Undo this completion?')) return;
        try {
            await api.post('/workers/undo', { workerId: worker.id, recordId });
            toast.success('Undone!');
            fetchHistory(); // Refresh history
            fetchTasks();   // Refresh tasks too
        } catch (error) {
            toast.error('Undo Failed');
        }
    };

    // UTILITY: Calculate waiting time
    const getWaitingTime = (createdAt) => {
        if (!createdAt) return null;
        const now = new Date();
        const created = new Date(createdAt);
        const diffMs = now - created;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours > 0) {
            return { text: `${diffHours}h ${diffMinutes}m`, hours: diffHours };
        } else {
            return { text: `${diffMinutes}m`, hours: 0 };
        }
    };

    // PVC CUT WIDTH REDUCTION LOGIC
    // Formula: =INT(((INT(E2)*8 + MOD(E2,1)*10) - 12)/8) + (MOD(((INT(E2)*8 + MOD(E2,1)*10) - 12),8)/10)
    // Applies 12-unit reduction to width for PVC cutting
    const calculatePvcCutWidth = (originalWidth) => {
        // originalWidth is in format like 30.6 (30 feet 6 inches as decimal)
        const feet = Math.floor(originalWidth);
        const inches = (originalWidth % 1) * 10; // Get decimal part and convert to inches

        // Convert to working units (feet*8 + inches)
        const totalUnits = feet * 8 + inches;

        // Apply 12-unit reduction
        const reducedUnits = totalUnits - 12;

        // Convert back to feet.inches format
        const newFeet = Math.floor(reducedUnits / 8);
        const newInches = reducedUnits % 8;

        // Return as decimal (e.g., 29.2 for 29 feet 2 inches)
        return newFeet + (newInches / 10);
    };

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        } else {
            fetchTasks();
        }
    }, [activeTab]);

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
        const interval = setInterval(() => {
            setIsRefreshing(true);
            fetchTasks();
        }, 60000); // Auto-refresh every 60 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchTasks = async () => {
        try {
            // OFFLINE MODE FETCH
            if (!navigator.onLine) {
                const cached = getCachedTasks();
                if (cached) {
                    processTasks(cached);
                    setLoading(false);
                    setIsRefreshing(false);
                    return;
                }
            }

            const res = await api.get('/workers/tasks', {
                params: { workerId: worker.id }
            });

            const tasks = res.data;
            saveTasksToCache(tasks); // Cache new data
            processTasks(tasks);

        } catch (error) {
            console.error('Fetch error', error);
            // If fetch fails but we have cache, use it
            const cached = getCachedTasks();
            if (cached) {
                processTasks(cached);
                toast('Network error, using cached data', { icon: '📂' });
            } else {
                toast.error('Failed to load tasks');
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // Helper to process raw tasks into groups
    const processTasks = (tasks) => {
        // Server returns all non-packed items.
        // We want to see EVERYTHING. Even completed ones (until they are packed/disappear from server list).
        const allTasks = tasks;

        // Group by Order ID
        const groups = {};
        allTasks.forEach(t => {
            const order = t.OrderItem?.Order;
            if (!order) return;
            const oid = order.id;

            if (!groups[oid]) {
                groups[oid] = {
                    id: oid,
                    ref: order.referenceNumber,
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
                // Primary: Priority (high first)
                if (bPrio !== aPrio) return bPrio - aPrio;
                // Secondary: Unit number (stable order)
                return a.unitNumber - b.unitNumber;
            });
        });
        setGroupedTasks(groupArray);
    };

    const fetchTodayStats = async () => {
        try {
            const res = await api.get('/workers/history', {
                headers: { 'x-worker-id': worker.id }
            });
            setTodayCompleted(res.data.length);
        } catch (error) {
            // Silently fail stats fetch
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

    const handleComplete = (unitId, partialType = null) => {
        // Confirmation? Maybe irrelevant for quick taps.
        // if (!window.confirm('Are you sure?')) return;

        if (!navigator.geolocation) return toast.error('GPS not supported');

        // OFFLINE HANDLING
        if (!isOnline) {
            queueOfflineAction({
                type: 'COMPLETE',
                payload: { workerId: worker.id, unitId, partialType, lat: 0, lng: 0 } // No GPS in offline usually? or maybe cached last known?
            });
            playSuccess();
            toast.success('Action queued (Offline)');
            // Optimistic update
            // We should remove this unit from the list locally
            // Ideally we modify groupedTasks, but a simple re-fetch from cache (which is static) won't hide it.
            // We need to locally mark it as hidden or filter it out.
            // For now, let's just trigger a "soft" refresh or let user know.
            // Actually, if we don't remove it, user might click again.
            // Let's filter it out from state
            const newGroups = groupedTasks.map(g => ({
                ...g,
                items: g.items.filter(i => i.id !== unitId)
            })).filter(g => g.items.length > 0);
            setGroupedTasks(newGroups);
            return;
        }

        const toastId = toast.loading('Updating...'); // Faster feedback

        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                // Add tiny delay for toast to render
                await api.post('/workers/complete', {
                    workerId: worker.id,
                    unitId,
                    partialType, // NEW: Pass partial action
                    lat: latitude,
                    lng: longitude
                });
                toast.dismiss(toastId);
                toast.success('Done!');
                playSuccess(); // Audio feedback
                fetchTasks(); // Refresh list 
            } catch (error) {
                toast.dismiss(toastId);
                playError(); // Audio feedback
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

    // FILTER LOGIC
    const filterTasks = (groups) => {
        if (!searchText && !showUrgentOnly) return groups;

        return groups.map(group => {
            let filteredItems = group.items;

            // Filter by search text (order number, design, dealer)
            if (searchText) {
                const search = searchText.toLowerCase();
                filteredItems = filteredItems.filter(unit => {
                    const item = unit.OrderItem;
                    const design = item?.Design;
                    const dealer = item?.Order?.User;
                    const orderNum = `#${group.id}`;

                    return (
                        orderNum.includes(search) ||
                        design?.designNumber?.toLowerCase().includes(search) ||
                        dealer?.name?.toLowerCase().includes(search) ||
                        dealer?.shopName?.toLowerCase().includes(search)
                    );
                });
            }

            // Filter by urgent only
            if (showUrgentOnly) {
                filteredItems = filteredItems.filter(unit => checkPriority(unit));
            }

            return { ...group, items: filteredItems };
        }).filter(group => group.items.length > 0); // Remove empty groups
    };

    // BATCH ACTIONS
    const toggleSelectUnit = (unitId) => {
        const newSet = new Set(selectedUnits);
        if (newSet.has(unitId)) {
            newSet.delete(unitId);
        } else {
            newSet.add(unitId);
        }
        setSelectedUnits(newSet);
    };

    const toggleSelectOrder = (group) => {
        // Get all incomplete task IDs in this order
        const orderUnitIds = group.items
            .filter(unit => !unit[myRole.flag]) // Only incomplete tasks
            .map(unit => unit.id);

        // Check if all are already selected
        const allSelected = orderUnitIds.every(id => selectedUnits.has(id));

        const newSet = new Set(selectedUnits);
        if (allSelected) {
            // Deselect all
            orderUnitIds.forEach(id => newSet.delete(id));
        } else {
            // Select all
            orderUnitIds.forEach(id => newSet.add(id));
        }
        setSelectedUnits(newSet);
    };

    const handleBatchComplete = async () => {
        if (selectedUnits.size === 0) return;

        if (!confirm(`Complete ${selectedUnits.size} selected tasks?`)) return;

        const toastId = toast.loading(`Completing ${selectedUnits.size} tasks...`);

        if (!navigator.geolocation) {
            toast.dismiss(toastId);
            return toast.error('GPS not supported');
        }

        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;

                await api.post('/workers/complete-batch', {
                    workerId: worker.id,
                    unitIds: Array.from(selectedUnits),
                    lat: latitude,
                    lng: longitude
                });

                toast.dismiss(toastId);
                toast.success(`${selectedUnits.size} tasks completed!`);
                setSelectedUnits(new Set()); // Clear selection
                fetchTasks(); // Refresh
            } catch (error) {
                toast.dismiss(toastId);
                const msg = error.response?.data?.error || 'Batch completion failed';
                toast.error(msg);
            }
        }, (err) => {
            toast.dismiss(toastId);
            toast.error('Location Access Denied');
        }, { enableHighAccuracy: true, timeout: 10000 });
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
                    {/* Sound Toggle */}
                    <button onClick={toggleMute} className={`p-2 rounded-lg ${muted ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <button onClick={() => setActiveTab(activeTab === 'tasks' ? 'history' : 'tasks')} className={`px-3 py-2 rounded-lg text-sm font-bold ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {activeTab === 'tasks' ? 'History' : 'Tasks'}
                    </button>
                    <button onClick={handleLogout} className="p-2 bg-red-50 text-red-600 rounded-lg">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {/* STATS WIDGET */}
            {activeTab === 'tasks' && (
                <div className="px-3 pb-2 max-w-xl mx-auto w-full">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-4 shadow-lg text-white relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
                        </div>

                        <div className="relative z-10">
                            {/* Worker Info */}
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest font-bold text-slate-300">Worker Dashboard</div>
                                    <div className="text-xl font-black">{worker.name}</div>
                                    <div className="text-xs text-slate-300 font-semibold">{myRole?.label || worker.role}</div>
                                </div>
                                {isRefreshing && (
                                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                        <RefreshCw size={14} className="animate-spin" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Syncing...</span>
                                    </div>
                                )}

                                {/* TARGET REACHED CELEBRATION */}
                                {todayCompleted >= myTarget && (
                                    <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 px-3 py-1.5 rounded-lg shadow-lg animate-pulse">
                                        <span className="text-lg">🏆</span>
                                        <span className="text-[10px] font-black uppercase tracking-wider">Target Reached!</span>
                                    </div>
                                )}
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {/* Today's Completed */}
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-300 mb-1">Completed</div>
                                    <div className="text-3xl font-black">{todayCompleted}</div>
                                    <div className="text-[8px] text-slate-400 mt-0.5">
                                        of {myTarget} target
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-2 bg-white/20 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${todayCompleted >= myTarget * 0.9 ? 'bg-green-400' :
                                                todayCompleted >= myTarget * 0.5 ? 'bg-yellow-400' :
                                                    'bg-red-400'
                                                }`}
                                            style={{ width: `${Math.min((todayCompleted / myTarget) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Pending Count */}
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-300 mb-1">Pending</div>
                                    <div className="text-3xl font-black">
                                        {groupedTasks.reduce((sum, g) => sum + g.items.filter(u => !u[myRole.flag]).length, 0)}
                                    </div>
                                    <div className="text-[8px] text-slate-400 mt-0.5">Tasks</div>
                                </div>

                                {/* Completion Rate */}
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-300 mb-1">Rate</div>
                                    <div className="text-3xl font-black">
                                        {todayCompleted > 0 ? Math.round(todayCompleted / (todayCompleted + groupedTasks.reduce((sum, g) => sum + g.items.filter(u => !u[myRole.flag]).length, 0)) * 100) : 0}%
                                    </div>
                                    <div className="text-[8px] text-slate-400 mt-0.5">Done</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SEARCH & FILTER BAR */}
            {activeTab === 'tasks' && (
                <div className="px-3 pb-3 max-w-xl mx-auto w-full">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 space-y-3">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search order #, design, or dealer name..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                            {searchText && (
                                <button
                                    onClick={() => setSearchText('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Filter Toggles */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowUrgentOnly(!showUrgentOnly)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${showUrgentOnly
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <Filter size={14} />
                                Urgent Only
                            </button>

                            {/* Active Filter Count */}
                            {(searchText || showUrgentOnly) && (
                                <div className="ml-auto text-xs text-gray-500 font-semibold">
                                    {filterTasks(groupedTasks).reduce((sum, g) => sum + g.items.length, 0)} results
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Grouped List or History */}
            <div className="flex-1 p-3 max-w-xl mx-auto w-full space-y-6">
                {activeTab === 'history' ? (
                    <div className="space-y-4">
                        <h2 className="font-black text-gray-900 text-xl px-2">Today's Work</h2>
                        {history.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">No work recorded today</div>
                        ) : (
                            history.map(record => (
                                <div key={record.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase">{new Date(record.timestamp).toLocaleTimeString()}</div>
                                        <div className="font-bold text-gray-800">
                                            {record.ProductionUnit?.OrderItem?.Design?.designNumber} - {record.ProductionUnit?.OrderItem?.Color?.name}
                                        </div>
                                        <div className="text-xs text-gray-500">Order #{record.ProductionUnit?.OrderItem?.Order?.id}</div>
                                        {/* Show Stage Detail */}
                                        <div className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded inline-block mt-1 uppercase font-bold">{record.stage}</div>
                                    </div>
                                    <button onClick={() => handleUndo(record.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-100 active:scale-95">
                                        Undo
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                ) : loading ? (
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
                            <span>Pending Orders: {filterTasks(groupedTasks).length}</span>
                        </div>

                        {filterTasks(groupedTasks).map(group => (
                            <div key={group.id} className="mb-6">
                                {/* ORDER HEADER */}
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <div className="flex items-center gap-3">
                                        {/* ORDER-LEVEL SELECT ALL CHECKBOX */}
                                        {['PVC_CUT', 'PACKING'].includes(worker.role) && (() => {
                                            const incompleteUnits = group.items.filter(u => !u[myRole.flag]);
                                            const allSelected = incompleteUnits.length > 0 && incompleteUnits.every(u => selectedUnits.has(u.id));
                                            return (
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    onChange={() => toggleSelectOrder(group)}
                                                    className="w-5 h-5 rounded border-2 border-gray-400 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                    title="Select all tasks in this order"
                                                />
                                            );
                                        })()}

                                        <div className="bg-slate-900 text-white font-black text-xs uppercase px-3 py-1.5 rounded-lg shadow-sm tracking-widest">
                                            Order #{group.id}
                                        </div>
                                        <div className="text-gray-600 font-bold text-sm">
                                            {group.items[0]?.OrderItem?.Order?.User?.name || 'Dealer'}
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                        {group.items.length} Units
                                    </div>
                                </div>
                                {/* UNIT LIST */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="divide-y divide-gray-100">
                                        {group.items.map(unit => {
                                            const item = unit.OrderItem;
                                            const design = item?.Design;
                                            const color = item?.Color;
                                            const dealer = item?.Order?.User;

                                            const { locked, reason } = checkDependencies(unit);
                                            const isHighPriority = checkPriority(unit);
                                            const isCompleted = unit[myRole.flag]; // Main Completion Flag

                                            // CUSTOM RENDERING PER ROLE
                                            const showSize = ['PVC_CUT', 'FOIL_PASTING', 'DOOR_MAKING', 'PACKING'].includes(worker.role);
                                            const bigSize = ['PVC_CUT', 'DOOR_MAKING'].includes(worker.role);
                                            const showColor = ['FOIL_PASTING', 'EMBOSS', 'PACKING'].includes(worker.role);
                                            const bigColor = ['FOIL_PASTING'].includes(worker.role);
                                            const showDesign = ['EMBOSS', 'PACKING', 'PVC_CUT', 'DOOR_MAKING'].includes(worker.role);

                                            // BLANK SIZE CALCULATION
                                            const blankSize = worker.role === 'FOIL_PASTING' ? getOptimalBlankSize(item?.width, item?.height, design?.category || getDesignType(design?.designNumber)) : null;


                                            // CUSTOM FOIL LAYOUT
                                            // CUSTOM FOIL LAYOUT (FINAL VISUAL)
                                            if (worker.role === 'FOIL_PASTING') {
                                                return (
                                                    <div key={unit.id} className={`p-4 bg-white border-b border-gray-100 relative ${isHighPriority ? 'bg-red-50/50' : ''} ${isCompleted ? 'opacity-50' : ''}`}>

                                                        {/* HANGING BADGES */}
                                                        {isHighPriority && !isCompleted && (
                                                            <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-bl-lg z-20 shadow-sm">Urgent</div>
                                                        )}
                                                        {unit.unitNumber && (
                                                            <div className="absolute top-0 left-0 bg-gray-100 text-gray-500 text-[9px] font-bold uppercase px-2 py-1 rounded-br-lg z-10">
                                                                #{unit.unitNumber}
                                                            </div>
                                                        )}

                                                        {/* WAITING TIME BADGE */}
                                                        {!isCompleted && unit.createdAt && (() => {
                                                            const waitTime = getWaitingTime(unit.createdAt);
                                                            if (!waitTime) return null;

                                                            // Color-coded urgency
                                                            let badgeColor = 'bg-gray-100 text-gray-600'; // <2 hours
                                                            if (waitTime.hours >= 4) {
                                                                badgeColor = 'bg-red-100 text-red-700 border border-red-200'; // >4 hours
                                                            } else if (waitTime.hours >= 2) {
                                                                badgeColor = 'bg-yellow-100 text-yellow-700 border border-yellow-200'; // 2-4 hours
                                                            }

                                                            return (
                                                                <div className={`absolute top-8 left-0 ${badgeColor} text-[8px] font-bold uppercase px-2 py-0.5 rounded-br-lg z-10 tracking-wider`}>
                                                                    ⏱ {waitTime.text}
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* COMPLETED OVERLAY */}
                                                        {isCompleted && (
                                                            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                                                                <div className="bg-green-100 text-green-700 font-black uppercase text-sm px-4 py-2 rounded-full border border-green-300 shadow-md -rotate-12 backdrop-blur-sm opacity-90">
                                                                    COMPLETED
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex gap-6">
                                                            {/* LEFT: DOOR VISUAL (IMAGE) */}
                                                            <div className="shrink-0 flex items-center justify-center py-2">
                                                                <div className="w-24 h-40 bg-white rounded-xl shadow-[0_8px_16px_rgba(0,0,0,0.08)] ring-1 ring-black/5 overflow-hidden relative">
                                                                    {design?.imageUrl ? (
                                                                        <img src={`${BASE_URL}${design.imageUrl}`} className="w-full h-full object-cover" alt="Door Design" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">No Img</div>
                                                                    )}
                                                                    {/* Gloss Effect Overlay */}
                                                                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none"></div>
                                                                </div>
                                                            </div>

                                                            {/* RIGHT: CONTENT */}
                                                            <div className="flex-1 flex flex-col justify-between">

                                                                {/* TOP ROW: INFO */}
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex flex-col gap-3 pt-1">
                                                                        {/* Actual Size */}
                                                                        <div className="flex items-center gap-2 text-gray-500 font-bold text-xs bg-gray-100 px-2 py-1 rounded w-fit">
                                                                            <Ruler size={12} />
                                                                            <span className="text-gray-900">{item?.width}" × {item?.height}"</span>
                                                                            <span className="text-[10px] uppercase text-gray-400 tracking-wide font-normal">(Actual Size)</span>
                                                                        </div>

                                                                        {/* Details (Aligned Horizontal) */}
                                                                        <div className="text-gray-900 font-bold text-base space-y-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-gray-400 font-medium text-sm">Design no:-</span>
                                                                                <span className="text-xl font-black">{design?.designNumber}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-gray-400 font-medium text-sm">Colour no:-</span>
                                                                                <span className="text-lg font-bold text-gray-800">{color?.name}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-right">
                                                                        <div className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 tracking-widest">Blank Palla</div>
                                                                        <div className="text-5xl font-black text-slate-800 leading-none tracking-tighter">
                                                                            {blankSize ? blankSize.replace(' x ', 'x') : 'N/A'}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* BOTTOM ROW: ACTIONS */}
                                                                <div className="mt-5">
                                                                    {locked ? (
                                                                        <button disabled className="w-full py-3 bg-gray-100 text-gray-400 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-not-allowed">
                                                                            <Lock size={12} /> {reason}
                                                                        </button>
                                                                    ) : (
                                                                        <div className="flex gap-4">
                                                                            {/* FRONT COLUMN */}
                                                                            <div className="flex-1 flex flex-col shadow-sm rounded-lg overflow-hidden">
                                                                                <button
                                                                                    onClick={() => handleComplete(unit.id, unit.isFoilFrontSheetPicked ? 'FRONT_PICK_UNDO' : 'FRONT_PICK')}
                                                                                    className={`w-full py-2 text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${unit.isFoilFrontSheetPicked ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white active:bg-blue-700'}`}
                                                                                >
                                                                                    {unit.isFoilFrontSheetPicked ? <Check size={14} strokeWidth={4} /> : null}
                                                                                    PICKED
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => !unit.isFoilFrontDone && handleComplete(unit.id, 'FRONT')}
                                                                                    disabled={unit.isFoilFrontDone}
                                                                                    className={`w-full py-2.5 bg-white border-x border-b border-gray-200 text-gray-800 text-sm font-black uppercase ${unit.isFoilFrontDone ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50 active:bg-gray-100'}`}
                                                                                >
                                                                                    FRONT
                                                                                </button>
                                                                            </div>

                                                                            {/* BACK COLUMN */}
                                                                            <div className="flex-1 flex flex-col shadow-sm rounded-lg overflow-hidden">
                                                                                <button
                                                                                    onClick={() => handleComplete(unit.id, unit.isFoilBackSheetPicked ? 'BACK_PICK_UNDO' : 'BACK_PICK')}
                                                                                    className={`w-full py-2 text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${unit.isFoilBackSheetPicked ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white active:bg-blue-700'}`}
                                                                                >
                                                                                    {unit.isFoilBackSheetPicked ? <Check size={14} strokeWidth={4} /> : null}
                                                                                    PICKED
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => !unit.isFoilBackDone && handleComplete(unit.id, 'BACK')}
                                                                                    disabled={unit.isFoilBackDone}
                                                                                    className={`w-full py-2.5 bg-white border-x border-b border-gray-200 text-gray-800 text-sm font-black uppercase ${unit.isFoilBackDone ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50 active:bg-gray-100'}`}
                                                                                >
                                                                                    BACK
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={unit.id} className={`p-0 flex relative ${isHighPriority ? 'bg-red-50/30' : ''} ${isCompleted ? 'opacity-50' : ''}`}>

                                                    {/* BATCH SELECTION CHECKBOX (PVC_CUT & PACKING only) */}
                                                    {!isCompleted && ['PVC_CUT', 'PACKING'].includes(worker.role) && (
                                                        <div className="absolute top-2 left-2 z-30">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedUnits.has(unit.id)}
                                                                onChange={() => toggleSelectUnit(unit.id)}
                                                                className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                            />
                                                        </div>
                                                    )}

                                                    {isHighPriority && !isCompleted && (
                                                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg z-20 shadow-md">
                                                            Urgent
                                                        </div>
                                                    )}

                                                    {/* WAITING TIME BADGE */}
                                                    {!isCompleted && unit.createdAt && (() => {
                                                        const waitTime = getWaitingTime(unit.createdAt);
                                                        if (!waitTime) return null;

                                                        // Color-coded urgency
                                                        let badgeColor = 'bg-gray-100 text-gray-600';
                                                        if (waitTime.hours >= 4) {
                                                            badgeColor = 'bg-red-100 text-red-700 border border-red-200';
                                                        } else if (waitTime.hours >= 2) {
                                                            badgeColor = 'bg-yellow-100 text-yellow-700 border border-yellow-200';
                                                        }

                                                        return (
                                                            <div className={`absolute top-0 left-0 ${badgeColor} text-[8px] font-bold uppercase px-2 py-0.5 rounded-br-lg z-10 tracking-wider`}>
                                                                ⏱ {waitTime.text}
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* COMPLETED OVELAY / STRUCK */}
                                                    {isCompleted && (
                                                        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                                                            <div className="bg-green-100 text-green-700 font-black uppercase text-xs px-3 py-1 rounded-full border border-green-300 shadow-sm rotate-12 backdrop-blur-sm">
                                                                COMPLETED
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* LEFT VISUALS */}
                                                    <div className="w-20 h-16 bg-gray-100 relative shrink-0 border-r border-gray-100">
                                                        {/* Design Image */}
                                                        {showDesign && design?.imageUrl ? (
                                                            <img
                                                                src={`${BASE_URL}${design.imageUrl}`}
                                                                className={`w-full h-full object-cover ${locked ? 'grayscale opacity-60' : ''}`}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300"><Box size={16} /></div>
                                                        )}

                                                        {/* Color Overlay */}
                                                        {showColor && color?.imageUrl && (
                                                            <div className={`absolute bottom-0 right-0 overflow-hidden shadow-sm border border-white ${bigColor ? 'w-full h-1/2' : 'w-6 h-6 rounded-tl-lg'}`}>
                                                                <img src={`${BASE_URL}${color.imageUrl}`} className="w-full h-full object-cover" />
                                                            </div>
                                                        )}

                                                        {/* Unit Badge */}
                                                        <div className="absolute top-0.5 left-0.5 bg-black/50 text-white text-[8px] font-mono px-1 rounded backdrop-blur-sm">
                                                            #{unit.unitNumber}
                                                        </div>
                                                    </div>

                                                    {/* RIGHT DETAILS */}
                                                    <div className="flex-1 p-2 flex flex-col justify-center">
                                                        <div>
                                                            {/* Dimensions & Blank Size */}
                                                            {showSize && (
                                                                <div className="flex flex-col gap-1">
                                                                    <div className={`font-black text-gray-800 flex items-center gap-1.5 ${bigSize ? 'text-xl' : 'text-base'}`}>
                                                                        <Ruler size={bigSize ? 18 : 14} className="text-gray-400" />
                                                                        {/* PVC_CUT gets reduced width, others see original */}
                                                                        {worker.role === 'PVC_CUT'
                                                                            ? `${calculatePvcCutWidth(item?.width)}" × ${item?.height}"`
                                                                            : `${item?.width}" × ${item?.height}"`
                                                                        }
                                                                    </div>
                                                                    {/* BLANK SIZE DISPLAY */}
                                                                    {blankSize && (
                                                                        <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit border border-indigo-100">
                                                                            Blank: {blankSize}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="text-xs text-gray-500 font-medium truncate mt-1">
                                                                {design?.designNumber} • {color?.name}
                                                            </div>
                                                        </div>

                                                        {/* ACTION BUTTONS */}
                                                        <div className="mt-2">
                                                            {locked ? (
                                                                <button disabled className="w-full bg-gray-50 text-gray-300 font-bold py-2 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed text-[10px] uppercase tracking-wide border border-gray-100">
                                                                    <Lock size={10} /> {reason}
                                                                </button>
                                                            ) : worker.role === 'FOIL_PASTING' ? (
                                                                // CUSTOM FOIL UI - INTEGRATED PICK + DONE
                                                                <div className="flex gap-2 items-stretch">
                                                                    {/* FRONT (Pick + Done Combined) */}
                                                                    <div className="flex-1 flex flex-col gap-1">
                                                                        {/* Front Pick */}
                                                                        <button
                                                                            onClick={() => handleComplete(unit.id, unit.isFoilFrontSheetPicked ? 'FRONT_PICK_UNDO' : 'FRONT_PICK')}
                                                                            className={`px-2 py-1 rounded-md border text-[9px] font-bold uppercase transition-all ${unit.isFoilFrontSheetPicked ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}
                                                                        >
                                                                            {unit.isFoilFrontSheetPicked ? '✓ Picked' : 'Pick Front'}
                                                                        </button>
                                                                        {/* Front Done */}
                                                                        <button
                                                                            onClick={() => !unit.isFoilFrontDone && handleComplete(unit.id, 'FRONT')}
                                                                            disabled={unit.isFoilFrontDone}
                                                                            className={`flex-1 py-2 rounded-lg font-bold text-[10px] uppercase border transition-all ${unit.isFoilFrontDone ? 'bg-green-100 text-green-700 border-green-200 opacity-50' : 'bg-white text-gray-700 border-gray-300 active:scale-95'}`}
                                                                        >
                                                                            {unit.isFoilFrontDone ? 'Front Done' : 'Front'}
                                                                        </button>
                                                                    </div>

                                                                    {/* BACK (Pick + Done Combined) */}
                                                                    <div className="flex-1 flex flex-col gap-1">
                                                                        {/* Back Pick */}
                                                                        <button
                                                                            onClick={() => handleComplete(unit.id, unit.isFoilBackSheetPicked ? 'BACK_PICK_UNDO' : 'BACK_PICK')}
                                                                            className={`px-2 py-1 rounded-md border text-[9px] font-bold uppercase transition-all ${unit.isFoilBackSheetPicked ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}
                                                                        >
                                                                            {unit.isFoilBackSheetPicked ? '✓ Picked' : 'Pick Back'}
                                                                        </button>
                                                                        {/* Back Done */}
                                                                        <button
                                                                            onClick={() => !unit.isFoilBackDone && handleComplete(unit.id, 'BACK')}
                                                                            disabled={unit.isFoilBackDone}
                                                                            className={`flex-1 py-2 rounded-lg font-bold text-[10px] uppercase border transition-all ${unit.isFoilBackDone ? 'bg-green-100 text-green-700 border-green-200 opacity-50' : 'bg-white text-gray-700 border-gray-300 active:scale-95'}`}
                                                                        >
                                                                            {unit.isFoilBackDone ? 'Back Done' : 'Back'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                // STANDARD BUTTON (Non-Foil)
                                                                !isCompleted && (
                                                                    <button
                                                                        onClick={() => handleComplete(unit.id)}
                                                                        className={`w-full py-2 rounded-lg font-black text-white shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wide ${isHighPriority ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                                                                    >
                                                                        <Check size={14} strokeWidth={4} /> DONE
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* FLOATING BATCH COMPLETE BUTTON */}
            {selectedUnits.size > 0 && ['PVC_CUT', 'PACKING'].includes(worker.role) && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
                    <button
                        onClick={handleBatchComplete}
                        className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-black text-lg hover:scale-105 active:scale-95 transition-transform"
                    >
                        <Check size={24} strokeWidth={3} />
                        Complete {selectedUnits.size} Selected
                    </button>
                </div>
            )}
        </div>
    );
}

