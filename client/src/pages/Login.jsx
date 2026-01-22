import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function Login() {
    const { login, dealerLogin } = useAuth();
    const navigate = useNavigate();

    // "DEFAULT" (Manuf/Dist) or "DEALER"
    const [loginMode, setLoginMode] = useState('DEFAULT');

    // Separate states to prevent confusion
    const [adminForm, setAdminForm] = useState({ username: '', password: '' });
    const [dealerEmail, setDealerEmail] = useState('');

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Auto-Ping Test for Mobile
    useEffect(() => {
        const testConn = async () => {
            const el = document.getElementById('ping-test');
            if (!el) return;
            try {
                el.innerText = 'Pinging http://10.22.145.108:5000...';
                const res = await fetch('http://10.22.145.108:5000/');
                const text = await res.text();
                el.innerText = 'HOTSPOT SUCCESS: ' + text;
                el.className = 'text-xs font-mono text-green-600 mt-2 font-bold';
            } catch (e) {
                el.innerText = 'PING FAILED: ' + e.message;
                el.className = 'text-xs font-mono text-red-600 mt-2 font-bold';
            }
        };
        testConn();
    }, []);

    const handleAdminSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(adminForm.username, adminForm.password);
            // Successful login updates Context.
            // Navigate based on role (handled by protected routes or manual)
            // Ideally we navigate to /dashboard which auto-redirects.
            navigate('/dashboard');
        } catch (err) {
            const errMsg = err.response?.data?.error || err.message || 'Login failed';
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDealerSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await dealerLogin(dealerEmail);
            toast.success('Dealer Login Successful');
            navigate('/dealer');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Dealer Login failed');
            toast.error(err.response?.data?.error || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Z-ON DOOR</h1>
                    <p className="text-gray-500 font-medium">Manufacturing Workflow System</p>
                    <p className="text-blue-600 font-bold text-sm mt-2">v1.4 Final Cloud Fix</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                    <button
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${loginMode === 'DEFAULT' ? 'bg-white shadow text-indigo-900' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setLoginMode('DEFAULT'); setError('') }}
                    >
                        Admin / Distributor
                    </button>
                    <button
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${loginMode === 'DEALER' ? 'bg-white shadow text-indigo-900' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setLoginMode('DEALER'); setError('') }}
                    >
                        Dealer Login
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-bold text-center border border-red-100 animate-pulse">
                        {error}
                    </div>
                )}

                {/* DEBUG INFO FOR MOBILE */}
                <div className="mb-4 text-xs text-center text-gray-400 font-mono">
                    Connecting to: {api.defaults.baseURL}
                </div>

                {loginMode === 'DEFAULT' && (
                    <form onSubmit={handleAdminSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                            <input
                                type="text"
                                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-indigo-500 focus:outline-none transition-colors"
                                value={adminForm.username}
                                onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-indigo-500 focus:outline-none transition-colors"
                                value={adminForm.password}
                                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50">
                            {isLoading ? 'Logging in...' : 'Secure Login'}
                        </button>
                    </form>
                )}

                {loginMode === 'DEALER' && (
                    <form onSubmit={handleDealerSubmit} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="text-center py-2">
                            <p className="text-sm text-gray-600 font-medium">Enter your registered email address.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Dealer Email</label>
                            <input
                                type="email"
                                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-indigo-500 focus:outline-none transition-colors"
                                value={dealerEmail}
                                onChange={(e) => setDealerEmail(e.target.value)}
                                placeholder="e.g. shop@example.com"
                                required
                            />
                        </div>

                        <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50">
                            {isLoading ? 'Checking Access...' : 'Login as Dealer'}
                        </button>
                    </form>
                )}

                <div className="mt-8 text-center border-t border-gray-100 pt-6">
                    <p className="text-xs text-gray-400 font-bold mb-3 uppercase tracking-widest">Internal Access</p>
                    <button
                        onClick={() => navigate('/worker/login')}
                        className="text-indigo-600 hover:text-indigo-800 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 mx-auto hover:bg-indigo-50 px-4 py-2 rounded-lg transition-all"
                    >
                        🏭 Factory Floor Login
                    </button>
                </div>
            </div>
        </div>
    );
}
