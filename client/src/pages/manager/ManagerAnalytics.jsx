import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../utils/api';
import { Users, TrendingUp, AlertCircle } from 'lucide-react';

export default function ManagerAnalytics() {
    const [stats, setStats] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            setError(null);
            // Parallel fetch for efficiency
            const [analyticsRes, workersRes] = await Promise.all([
                api.get('/orders/analytics'),
                api.get('/workers/public')
            ]);

            setStats(analyticsRes.data);
            setWorkers(workersRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Analytics fetch error:', error);
            setError(error.response?.data?.error || error.message || 'Failed to load data');
            setLoading(false);
        }
    };

    if (loading && !stats) return <div className="p-10 text-center animate-pulse text-slate-400 font-bold">Loading Factory Pulse...</div>;

    if (error) return (
        <div className="p-10 text-center">
            <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-red-100 text-red-500 mb-4">
                <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">Analytics Unavailable</h3>
            <p className="text-slate-500 font-bold mb-6 max-w-md mx-auto">{error}</p>
            <button onClick={fetchData} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                Retry Connection
            </button>
        </div>
    );

    // Transform chart data for Recharts
    const chartData = stats?.chartData || [];
    const totalOrders = stats?.kpi?.totalOrders || 0;
    const pendingOrders = stats?.kpi?.pendingOrders || 0;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <TrendingUp className="text-indigo-600" /> Factory Pulse
            </h2>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Active Workers</div>
                    <div className="text-3xl font-black text-slate-800 flex items-end gap-2">
                        {workers.filter(w => w.status === 'online' || true).length}
                        <span className="text-xs font-bold text-green-500 mb-1">Online</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pending Orders</div>
                    <div className="text-3xl font-black text-slate-800">{pendingOrders}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Limit</div>
                    <div className="text-3xl font-black text-slate-800">{totalOrders}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PRODUCTION CHART */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6">Order Status Distribution</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={chartData}>
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                            />
                            <Tooltip
                                cursor={{ fill: '#f1f5f9' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* WORKER ATTENDANCE */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80 overflow-y-auto">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">Floor Team Status</h3>
                    <div className="space-y-3">
                        {workers.map(worker => (
                            <div key={worker.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-xs">
                                        {worker.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-800">{worker.name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{worker.role}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${true ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                    <span className="text-xs font-bold text-slate-500">Active</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
