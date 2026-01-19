import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    // Safety check in case useAuth is used outside provider
    if (!context) {
        return { user: null, loading: false, login: () => { }, dealerLogin: () => { }, logout: () => { } };
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('token');

                if (token && token.split('.').length === 3) {
                    // Temporarily use token to set headers
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                    // Basic Decode
                    const payload = JSON.parse(atob(token.split('.')[1]));

                    if (payload.exp * 1000 < Date.now()) {
                        console.warn('Token expired');
                        handleLogoutCleanup();
                    } else {
                        setUser(payload);
                    }
                } else {
                    handleLogoutCleanup(); // Ensure clean state if no token
                }
            } catch (error) {
                console.error("Auth Check Error:", error);
                handleLogoutCleanup();
            } finally {
                setLoading(false); // ALWAYS finish loading
            }
        };

        checkAuth();
    }, []);

    const handleLogoutCleanup = () => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    };

    const login = async (username, password) => {
        try {
            const res = await api.post('/auth/login', { username, password });
            const { token, user: userData } = res.data;
            localStorage.setItem('token', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(userData);
            return res.data;
        } catch (error) {
            console.error("Login Failed:", error);
            throw error;
        }
    };

    const dealerLogin = async (email) => {
        try {
            const res = await api.post('/auth/dealer-login', { email });
            const { token, user: userData } = res.data;
            localStorage.setItem('token', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(userData);
            return res.data;
        } catch (error) {
            console.error("Dealer Login Failed:", error);
            throw error;
        }
    }

    const logout = () => {
        handleLogoutCleanup();
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, login, dealerLogin, logout, loading }}>
            {children}
            {/* NO global loading block here. Children render immediately. */}
        </AuthContext.Provider>
    );
};
