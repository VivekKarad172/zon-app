import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Bell, ShoppingBag, Users, Clock, CheckCircle, Upload, X, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DistributorDashboard() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('orders');
    const [orderFilter, setOrderFilter] = useState('all'); // all, pending, completed
    const [orders, setOrders] = useState([]);
    const [dealers, setDealers] = useState([]);
    const [posts, setPosts] = useState([]);

    const [showAddDealer, setShowAddDealer] = useState(false);
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // dealer id or null

    // Edit Dealer State
    const [isEditingDealer, setIsEditingDealer] = useState(false);
    const [editingDealerId, setEditingDealerId] = useState(null);

    const [newDealer, setNewDealer] = useState({ name: '', email: '', city: '', shopName: '' });

    // Profile State
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        city: user?.city || '',
        shopName: user?.shopName || '',
        password: '',
        confirmPassword: ''
    });

    const [bulkData, setBulkData] = useState('');

    useEffect(() => {
        if (activeTab === 'orders') fetchOrders();
        if (activeTab === 'dealers') fetchDealers();
        if (activeTab === 'whatsnew') fetchPosts();
    }, [activeTab]);

    const fetchOrders = async () => {
        try {
            const res = await api.get('/orders');
            setOrders(res.data);
        } catch (error) {
            toast.error('Failed to load orders');
        }
    };

    const fetchDealers = async () => {
        try {
            // Distributors see only their assigned dealers
            const res = await api.get('/users?role=DEALER');
            // Backend now filters by distributorId for DISTRIBUTOR role
            console.log('DEBUG: Distributor ID:', user.id);
            console.log('DEBUG: Fetched Dealers Response:', res.data);
            setDealers(res.data);
        } catch (e) { }
    };

    const fetchPosts = async () => {
        try { const res = await api.get('/posts'); setPosts(res.data); } catch (e) { }
    };

    const updateStatus = async (id, status) => {
        try {
            await api.put(`/orders/${id}/status`, { status });
            toast.success('Status updated to: ' + status);
            fetchOrders();
        } catch (error) {
            toast.error('Update failed');
        }
    };

    const handleExportOrders = () => {
        if (!orders.length) {
            toast.error('No orders to export');
            return;
        }

        const exportData = orders.map(order => ({
            'Order ID': order.id,
            'Date': new Date(order.createdAt).toLocaleDateString(),
            'Dealer Name': order.User?.name,
            'Shop Name': order.User?.shopName,
            'City': order.User?.city,
            'Total Items': order.OrderItems?.length,
            'Status': order.status
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Orders");
        XLSX.writeFile(wb, `Orders_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Orders exported successfully');
    };

    const handleDeleteDealer = async (id) => {
        try {
            await api.delete(`/users/${id}`);
            toast.success('Dealer deleted successfully');
            setShowDeleteConfirm(null);
            fetchDealers();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete dealer');
        }
    };

    const openEditDealer = (dealer) => {
        setNewDealer({
            name: dealer.name,
            email: dealer.email,
            city: dealer.city || '',
            shopName: dealer.shopName || ''
        });
        setEditingDealerId(dealer.id);
        setIsEditingDealer(true);
        setShowAddDealer(true);
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (profileData.password && profileData.password !== profileData.confirmPassword) {
            return toast.error('Passwords do not match');
        }

        try {
            const updatePayload = {
                name: profileData.name,
                username: profileData.username,
                city: profileData.city,
                shopName: profileData.shopName
            };
            if (profileData.password) updatePayload.password = profileData.password;

            await api.put(`/users/${user.id}`, updatePayload);
            toast.success('Profile updated successfully');
            setShowProfile(false);
            setProfileData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update profile');
        }
    };

    const getImageUrl = (path) => path ? api.defaults.baseURL.replace('/api', '') + path : null;

    // Filter orders based on selection
    const filteredOrders = orders.filter(order => {
        if (orderFilter === 'pending') return ['RECEIVED', 'PRODUCTION'].includes(order.status);
        if (orderFilter === 'completed') return ['READY', 'DISPATCHED'].includes(order.status);
        return true;
    });

    const getStatusBadge = (status) => {
        const styles = {
            'RECEIVED': 'bg-yellow-100 text-yellow-800',
            'PRODUCTION': 'bg-blue-100 text-blue-800',
            'READY': 'bg-green-100 text-green-800',
            'DISPATCHED': 'bg-purple-100 text-purple-800',
            'DELAYED': 'bg-orange-100 text-orange-800',
            'CANCELLED': 'bg-red-100 text-red-800'
        };
        const emojis = { 'RECEIVED': '📥', 'PRODUCTION': '🔧', 'READY': '✅', 'DISPATCHED': '🚚', 'DELAYED': '⏳', 'CANCELLED': '❌' };
        return <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{emojis[status] || ''} {status}</span>;
    };

    const pendingCount = orders.filter(o => ['RECEIVED', 'PRODUCTION'].includes(o.status)).length;
    const completedCount = orders.filter(o => ['READY', 'DISPATCHED'].includes(o.status)).length;


    const handleAddDealer = async (e) => {
        e.preventDefault();
        try {
            if (isEditingDealer) {
                await api.put(`/users/${editingDealerId}`, {
                    name: newDealer.name,
                    // email cannot be changed for Dealers by Distributor in this flow easily without check
                    // but let's allow other fields
                    city: newDealer.city,
                    shopName: newDealer.shopName
                });
                toast.success('Dealer updated successfully');
            } else {
                await api.post('/users', {
                    ...newDealer,
                    role: 'DEALER'
                });
                toast.success('Dealer created successfully');
            }
            setShowAddDealer(false);
            setNewDealer({ name: '', email: '', city: '', shopName: '' });
            setIsEditingDealer(false);
            setEditingDealerId(null);
            fetchDealers();
        } catch (error) {
            console.error('Operation Error:', error.response?.data);
            toast.error(error.response?.data?.error || 'Operation failed');
        }
    };

    const processBulkUpload = async (users) => {
        try {
            const res = await api.post('/users/bulk', { users, role: 'DEALER' });
            toast.success(res.data.message);
            if (res.data.failed > 0) {
                toast.error(`Failed to create ${res.data.failed} users. Check console.`);
                console.error("Bulk Upload Errors:", res.data.errors);
            }
            setShowBulkUpload(false);
            fetchDealers();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Bulk upload failed');
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);
            const cleanData = data.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => newRow[key.trim()] = row[key]);
                return newRow;
            });
            processBulkUpload(cleanData);
        };
        reader.readAsBinaryString(file);
    };

    const downloadSample = () => {
        const wb = XLSX.utils.book_new();
        const data = [
            { name: 'Dealer Name', email: 'dealer@example.com', city: 'Pune', shopName: 'Pune Shop' },
            { name: 'Jane Smith', email: 'jane@test.com', city: 'Surat', shopName: 'Jane Interiors' }
        ];
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `dealer_bulk_sample.xlsx`);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 shadow-lg p-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            <span className="font-bold text-xl tracking-wider">Z-ON</span>
                        </div>
                        <h1 className="text-lg font-medium opacity-90 hidden sm:block">Distributor Panel</h1>
                    </div>
                    <div className="flex gap-3 text-sm items-center">
                        <span className="hidden sm:inline font-medium opacity-90">Hi, {user?.name}</span>
                        <button onClick={() => navigate('/profile')} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-all backdrop-blur-sm">
                            <Users size={18} />
                        </button>
                        <button onClick={logout} className="text-red-200 hover:text-white font-bold text-xs bg-red-500/20 px-3 py-1 rounded-full border border-red-400/30">Exit</button>
                    </div>
                </div>
            </div>

            {/* Floating Tabs */}
            <div className="px-4 -mt-6 relative z-40 mb-8">
                <div className="bg-white rounded-2xl shadow-xl p-1.5 flex justify-between gap-1 max-w-lg mx-auto overflow-x-auto">
                    <button onClick={() => setActiveTab('orders')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 whitespace-nowrap ${activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-400 hover:bg-gray-50'}`}>
                        <ShoppingBag size={18} />
                        <span>Orders</span>
                    </button>
                    <button onClick={() => setActiveTab('dealers')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 whitespace-nowrap ${activeTab === 'dealers' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-400 hover:bg-gray-50'}`}>
                        <Users size={18} />
                        <span>My Dealers</span>
                    </button>
                    <button onClick={() => setActiveTab('whatsnew')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 whitespace-nowrap ${activeTab === 'whatsnew' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-400 hover:bg-gray-50'}`}>
                        <Bell size={18} />
                        <span>News</span>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4">

                {/* Stats Section (Visible on Orders Tab) */}
                {activeTab === 'orders' && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total</span>
                            <span className="text-3xl font-bold text-gray-800">{orders.length}</span>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4 shadow-sm border border-yellow-100 flex flex-col items-center text-center">
                            <span className="text-yellow-600 text-xs font-bold uppercase tracking-wider">Pending</span>
                            <span className="text-3xl font-bold text-yellow-700">{pendingCount}</span>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 shadow-sm border border-green-100 flex flex-col items-center text-center">
                            <span className="text-green-600 text-xs font-bold uppercase tracking-wider">Completed</span>
                            <span className="text-3xl font-bold text-green-700">{completedCount}</span>
                        </div>
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                            <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">Dealers</span>
                            <span className="text-3xl font-bold text-indigo-800">{dealers.length}</span>
                        </div>
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div className="animate-in fade-in duration-500">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex gap-1">
                                <button onClick={() => setOrderFilter('all')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${orderFilter === 'all' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>All</button>
                                <button onClick={() => setOrderFilter('pending')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${orderFilter === 'pending' ? 'bg-yellow-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Pending</button>
                                <button onClick={() => setOrderFilter('completed')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${orderFilter === 'completed' ? 'bg-green-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Done</button>
                            </div>
                            <button onClick={handleExportOrders} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 flex items-center gap-2 transition-all active:scale-95">
                                <FileSpreadsheet size={18} /> Export Excel
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4">Order Info</th>
                                            <th className="px-6 py-4">Dealer</th>
                                            <th className="px-6 py-4">Items</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-indigo-900 block">#{order.id}</span>
                                                    <span className="text-gray-400 text-xs">{new Date(order.createdAt).toLocaleDateString()}</span>
                                                    {order.isEdited && <span className="inline-block mt-1 bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-bold">EDITED</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-800">{order.User?.name}</div>
                                                    <div className="text-gray-400 text-xs">{order.User?.shopName}, {order.User?.city}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-bold text-xs">{order.OrderItems?.length} Products</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(order.status)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {!['DISPATCHED', 'CANCELLED'].includes(order.status) ? (
                                                        <select
                                                            value={order.status}
                                                            onChange={(e) => updateStatus(order.id, e.target.value)}
                                                            className="bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2"
                                                        >
                                                            <option value="RECEIVED">📥 Received</option>
                                                            <option value="PRODUCTION">🔧 Production</option>
                                                            <option value="READY">✅ Ready</option>
                                                            <option value="DELAYED">⏳ Delayed</option>
                                                        </select>
                                                    ) : (
                                                        <span className="text-xs font-medium text-gray-400 italic">Locked</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredOrders.length === 0 && (
                                    <div className="p-12 text-center text-gray-400">
                                        <ShoppingBag size={48} className="mx-auto mb-3 opacity-20" />
                                        <p>No orders found for this filter.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* My Dealers Tab */}
                {activeTab === 'dealers' && (
                    <div className="animate-in fade-in duration-500">
                        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">My Dealers</h2>
                                <p className="text-gray-500 text-sm">Manage your dealer network</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowBulkUpload(true)} className="bg-white border border-green-200 text-green-700 hover:bg-green-50 px-4 py-2 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 transition-all">
                                    <FileSpreadsheet size={16} /> Bulk Upload
                                </button>
                                <button onClick={() => {
                                    setNewDealer({ name: '', email: '', city: '', shopName: '' });
                                    setIsEditingDealer(false);
                                    setShowAddDealer(true);
                                }} className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95">
                                    <Users size={18} /> Add Dealer
                                </button>
                            </div>
                        </div>

                        {dealers.length === 0 ? (
                            <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-gray-200">
                                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-bold text-gray-700">No Dealers Yet</h3>
                                <p className="text-gray-500 text-sm mb-6">Start by adding individual dealers or uploading a list.</p>
                                <button onClick={() => setShowAddDealer(true)} className="text-indigo-600 font-bold hover:underline">Add Your First Dealer</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {dealers.map(dealer => (
                                    <div key={dealer.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow group relative overflow-hidden">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${dealer.isEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-indigo-600 text-lg">
                                                    {dealer.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-800">{dealer.name}</h3>
                                                    <p className="text-xs text-gray-500 font-medium">@{dealer.username}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${dealer.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {dealer.isEnabled ? 'Active' : 'Disabled'}
                                            </span>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                                <ShoppingBag size={14} className="text-gray-400" />
                                                <span className="font-medium">{dealer.shopName || 'No Shop Name'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                                <CheckCircle size={14} className="text-gray-400" />
                                                <span>{dealer.city || 'No City'}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                                            <button onClick={() => openEditDealer(dealer)} className="flex-1 bg-white border border-gray-200 text-gray-700 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors">Edit</button>
                                            <button onClick={() => setShowDeleteConfirm(dealer.id)} className="flex-1 bg-white border border-red-50 text-red-400 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-600 transition-colors">Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* What's New Tab */}
                {activeTab === 'whatsnew' && (
                    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Latest Updates</h2>
                            <p className="text-gray-500">News and announcements for your network</p>
                        </div>
                        {posts.length === 0 && (
                            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                                <Bell size={48} className="mx-auto text-gray-200 mb-4" />
                                <p className="text-gray-400 font-medium">No updates available at the moment.</p>
                            </div>
                        )}
                        {posts.map(post => (
                            <div key={post.id} className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow">
                                {post.imageUrl && (
                                    <div className="h-56 bg-gray-100 relative">
                                        <img src={getImageUrl(post.imageUrl)} className="w-full h-full object-cover" alt="Post" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                        <div className="absolute bottom-4 left-4 text-white">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 backdrop-blur-md ${post.postType === 'announcement' ? 'bg-blue-500/80' : post.postType === 'new_design' ? 'bg-purple-500/80' : 'bg-yellow-500/80'}`}>
                                                {post.postType.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div className="p-6">
                                    {!post.imageUrl && (
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${post.postType === 'announcement' ? 'bg-blue-100 text-blue-700' : post.postType === 'new_design' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {post.postType.replace('_', ' ').toUpperCase()}
                                        </span>
                                    )}
                                    <h3 className="font-bold text-xl text-gray-800 mb-3">{post.title}</h3>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                                    <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400 font-medium">
                                        <span>Posted {new Date(post.createdAt).toLocaleDateString()}</span>
                                        <span>Z-ON Admin Team</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals remain essentially the same functionality wise, just styling tweaks if needed, but the wrapper div bg-gray-50 handles most */}
            {/* Add Dealer Modal */}
            {showAddDealer && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">{isEditingDealer ? 'Edit Dealer' : 'Add New Dealer'}</h2>
                            <button onClick={() => setShowAddDealer(false)} className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleAddDealer} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
                                <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" value={newDealer.name} onChange={e => setNewDealer({ ...newDealer, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email (Login)</label>
                                <input type="email" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" value={newDealer.email} onChange={e => setNewDealer({ ...newDealer, email: e.target.value })} required disabled={isEditingDealer} /> {/* Email disabled on edit mostly */}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">City</label>
                                    <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" value={newDealer.city} onChange={e => setNewDealer({ ...newDealer, city: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Shop Name</label>
                                    <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" value={newDealer.shopName} onChange={e => setNewDealer({ ...newDealer, shopName: e.target.value })} />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-indigo-700 mt-4 transition-all active:scale-95">
                                {isEditingDealer ? 'Update Dealer' : 'Create Dealer Account'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkUpload && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold">Bulk Dealer Upload</h2>
                                <p className="text-sm text-gray-500">Upload Excel file with Dealer details</p>
                            </div>
                            <button onClick={() => setShowBulkUpload(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                <h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">
                                    <FileSpreadsheet size={18} /> Step 1: Download Template
                                </h3>
                                <p className="text-sm text-indigo-600 mb-3">Use our template to ensure correct format.</p>
                                <button onClick={downloadSample} className="w-full bg-white text-indigo-600 border border-indigo-200 font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors">
                                    <Download size={18} /> Download Sample Excel
                                </button>
                            </div>

                            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                                    <Upload size={18} /> Step 2: Upload File
                                </h3>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                                />
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t">
                            <button onClick={() => setShowBulkUpload(false)} className="w-full bg-gray-100 text-gray-600 font-bold py-2 rounded-lg hover:bg-gray-200">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DeleteConfirmModal show={!!showDeleteConfirm} onConfirm={() => handleDeleteDealer(showDeleteConfirm)} onCancel={() => setShowDeleteConfirm(null)} />
            <ProfileModal show={showProfile} onClose={() => setShowProfile(false)} data={profileData} onChange={setProfileData} onSubmit={handleUpdateProfile} />
        </div>
    );
}

// Additional Dialogs/Modals inside the component would be cleaner, but for now appending here
function DeleteConfirmModal({ show, onConfirm, onCancel }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl text-center">
                <div className="text-red-500 mb-4 flex justify-center"><X size={48} /></div>
                <h3 className="text-lg font-bold mb-2">Are you sure?</h3>
                <p className="text-gray-500 text-sm mb-6">This action cannot be undone. The dealer and their access will be removed.</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-100 font-bold text-gray-700">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 font-bold text-white hover:bg-red-700">Delete</button>
                </div>
            </div>
        </div>
    );
}

function ProfileModal({ show, onClose, data, onChange, onSubmit }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Edit Profile</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
                </div>
                <form onSubmit={onSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Your Name</label>
                        <input type="text" className="w-full border rounded-lg p-2" value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Login Username</label>
                        <input type="text" className="w-full border rounded-lg p-2 bg-gray-100" value={data.username} onChange={e => onChange({ ...data, username: e.target.value })} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">City</label>
                        <input type="text" className="w-full border rounded-lg p-2" value={data.city} onChange={e => onChange({ ...data, city: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Shop Name</label>
                        <input type="text" className="w-full border rounded-lg p-2" value={data.shopName} onChange={e => onChange({ ...data, shopName: e.target.value })} />
                    </div>
                    <div className="border-t pt-4 mt-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">New Password (Optional)</label>
                        <input type="password" className="w-full border rounded-lg p-2" placeholder="Leave blank to keep current" value={data.password} onChange={e => onChange({ ...data, password: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Confirm New Password</label>
                        <input type="password" className="w-full border rounded-lg p-2" placeholder="Confirm new password" value={data.confirmPassword} onChange={e => onChange({ ...data, confirmPassword: e.target.value })} />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 mt-2">
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
}
