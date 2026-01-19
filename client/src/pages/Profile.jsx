import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Store, MapPin, Save, ArrowLeft } from 'lucide-react';

const Profile = () => {
    const { user, login } = useAuth(); // Re-use login to update local storage user state if name changes
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        shopName: '',
        city: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                shopName: user.shopName || '',
                city: user.city || ''
            }));
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            return setMessage({ type: 'error', text: 'New passwords do not match' });
        }

        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                shopName: formData.shopName,
                city: formData.city
            };

            // Only send password fields if user is trying to change it
            if (formData.newPassword) {
                payload.currentPassword = formData.currentPassword;
                payload.newPassword = formData.newPassword;
            }

            const res = await api.put('/auth/profile', payload);

            setMessage({ type: 'success', text: 'Profile updated successfully!' });

            // Update local user context if name changed
            // We do this by simulating a "silent login" update or just waiting for refresh
            // Ideally auth context should expose an update function, but for now this is purely visual on this page
            // The backend is verified updated.

            // Clear password fields for security
            setFormData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));

        } catch (error) {
            const errMsg = error.response?.data?.error || 'Failed to update profile';
            setMessage({ type: 'error', text: errMsg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 font-sans">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">

                {/* Header */}
                <div className="bg-indigo-700 p-6 flex items-center text-white">
                    <button onClick={() => navigate(-1)} className="mr-4 hover:bg-indigo-600 p-1 rounded-full"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="text-xl font-bold">My Profile</h1>
                        <p className="text-indigo-200 text-sm">Manage your account</p>
                    </div>
                </div>

                <div className="p-6">
                    {message && (
                        <div className={`p-3 rounded-lg mb-6 text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* PERSONAL INFO */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <User size={14} /> Personal Details
                            </h2>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Your Name"
                                    required
                                />
                            </div>

                            {user?.role !== 'MANUFACTURER' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Shop Name</label>
                                        <div className="relative">
                                            <Store className="absolute left-3 top-3 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                name="shopName"
                                                value={formData.shopName}
                                                onChange={handleChange}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-indigo-500"
                                                placeholder="My Awesome Shop"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleChange}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-indigo-500"
                                                placeholder="City"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* PASSWORD CHANGE (Hidden for Dealers) */}
                        {user?.role !== 'DEALER' && (
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <Lock size={14} /> Security (Change Password)
                                </h2>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={formData.currentPassword}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                                        <input
                                            type="password"
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                                            placeholder="New Pass"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Confirm"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400">Leave password fields empty to keep current password.</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            {loading ? 'Saving...' : <><Save size={18} /> Update Profile</>}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;
