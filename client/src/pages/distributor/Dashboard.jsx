import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Bell, ShoppingBag, Users, Clock, CheckCircle, Upload, X, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DistributorDashboard() {
    const { logout, user } = useAuth();
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
        <div className="min-h-screen bg-gray-100">
            {/* ... (existing nav and stats) ... */}

            {/* ... (existing tabs) ... */}
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-indigo-800">Distributor Panel</h1>
                    <div className="flex items-center gap-4">
                        <span className="font-medium">{user?.name}</span>
                        <button onClick={() => setShowProfile(true)} className="text-indigo-600 font-bold hover:text-indigo-800">Profile</button>
                        <button onClick={logout} className="text-red-500 font-bold">Logout</button>
                    </div>
                </div>
            </nav>

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
                    <div className="bg-yellow-100 p-3 rounded-full"><Clock className="text-yellow-600" /></div>
                    <div>
                        <div className="text-2xl font-bold">{pendingCount}</div>
                        <div className="text-sm text-gray-500">Pending Orders</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
                    <div className="bg-green-100 p-3 rounded-full"><CheckCircle className="text-green-600" /></div>
                    <div>
                        <div className="text-2xl font-bold">{completedCount}</div>
                        <div className="text-sm text-gray-500">Completed</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
                    <div className="bg-indigo-100 p-3 rounded-full"><Users className="text-indigo-600" /></div>
                    <div>
                        <div className="text-2xl font-bold">{dealers.length || '—'}</div>
                        <div className="text-sm text-gray-500">My Dealers</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto px-4 py-2">
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'orders' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500'}`}>
                        <ShoppingBag size={16} /> Orders
                    </button>
                    <button onClick={() => setActiveTab('dealers')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'dealers' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500'}`}>
                        <Users size={16} /> My Dealers
                    </button>
                    <button onClick={() => setActiveTab('whatsnew')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'whatsnew' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500'}`}>
                        <Bell size={16} /> What's New
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-4">
                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div>
                        {/* Order Filter Buttons */}
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex gap-2">
                                <button onClick={() => setOrderFilter('all')} className={`px-4 py-2 rounded-lg font-medium text-sm ${orderFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white'}`}>
                                    All ({orders.length})
                                </button>
                                <button onClick={() => setOrderFilter('pending')} className={`px-4 py-2 rounded-lg font-medium text-sm ${orderFilter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-white text-yellow-600'}`}>
                                    <Clock size={14} className="inline mr-1" /> Pending ({pendingCount})
                                </button>
                                <button onClick={() => setOrderFilter('completed')} className={`px-4 py-2 rounded-lg font-medium text-sm ${orderFilter === 'completed' ? 'bg-green-500 text-white' : 'bg-white text-green-600'}`}>
                                    <CheckCircle size={14} className="inline mr-1" /> Completed ({completedCount})
                                </button>
                            </div>
                            <button onClick={handleExportOrders} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700">
                                <FileSpreadsheet size={16} /> Export to Excel
                            </button>
                        </div>

                        <div className="bg-white rounded-xl shadow overflow-hidden">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dealer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Update Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredOrders.map(order => (
                                        <tr key={order.id} className={`hover:bg-gray-50 ${order.isEdited ? 'bg-orange-50 border-l-4 border-orange-400' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-indigo-700">#{order.id}</span>
                                                    {order.isEdited && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">EDITED</span>}
                                                </div>
                                                <div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium">{order.User?.name}</div>
                                                <div className="text-xs text-gray-400">{order.User?.shopName}</div>
                                            </td>
                                            <td className="px-6 py-4">{order.OrderItems?.length} items</td>
                                            <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                                            <td className="px-6 py-4">
                                                {!['DISPATCHED', 'CANCELLED'].includes(order.status) ? (
                                                    <select
                                                        value={order.status}
                                                        onChange={(e) => updateStatus(order.id, e.target.value)}
                                                        className="border rounded-lg p-2 text-sm font-medium"
                                                    >
                                                        <option value="RECEIVED">📥 Received</option>
                                                        <option value="PRODUCTION">🔧 Production</option>
                                                        <option value="READY">✅ Ready</option>
                                                        <option value="DELAYED">⏳ Delayed</option>
                                                    </select>
                                                ) : (
                                                    <span className={`text-sm font-bold ${order.status === 'CANCELLED' ? 'text-red-500' : 'text-gray-400'}`}>
                                                        {order.status === 'CANCELLED' ? '❌ Cancelled' : 'Completed'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredOrders.length === 0 && (
                                        <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">No orders found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* My Dealers Tab */}
                {activeTab === 'dealers' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Dealers Assigned to You</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setShowBulkUpload(true)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-2">
                                    <Upload size={16} /> Bulk Upload
                                </button>
                                <button onClick={() => {
                                    setNewDealer({ name: '', email: '', city: '', shopName: '' });
                                    setIsEditingDealer(false);
                                    setShowAddDealer(true);
                                }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-2">
                                    <Users size={16} /> Add New Dealer
                                </button>
                            </div>
                        </div>

                        {dealers.length === 0 ? (
                            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
                                No dealers assigned to you yet. Click "Add New Dealer" to get started.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {dealers.map(dealer => (
                                    <div key={dealer.id} className={`bg-white rounded-xl shadow-lg p-4 border-l-4 ${dealer.isEnabled ? 'border-green-500' : 'border-red-500'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-lg">{dealer.name}</div>
                                                <div className="text-sm text-gray-500">{dealer.shopName || 'No shop name'}</div>
                                                <div className="text-sm text-gray-400">{dealer.city || 'No city'}</div>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${dealer.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {dealer.isEnabled ? 'Active' : 'Disabled'}
                                            </span>
                                        </div>
                                        <div className="mt-3 pt-3 border-t">
                                            <div className="text-xs text-gray-500">📧 {dealer.email}</div>
                                            <div className="flex gap-2 mt-2">
                                                <button onClick={() => openEditDealer(dealer)} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-bold">
                                                    Edit
                                                </button>
                                                <button onClick={() => setShowDeleteConfirm(dealer.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 font-bold">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* What's New Tab */}
                {activeTab === 'whatsnew' && (
                    <div className="max-w-2xl mx-auto space-y-4">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Bell className="text-indigo-600" /> What's New
                        </h2>
                        {posts.length === 0 && (
                            <div className="text-center text-gray-400 py-12 bg-white rounded-xl shadow">No updates yet. Check back soon!</div>
                        )}
                        {posts.map(post => (
                            <div key={post.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                {post.imageUrl && (
                                    <div className="h-48 bg-gray-100">
                                        <img src={getImageUrl(post.imageUrl)} className="w-full h-full object-cover" alt="Post" />
                                    </div>
                                )}
                                <div className="p-5">
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${post.postType === 'announcement' ? 'bg-blue-100 text-blue-700' : post.postType === 'new_design' ? 'bg-purple-100 text-purple-700' : post.postType === 'promotion' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {post.postType === 'announcement' ? '📢' : post.postType === 'new_design' ? '🚪' : post.postType === 'promotion' ? '🎉' : '📋'} {post.postType.replace('_', ' ')}
                                    </span>
                                    {post.title && <h3 className="font-bold text-lg text-gray-800 mt-2">{post.title}</h3>}
                                    <p className="text-gray-600 mt-2 whitespace-pre-wrap">{post.content}</p>
                                    <div className="text-xs text-gray-400 mt-4">{new Date(post.createdAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Dealer Modal */}
            {showAddDealer && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{isEditingDealer ? 'Edit Dealer' : 'Add New Dealer'}</h2>
                            <button onClick={() => setShowAddDealer(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
                        </div>
                        <form onSubmit={handleAddDealer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2"
                                    value={newDealer.name}
                                    onChange={e => setNewDealer({ ...newDealer, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email (For Login)</label>
                                <input
                                    type="email"
                                    className="w-full border rounded-lg p-2"
                                    value={newDealer.email}
                                    onChange={e => setNewDealer({ ...newDealer, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">City</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2"
                                    value={newDealer.city}
                                    onChange={e => setNewDealer({ ...newDealer, city: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Shop Name</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2"
                                    value={newDealer.shopName}
                                    onChange={e => setNewDealer({ ...newDealer, shopName: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 mt-4">
                                {isEditingDealer ? 'Update Dealer' : 'Create Dealer'}
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
