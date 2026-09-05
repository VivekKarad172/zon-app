import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Logo from '../components/Logo';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export default function Login() {
    const { login, dealerLogin, googleLogin } = useAuth();
    const navigate = useNavigate();

    // "DEFAULT" (Manuf/Dist) or "DEALER"
    const [loginMode, setLoginMode] = useState('DEFAULT');

    const [adminForm, setAdminForm] = useState({ username: '', password: '' });
    const [dealerForm, setDealerForm] = useState({ email: '', password: '' });
    const [dealerNeedsPassword, setDealerNeedsPassword] = useState(false);

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
            await dealerLogin(dealerForm.email, dealerForm.password);
            toast.success('Dealer Login Successful');
            navigate('/dealer');
        } catch (err) {
            console.error(err);
            const errData = err.response?.data;
            // Server signals that this account requires a password
            if (errData?.requiresPassword) {
                setDealerNeedsPassword(true);
                setError('This account has a password. Please enter it below.');
            } else {
                setError(errData?.error || 'Dealer Login failed');
                toast.error(errData?.error || 'Login failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        GoogleAuth.initialize({
            clientId: '255657544771-f83qrosah74t147ln3iden1r195u3m7s.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
        });
    }, []);

    const handleGoogleLogin = async () => {
        try {
            setError('');
            setIsLoading(true);
            const response = await GoogleAuth.signIn();
            const idToken = response.authentication.idToken;
            
            const data = await googleLogin(idToken);
            toast.success(`Welcome back, ${data.user.name}!`, { icon: '👋' });
            
            // Redirect based on role
            if (data.user.role === 'DEALER') navigate('/dealer');
            else if (data.user.role === 'DISTRIBUTOR') navigate('/distributor');
            else if (data.user.role === 'MANAGER') navigate('/manager/dashboard');
            else navigate('/admin');
            
        } catch (error) {
            console.error('GOOGLE AUTH ERROR RAW:', error);
            const errMsg = error?.response?.data?.error || error?.message || error?.error || JSON.stringify(error);
            
            if (errMsg !== 'user cancelled login' && errMsg !== 'popup_closed_by_user') {
                setError(`Google Login failed: ${errMsg}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-700 via-red-900 to-gray-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-3">
                        <Logo size={56} textClassName="text-3xl" />
                    </div>
                    <p className="text-gray-500 font-medium">Manufacturing Workflow System</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                    <button
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${loginMode === 'DEFAULT' ? 'bg-white shadow text-red-900' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setLoginMode('DEFAULT'); setError('') }}
                    >
                        Admin / Distributor
                    </button>
                    <button
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${loginMode === 'DEALER' ? 'bg-white shadow text-red-900' : 'text-gray-500 hover:text-gray-700'}`}
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
                                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-red-500 focus:outline-none transition-colors"
                                value={adminForm.username}
                                onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-red-500 focus:outline-none transition-colors"
                                value={adminForm.password}
                                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-red-200 disabled:opacity-50">
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
                                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-red-500 focus:outline-none transition-colors"
                                value={dealerForm.email}
                                onChange={(e) => { setDealerForm({ ...dealerForm, email: e.target.value }); setDealerNeedsPassword(false); }}
                                placeholder="e.g. shop@example.com"
                                required
                            />
                        </div>
                        {dealerNeedsPassword && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full border-2 border-red-300 rounded-lg p-3 focus:border-red-500 focus:outline-none transition-colors"
                                    value={dealerForm.password}
                                    onChange={(e) => setDealerForm({ ...dealerForm, password: e.target.value })}
                                    placeholder="Enter your password"
                                    autoFocus
                                    required
                                />
                            </div>
                        )}
                        <button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-red-200 disabled:opacity-50">
                            {isLoading ? 'Checking Access...' : 'Login as Dealer'}
                        </button>
                    </form>
                )}

                <div className="relative mt-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-100"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-400 font-bold uppercase tracking-widest text-[10px]">Or continue with</span>
                    </div>
                </div>

                <div className="mt-6">
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full flex justify-center items-center gap-3 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google Login
                    </button>
                </div>

                <div className="mt-8 text-center border-t border-gray-100 pt-6">
                    <p className="text-xs text-gray-400 font-bold mb-3 uppercase tracking-widest">Internal Access</p>
                    <button
                        onClick={() => navigate('/worker/login')}
                        className="text-red-600 hover:text-red-800 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 mx-auto hover:bg-red-50 px-4 py-2 rounded-lg transition-all"
                    >
                        🏭 Factory Floor Login
                    </button>
                </div>
            </div>
        </div>
    );
}
