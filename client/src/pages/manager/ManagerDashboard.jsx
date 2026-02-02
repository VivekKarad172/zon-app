import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Home, Users, User, Menu, Package, TrendingUp } from 'lucide-react';
import AdminWorkerControl from '../admin/AdminWorkerControl';
import ManagerOrders from './ManagerOrders';
import ManagerAnalytics from './ManagerAnalytics';

export default function ManagerDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('home'); // 'home' | 'worker-control'

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            logout();
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* SIDEBAR */}
            <aside className="w-full md:w-64 bg-white shadow-lg z-20 flex-shrink-0 md:h-screen md:fixed md:left-0 md:top-0">
                <div className="p-6 border-b border-indigo-100 flex items-center justify-between md:block">
                    <div>
                        <div className="text-2xl font-black text-indigo-700 tracking-tighter">Z-ON DOOR</div>
                        <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-1">Manager Panel</div>
                    </div>
                </div>

                <div className="p-4 overflow-y-auto h-[calc(100vh-80px)]">
                    <div className="mb-6 px-4">
                        <div className="text-sm font-bold text-slate-900">{user?.name || 'Manager'}</div>
                        <div className="text-xs text-slate-500 uppercase">{user?.role}</div>
                    </div>

                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab('home')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                        >
                            <Home size={18} /> Home Overview
                        </button>

                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                        >
                            <Package size={18} /> Orders & Measure
                        </button>

                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                        >
                            <TrendingUp size={18} /> Analytics & Pulse
                        </button>

                        <button
                            onClick={() => setActiveTab('worker-control')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'worker-control' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                        >
                            <Users size={18} /> Worker Control
                        </button>

                        <div className="pt-4 mt-4 border-t border-slate-100">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                            >
                                <LogOut size={18} /> Logout
                            </button>
                        </div>
                    </nav>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
                {activeTab === 'home' && (
                    <div className="animate-fade-in space-y-6">
                        <h1 className="text-2xl font-black text-slate-800">Welcome, Manager</h1>
                        <p className="text-slate-500">Select <span className="font-bold text-indigo-600">Worker Control</span> from the sidebar to manage factory tasks.</p>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-md">
                            <h2 className="text-lg font-bold mb-4">Quick Stats</h2>
                            <div className="text-sm text-slate-500">
                                Real-time production overview coming soon. Use Worker Control for task management.
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="animate-fade-in">
                        <ManagerOrders />
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="animate-fade-in">
                        <ManagerAnalytics />
                    </div>
                )}

                {activeTab === 'worker-control' && (
                    <div className="animate-fade-in">
                        <AdminWorkerControl />
                    </div>
                )}
            </main>
        </div>
    );
}
