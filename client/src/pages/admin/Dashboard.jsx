import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, Image as ImageIcon, Filter, Search, Edit2, Eye, EyeOff, Save, Trash2, User, Users, ShoppingBag, Bell, Upload, Download, FileSpreadsheet, Home, CheckSquare, Calendar, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
    const { logout, user } = useAuth();
    const [activeTab, setActiveTab] = useState('home'); // home, orders, designs, masters, distributors, dealers

    // ALL STATE DEFINTIONS FROM BEFORE...
    const [orders, setOrders] = useState([]);
    const [designs, setDesigns] = useState([]);
    const [doors, setDoors] = useState([]);
    const [colors, setColors] = useState([]);
    const [distributors, setDistributors] = useState([]);
    const [dealers, setDealers] = useState([]);
    const [distributorFilter, setDistributorFilter] = useState('');
    const [posts, setPosts] = useState([]); // What's New posts

    const [orderFilter, setOrderFilter] = useState({ status: '', search: '', sort: 'latest' });

    const [showAddDesign, setShowAddDesign] = useState(false);
    const [showAddColor, setShowAddColor] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);

    const [editingDesign, setEditingDesign] = useState(null);
    const [editingColor, setEditingColor] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [userModalType, setUserModalType] = useState('DISTRIBUTOR');

    const [newDesign, setNewDesign] = useState({ designNumber: '', category: '', doorTypeId: '', isTrending: false, image: null, colorIds: [] });
    const [newColor, setNewColor] = useState({ name: '', hexCode: '', image: null, isEnabled: true });

    // Updated User Form: Added email
    const [userForm, setUserForm] = useState({
        username: '', password: '', email: '', name: '', city: '', shopName: '', distributorId: '', isEnabled: true
    });
    const [newPost, setNewPost] = useState({ title: '', content: '', postType: 'announcement', image: null });
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [bulkUploadType, setBulkUploadType] = useState('DISTRIBUTOR');
    const [bulkData, setBulkData] = useState('');

    // NEW STATE FOR V2
    const [analytics, setAnalytics] = useState(null);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [showBulkAction, setShowBulkAction] = useState(false);


    useEffect(() => {
        if (activeTab === 'home') fetchAnalytics();
        if (activeTab === 'orders') fetchOrders();
        if (activeTab === 'designs' || activeTab === 'masters') { fetchDesigns(); fetchDoors(); fetchColors(); }
        if (activeTab === 'distributors') fetchDistributors();
        if (activeTab === 'dealers') { fetchDealers(); fetchDistributors(); }
        if (activeTab === 'whatsnew') fetchPosts();
    }, [activeTab, orderFilter, dateRange]); // Trigger on dateRange change too

    // FETCHERS (Same as before)
    // FETCHERS
    const fetchAnalytics = async () => { try { const res = await api.get('/orders/analytics'); setAnalytics(res.data); } catch (e) { } };
    const fetchOrders = async () => {
        try {
            const params = new URLSearchParams(orderFilter);
            if (dateRange.start) params.append('startDate', dateRange.start);
            if (dateRange.end) params.append('endDate', dateRange.end);
            const res = await api.get(`/orders?${params.toString()}`);
            setOrders(res.data);
        } catch (e) { }
    };
    const fetchDesigns = async () => { try { const res = await api.get('/designs'); setDesigns(res.data); } catch (e) { } };
    const fetchDoors = async () => { try { const res = await api.get('/doors'); setDoors(res.data); } catch (e) { } };
    const fetchColors = async () => { try { const res = await api.get('/colors'); setColors(res.data); } catch (e) { } };
    const fetchDistributors = async () => { try { const res = await api.get('/users?role=DISTRIBUTOR'); setDistributors(res.data); } catch (e) { } };
    const fetchDealers = async () => { try { const res = await api.get('/users?role=DEALER'); setDealers(res.data); } catch (e) { } };
    const fetchPosts = async () => { try { const res = await api.get('/posts'); setPosts(res.data); } catch (e) { } };

    const updateStatus = async (id, status) => { try { await api.put(`/orders/${id}/status`, { status }); toast.success('Status updated'); fetchOrders(); } catch (e) { toast.error('Update failed'); } };

    // Filter Dealers Logic
    const filteredDealers = distributorFilter
        ? dealers.filter(d => d.distributorId == distributorFilter) // Loose equality for safety
        : dealers;

    // HANDLERS
    const openUserModal = (type, user = null) => {
        setUserModalType(type);
        setEditingUser(user);
        if (user) {
            setUserForm({
                username: user.username || '', password: '', email: user.email || '', name: user.name,
                city: user.city || '', shopName: user.shopName || '', distributorId: user.distributorId || '', isEnabled: user.isEnabled
            });
        } else {
            setUserForm({ username: '', password: '', email: '', name: '', city: '', shopName: '', distributorId: '', isEnabled: true });
        }
        setShowUserModal(true);
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();

        // Build payload with EXPLICIT role assignment
        const payload = {
            name: userForm.name,
            city: userForm.city,
            isEnabled: userForm.isEnabled,
            role: userModalType  // EXPLICIT: DISTRIBUTOR or DEALER
        };

        // Add role-specific fields
        if (userModalType === 'DISTRIBUTOR') {
            payload.username = userForm.username;
            payload.password = userForm.password;
            // Do NOT include email or distributorId for Distributors
        } else {
            // DEALER
            payload.email = userForm.email;
            payload.shopName = userForm.shopName;
            payload.distributorId = userForm.distributorId;
            // Do NOT include username or password for Dealers
        }

        // For EDIT operations, only include password if changed
        if (editingUser && userModalType === 'DISTRIBUTOR' && !payload.password) {
            delete payload.password;
        }

        console.log('Sending payload:', payload); // DEBUG LOG

        try {
            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, payload);
                toast.success('Updated successfully');
            } else {
                await api.post('/users', payload);
                toast.success(`${payload.role} created successfully`);
            }
            setShowUserModal(false);
            if (userModalType === 'DISTRIBUTOR') fetchDistributors(); else fetchDealers();
            // Reset form
            setUserForm({ name: '', username: '', password: '', email: '', shopName: '', city: '', distributorId: '', isEnabled: true });
        } catch (error) {
            console.error("User Operation Failed:", error);
            console.error("Response:", error.response?.data);  // DEBUG LOG
            const errMsg = error.response?.data?.error || 'Operation failed. Please check inputs.';
            toast.error(errMsg);
        }
    };

    // Design/Color Handlers (Condensed for file size, Logic reused)
    const handleAddColorReal = async (e) => { e.preventDefault(); const fd = new FormData(); fd.append('name', newColor.name); fd.append('hexCode', newColor.hexCode); if (newColor.image) fd.append('image', newColor.image); try { await api.post('/colors', fd); toast.success('Added'); setShowAddColor(false); fetchColors(); setNewColor({ name: '', hexCode: '', image: null, isEnabled: true }); } catch (e) { toast.error('Failed'); } };
    const handleUpdateColorReal = async (e) => { e.preventDefault(); if (!editingColor) return; const fd = new FormData(); fd.append('name', editingColor.name); fd.append('hexCode', editingColor.hexCode); fd.append('isEnabled', editingColor.isEnabled); if (editingColor.imageFile) fd.append('image', editingColor.imageFile); try { await api.put(`/colors/${editingColor.id}`, fd); toast.success('Updated'); setEditingColor(null); fetchColors(); } catch (e) { toast.error('Failed'); } };
    const handleAddDesignReal = async (e) => { e.preventDefault(); const fd = new FormData(); fd.append('designNumber', newDesign.designNumber); fd.append('category', newDesign.category); fd.append('doorTypeId', newDesign.doorTypeId); fd.append('isTrending', newDesign.isTrending); fd.append('colorIds', JSON.stringify(newDesign.colorIds)); if (newDesign.image) fd.append('image', newDesign.image); try { await api.post('/designs', fd); toast.success('Added'); setShowAddDesign(false); fetchDesigns(); setNewDesign({ designNumber: '', category: '', doorTypeId: '', isTrending: false, image: null, colorIds: [] }); } catch (e) { toast.error('Failed'); } };
    const handleUpdateDesignReal = async (e) => { e.preventDefault(); if (!editingDesign) return; const fd = new FormData(); fd.append('designNumber', editingDesign.designNumber); fd.append('category', editingDesign.category); fd.append('doorTypeId', editingDesign.doorTypeId); fd.append('isTrending', editingDesign.isTrending); fd.append('isEnabled', editingDesign.isEnabled); fd.append('colorIds', JSON.stringify(editingDesign.colorIds)); if (editingDesign.imageFile) fd.append('image', editingDesign.imageFile); try { await api.put(`/designs/${editingDesign.id}`, fd); toast.success('Updated'); setEditingDesign(null); fetchDesigns(); } catch (e) { toast.error('Failed'); } };

    const toggleColorSelection = (id, isEditing = false) => {
        if (isEditing) { setEditingDesign(prev => { const colors = prev.colorIds || []; const exists = colors.includes(id); return { ...prev, colorIds: exists ? colors.filter(c => c !== id) : [...colors, id] }; }); }
        else { setNewDesign(prev => { const exists = prev.colorIds.includes(id); return { ...prev, colorIds: exists ? prev.colorIds.filter(c => c !== id) : [...prev.colorIds, id] }; }); }
    };
    const openEditDesign = (design) => { const currentIds = design.Colors?.map(c => c.id) || []; setEditingDesign({ ...design, colorIds: currentIds, imageFile: null }); };
    const getImageUrl = (path) => path ? api.defaults.baseURL.replace('/api', '') + path : null;

    // V2 HANDLERS
    const toggleOrderSelection = (id) => {
        setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBulkStatusUpdate = async (status) => {
        if (!selectedOrders.length) return toast.error('No orders selected');
        try {
            await api.put('/orders/bulk-status', { orderIds: selectedOrders, status });
            toast.success('Orders updated');
            setSelectedOrders([]);
            setShowBulkAction(false);
            fetchOrders();
        } catch (e) { toast.error('Bulk update failed'); }
    };

    const exportOrdersToExcel = () => {
        const data = orders.map(o => ({
            'Order ID': o.id,
            'Date': new Date(o.createdAt).toLocaleDateString(),
            'Dealer': o.User?.name,
            'Shop': o.User?.shopName,
            'Distributor': distributors.find(d => d.id === o.distributorId)?.name || 'Unknown', // Need to ensure distributors fetched or map from existing if available
            'Status': o.status,
            'Items': o.OrderItems?.length
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Orders");
        XLSX.writeFile(wb, `Orders_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // DELETE Handlers
    const handleDeleteDesign = async (id) => {
        if (!confirm('Are you sure you want to delete this design?')) return;
        try { await api.delete(`/designs/${id}`); toast.success('Design deleted'); fetchDesigns(); } catch (e) { toast.error('Failed to delete'); }
    };
    const handleDeleteColor = async (id) => {
        if (!confirm('Are you sure you want to delete this color?')) return;
        try { await api.delete(`/colors/${id}`); toast.success('Color deleted'); fetchColors(); } catch (e) { toast.error('Failed to delete'); }
    };

    // POST Handlers (What's New)
    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPost.content.trim()) return toast.error('Content is required');
        try {
            const fd = new FormData();
            fd.append('title', newPost.title);
            fd.append('content', newPost.content);
            fd.append('postType', newPost.postType);
            if (newPost.image) fd.append('image', newPost.image);
            await api.post('/posts', fd);
            toast.success('Post created!');
            setNewPost({ title: '', content: '', postType: 'announcement', image: null });
            fetchPosts();
        } catch (e) { toast.error('Failed to create post'); }
    };
    const handleDeletePost = async (id) => {
        if (!confirm('Delete this post?')) return;
        try { await api.delete(`/posts/${id}`); toast.success('Post deleted'); fetchPosts(); } catch (e) { toast.error('Failed'); }
    };

    // BULK UPLOAD HANDLER
    // Generate and Download Sample Excel File
    const downloadSample = () => {
        const wb = XLSX.utils.book_new();
        let data = [];

        if (bulkUploadType === 'DISTRIBUTOR') {
            data = [
                { name: 'Distributor Name', username: 'dist_username', password: 'password123', city: 'Mumbai', shopName: 'Best Doors' },
                { name: 'John Doe', username: 'john_d', password: 'securePass!', city: 'Delhi', shopName: 'John Traders' }
            ];
        } else {
            // DEALER
            data = [
                { name: 'Dealer Name', email: 'dealer@example.com', distributorId: '1', city: 'Pune', shopName: 'Pune Shop' },
                { name: 'Jane Smith', email: 'jane@test.com', distributorId: '2', city: 'Surat', shopName: 'Jane Interiors' }
            ];
        }

        const ws = XLSX.utils.json_to_sheet(data);

        // Add column widths
        const wscols = [
            { wch: 20 }, // name
            { wch: 20 }, // username/email
            { wch: 15 }, // password/distributorId
            { wch: 15 }, // city
            { wch: 20 }  // shopName
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${bulkUploadType.toLowerCase()}_sample.xlsx`);
    };

    // Handle File Upload
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            // Clean keys (trim spaces)
            const cleanData = data.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => {
                    newRow[key.trim()] = row[key];
                });
                return newRow;
            });

            processBulkUpload(cleanData);
        };
        reader.readAsBinaryString(file);
    };

    const processBulkUpload = async (users) => {
        try {
            const res = await api.post('/users/bulk', { users, role: bulkUploadType });
            toast.success(res.data.message);

            if (res.data.failed > 0) {
                // Show errors if any
                toast.error(`Failed to create ${res.data.failed} users. Check console for details.`);
                console.error("Bulk Upload Errors:", res.data.errors);
            }

            setShowBulkUpload(false);
            setBulkData('');
            if (bulkUploadType === 'DISTRIBUTOR') fetchDistributors();
            else fetchDealers();

        } catch (e) {
            toast.error(e.response?.data?.error || 'Bulk upload failed');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <nav className="bg-white shadow sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-indigo-800">Z-on Admin v3.1</h1>
                    <div className="flex gap-4 items-center">
                        <span className="font-medium text-gray-600">{user?.name}</span>
                        <button onClick={logout} className="text-red-600 font-medium">Logout</button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex gap-2 bg-white p-1 rounded-full shadow-sm overflow-x-auto max-w-full">
                        {[
                            { id: 'home', label: 'Home', icon: Home },
                            { id: 'orders', label: 'Orders', icon: ShoppingBag },
                            { id: 'distributors', label: 'Distributors', icon: Users, hideFor: ['DISTRIBUTOR'] },
                            { id: 'dealers', label: 'Dealers', icon: User },
                            { id: 'designs', label: 'Designs', icon: ImageIcon },
                            { id: 'masters', label: 'Masters', icon: Filter },
                            { id: 'whatsnew', label: "What's New", icon: Bell }
                        ].filter(tab => !tab.hideFor || !tab.hideFor.includes(user?.role)).map(tab => (
                            <button
                                key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium capitalize whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 w-full xl:w-auto flex-wrap">
                        <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                            <Calendar size={14} className="text-gray-400" />
                            <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="text-xs border-none focus:ring-0 p-1" />
                            <span className="text-gray-400">-</span>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="text-xs border-none focus:ring-0 p-1" />
                        </div>
                        <select value={orderFilter.status} onChange={e => setOrderFilter({ ...orderFilter, status: e.target.value })} className="border rounded-lg px-3 py-2 text-sm"><option value="">All Statuses</option><option value="RECEIVED">Received</option><option value="PRODUCTION">Production</option><option value="READY">Ready</option><option value="DISPATCHED">Dispatched</option></select>
                        <input type="text" placeholder="Search..." value={orderFilter.search} onChange={e => setOrderFilter({ ...orderFilter, search: e.target.value })} className="border rounded-lg px-3 py-2 text-sm w-full xl:w-32" />
                        <button onClick={exportOrdersToExcel} className="bg-green-600 text-white px-3 py-2 rounded-lg"><FileSpreadsheet size={18} /></button>
                    </div>
                </div>

                {/* --- TAB CONTENT --- */}
                {activeTab === 'home' && analytics && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* KPI CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="text-gray-500 text-sm font-bold uppercase">Total Orders</div>
                                <div className="text-3xl font-bold text-indigo-900 mt-2">{analytics.kpi.totalOrders}</div>
                                <div className="text-xs text-green-600 font-bold mt-1">Lifetime Volume</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="text-gray-500 text-sm font-bold uppercase">Pending Actions</div>
                                <div className="text-3xl font-bold text-orange-600 mt-2">{analytics.kpi.pendingOrders}</div>
                                <div className="text-xs text-orange-400 font-bold mt-1">Requires Attention</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="text-gray-500 text-sm font-bold uppercase">Completed</div>
                                <div className="text-3xl font-bold text-green-600 mt-2">{analytics.kpi.completedOrders}</div>
                                <div className="text-xs text-gray-400 mt-1">Dispatched Successfully</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* CHART */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
                                <h3 className="font-bold text-lg mb-4">Top Distributors by Volume</h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                            <YAxis axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* RECENT FEED */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
                                <div className="space-y-4">
                                    {analytics.recentOrders.map(o => (
                                        <div key={o.id} className="flex gap-3 items-center p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-gray-200" onClick={() => setSelectedOrder(o)}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${o.status === 'RECEIVED' ? 'bg-yellow-100' : 'bg-indigo-100'}`}>
                                                {o.status === 'RECEIVED' ? '📥' : '📦'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm truncate">Order #{o.id}</div>
                                                <div className="text-xs text-gray-500 truncate">{o.User?.name}</div>
                                            </div>
                                            <div className="text-xs font-bold text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'orders' && (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="p-2 bg-indigo-50 flex justify-between items-center">
                            <div className="flex gap-2 items-center">
                                {selectedOrders.length > 0 && (
                                    <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold">{selectedOrders.length} Selected</span>
                                )}
                            </div>
                            {selectedOrders.length > 0 && (
                                <div className="relative">
                                    <button onClick={() => setShowBulkAction(!showBulkAction)} className="bg-white border text-gray-700 px-3 py-1 rounded shadow-sm text-xs font-bold flex items-center gap-1">Bulk Update <ChevronDown size={12} /></button>
                                    {showBulkAction && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
                                            {['PRODUCTION', 'READY', 'DISPATCHED'].map(s => (
                                                <button key={s} onClick={() => handleBulkStatusUpdate(s)} className="block w-full text-left px-4 py-3 text-sm hover:bg-indigo-50">{s}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 w-10"><input type="checkbox" onChange={e => {
                                        if (e.target.checked) setSelectedOrders(orders.map(o => o.id));
                                        else setSelectedOrders([]);
                                    }} checked={selectedOrders.length === orders.length && orders.length > 0} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /></th>
                                    <th className="px-6 py-3">Order</th>
                                    <th className="px-6 py-3">Dealer</th>
                                    <th className="px-6 py-3">Items</th>
                                    <th className="px-6 py-3">Current Status</th>
                                    <th className="px-6 py-3">Update Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map(order => (
                                    <tr key={order.id} className={`hover:bg-gray-50 ${order.isEdited ? 'bg-orange-50 border-l-4 border-orange-400' : ''} ${selectedOrders.includes(order.id) ? 'bg-indigo-50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => toggleOrderSelection(order.id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="font-bold text-indigo-700 cursor-pointer" onClick={() => setSelectedOrder(order)}>#{order.id}</div>
                                                {order.isEdited && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">EDITED</span>}
                                            </div>
                                            <div className="text-gray-400 text-xs">{new Date(order.createdAt).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{order.User?.name}</div>
                                            <div className="text-xs text-gray-400">{order.User?.shopName}</div>
                                        </td>
                                        <td className="px-6 py-4">{order.OrderItems?.length} items</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'RECEIVED' ? 'bg-yellow-100 text-yellow-800' :
                                                order.status === 'PRODUCTION' ? 'bg-blue-100 text-blue-800' :
                                                    order.status === 'READY' ? 'bg-green-100 text-green-800' :
                                                        order.status === 'DISPATCHED' ? 'bg-purple-100 text-purple-800' :
                                                            order.status === 'DELAYED' ? 'bg-orange-100 text-orange-800' :
                                                                'bg-red-100 text-red-800'
                                                }`}>
                                                {order.status === 'RECEIVED' ? '📥' : order.status === 'PRODUCTION' ? '🔧' : order.status === 'READY' ? '✅' : order.status === 'DISPATCHED' ? '🚚' : order.status === 'DELAYED' ? '⏳' : '❌'} {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {order.status !== 'CANCELLED' ? (
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => updateStatus(order.id, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="border rounded-lg p-2 text-sm font-medium bg-white"
                                                >
                                                    <option value="RECEIVED">📥 Received</option>
                                                    <option value="PRODUCTION">🔧 Production</option>
                                                    <option value="READY">✅ Ready</option>
                                                    <option value="DISPATCHED">🚚 Dispatched</option>
                                                    <option value="DELAYED">⏳ Delayed</option>
                                                    <option value="CANCELLED">❌ Cancelled</option>
                                                </select>
                                            ) : (
                                                <span className="text-red-500 font-bold text-sm">❌ Cancelled</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">No orders found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'distributors' && user?.role === 'MANUFACTURER' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">Distributors</h2>
                            <div className="flex gap-2">
                                <button onClick={() => { setBulkUploadType('DISTRIBUTOR'); setShowBulkUpload(true); }} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold shadow flex items-center gap-1 text-sm"><Upload size={16} /> Bulk Upload</button>
                                <button onClick={() => openUserModal('DISTRIBUTOR')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow">+ Add Distributor</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {distributors.map(d => (
                                <div key={d.id} className={`bg-white p-4 rounded-xl shadow border-l-4 ${d.isEnabled ? 'border-green-500' : 'border-red-500'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-lg">{d.name} <span className="text-sm text-gray-400 font-normal">(ID: {d.id})</span></div>
                                            <div className="text-sm text-gray-500">{d.city || 'No City'}</div>
                                            <div className="text-xs font-mono text-indigo-600 mt-1">@{d.username}</div>
                                            {/* V2: Show Order Stats if available in future, for now placeholder or need to fetch from analytics */}
                                            {analytics && analytics.chartData?.find(x => x.name === d.name) && (
                                                <div className="mt-2 text-xs font-bold bg-gray-100 inline-block px-2 py-1 rounded">
                                                    Orders: {analytics.chartData.find(x => x.name === d.name).count}
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => openUserModal('DISTRIBUTOR', d)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                                    </div>
                                    {!d.isEnabled && <div className="text-red-500 text-xs font-bold mt-2">DISABLED</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'dealers' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-bold text-gray-800">Dealers</h2>
                                <div className="relative">
                                    <select
                                        value={distributorFilter}
                                        onChange={(e) => setDistributorFilter(e.target.value)}
                                        className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-indigo-500"
                                    >
                                        <option value="">All Distributors</option>
                                        {distributors.map(dist => (
                                            <option key={dist.id} value={dist.id}>{dist.name} (ID: {dist.id})</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                        <Filter size={16} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setBulkUploadType('DEALER'); setShowBulkUpload(true); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all">
                                    <Upload size={18} /> Bulk Upload
                                </button>
                                <button onClick={() => openUserModal('DEALER')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all">
                                    <Plus size={18} /> Add Dealer
                                </button>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow overflow-hidden">
                            <table className="min-w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                                    <tr><th className="px-6 py-3">Dealer</th><th className="px-6 py-3">Shop</th><th className="px-6 py-3">City</th><th className="px-6 py-3">Email (Google ID)</th><th className="px-6 py-3">Distributor</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Action</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredDealers.map(d => {
                                        const dist = distributors.find(dist => dist.id == d.distributorId);
                                        return (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-bold">{d.name}</td>
                                                <td className="px-6 py-4">{d.shopName}</td>
                                                <td className="px-6 py-4">{d.city}</td>
                                                <td className="px-6 py-4 text-xs font-mono">{d.email}</td>
                                                <td className="px-6 py-4 text-indigo-700 font-medium">{dist ? dist.name : <span className="text-red-500">Unassigned</span>}</td>
                                                <td className="px-6 py-4">
                                                    {d.isEnabled ? <span className="text-green-600 font-bold text-xs">Active</span> : <span className="text-red-600 font-bold text-xs">Disabled</span>}
                                                </td>
                                                <td className="px-6 py-4"><button onClick={() => openUserModal('DEALER', d)} className="text-indigo-600 hover:underline">Edit</button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Designs & Masters Tabs (Reused) */}
                {activeTab === 'designs' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Product Designs</h2>
                            <button onClick={() => setShowAddDesign(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow">+ Add New Design</button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {designs.map(d => (
                                <div key={d.id} className={`bg-white rounded-2xl shadow-lg overflow-hidden group transition-all hover:shadow-xl hover:-translate-y-1 ${!d.isEnabled ? 'opacity-60' : ''}`}>
                                    {/* Portrait Door Image - Tall Aspect Ratio */}
                                    <div className="aspect-[3/4] bg-gradient-to-b from-gray-100 to-gray-200 relative flex items-center justify-center p-4">
                                        {d.imageUrl ? (
                                            <img src={getImageUrl(d.imageUrl)} className={`max-h-full max-w-full object-contain drop-shadow-xl ${!d.isEnabled && 'grayscale'}`} alt={d.designNumber} />
                                        ) : (
                                            <div className="text-gray-300"><ImageIcon size={48} /></div>
                                        )}
                                        {/* Door Type Badge */}
                                        <div className="absolute top-3 left-3 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full font-bold shadow">{d.DoorType?.name || 'Door'}</div>
                                        {/* Edit & Delete Buttons on Hover */}
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <button onClick={() => openEditDesign(d)} className="bg-white text-indigo-600 p-2 rounded-full shadow-lg hover:bg-indigo-50">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteDesign(d.id)} className="bg-white text-red-500 p-2 rounded-full shadow-lg hover:bg-red-50">
                                                <X size={16} />
                                            </button>
                                        </div>
                                        {/* Trending Badge */}
                                        {d.isTrending && <div className="absolute bottom-3 left-3 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-bold">⭐ Trending</div>}
                                        {/* Disabled Overlay */}
                                        {!d.isEnabled && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">DISABLED</span></div>}
                                    </div>
                                    {/* Card Footer */}
                                    <div className="p-4 bg-white">
                                        <div className="font-bold text-gray-800 text-lg">Design {d.designNumber}</div>
                                        <div className="text-sm text-gray-400 mt-1">{d.category || 'Premium door design'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'masters' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow">
                            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Global Color Master</h2><button onClick={() => setShowAddColor(true)} className="bg-indigo-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-indigo-700 font-bold">+ New</button></div>
                            <div className="grid grid-cols-3 gap-3">
                                {colors.map(c => (
                                    <div key={c.id} className={`border rounded-lg p-2 relative group transition-all ${!c.isEnabled ? 'opacity-50 grayscale bg-gray-50' : 'bg-white hover:shadow-md'}`}>
                                        <div className="absolute top-1 right-1 z-10 hidden group-hover:flex gap-1">
                                            <button onClick={() => setEditingColor({ ...c, imageFile: null })} className="bg-white text-gray-700 p-1 rounded shadow hover:text-indigo-600"><Edit2 size={12} /></button>
                                            <button onClick={() => handleDeleteColor(c.id)} className="bg-white text-red-500 p-1 rounded shadow hover:text-red-700"><X size={12} /></button>
                                        </div>
                                        <div className="h-16 w-full rounded bg-gray-100 overflow-hidden mb-2">{c.imageUrl ? <img src={getImageUrl(c.imageUrl)} className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ backgroundColor: c.hexCode }}></div>}</div>
                                        <div className="text-xs font-bold truncate text-center">{c.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow h-min"><h2 className="text-lg font-bold mb-4">Door Types</h2>{doors.map(d => <div key={d.id} className="flex justify-between p-2 bg-gray-50 mb-1 rounded"><span>{d.name}</span><span className="font-bold">{d.thickness}</span></div>)}</div>
                    </div>
                )}

                {/* What's New Tab - Social Feed for Admin */}
                {activeTab === 'whatsnew' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        {/* Create Post Card */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Bell className="text-indigo-600" /> Create New Post
                            </h2>
                            <form onSubmit={handleCreatePost} className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Post Title (optional)"
                                    className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    value={newPost.title}
                                    onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                                />
                                <textarea
                                    placeholder="What's new? Share updates with your dealers and distributors..."
                                    className="w-full border border-gray-200 rounded-lg p-3 min-h-[100px] resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    value={newPost.content}
                                    onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                                    required
                                />
                                <div className="flex flex-wrap gap-4 items-center">
                                    <select
                                        className="border border-gray-200 rounded-lg p-2 text-sm"
                                        value={newPost.postType}
                                        onChange={e => setNewPost({ ...newPost, postType: e.target.value })}
                                    >
                                        <option value="announcement">📢 Announcement</option>
                                        <option value="new_design">🚪 New Design</option>
                                        <option value="promotion">🎉 Promotion</option>
                                        <option value="update">📋 Update</option>
                                    </select>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-indigo-600">
                                        <ImageIcon size={16} />
                                        <span>Add Image</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => setNewPost({ ...newPost, image: e.target.files[0] })} />
                                    </label>
                                    {newPost.image && <span className="text-xs text-green-600">✓ {newPost.image.name}</span>}
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg">
                                    Post Update
                                </button>
                            </form>
                        </div>

                        {/* Posts Feed */}
                        <div className="space-y-4">
                            {posts.length === 0 && (
                                <div className="text-center text-gray-400 py-12">No posts yet. Create your first post above!</div>
                            )}
                            {posts.map(post => (
                                <div key={post.id} className="bg-white rounded-2xl shadow-lg overflow-hidden group">
                                    {post.imageUrl && (
                                        <div className="h-48 bg-gray-100">
                                            <img src={getImageUrl(post.imageUrl)} className="w-full h-full object-cover" alt="Post" />
                                        </div>
                                    )}
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${post.postType === 'announcement' ? 'bg-blue-100 text-blue-700' : post.postType === 'new_design' ? 'bg-purple-100 text-purple-700' : post.postType === 'promotion' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {post.postType === 'announcement' ? '📢' : post.postType === 'new_design' ? '🚪' : post.postType === 'promotion' ? '🎉' : '📋'} {post.postType.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <button onClick={() => handleDeletePost(post.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X size={18} />
                                            </button>
                                        </div>
                                        {post.title && <h3 className="font-bold text-lg text-gray-800 mt-2">{post.title}</h3>}
                                        <p className="text-gray-600 mt-2 whitespace-pre-wrap">{post.content}</p>
                                        <div className="text-xs text-gray-400 mt-4">{new Date(post.createdAt).toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MODALS */}
                {/* 1. USER MODAL */}
                {showUserModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                            <h3 className="text-lg font-bold mb-4">{editingUser ? 'Edit' : 'Add'} {userModalType === 'DISTRIBUTOR' ? 'Distributor' : 'Dealer'}</h3>
                            <form onSubmit={handleUserSubmit} className="space-y-3">
                                <div><label className="text-xs font-bold text-gray-500">Name</label>
                                    <input type="text" className="w-full border rounded p-2" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} required /></div>

                                {/* DISTRIBUTOR SPECIFIC: Username & Password */}
                                {userModalType === 'DISTRIBUTOR' && (
                                    <>
                                        <div><label className="text-xs font-bold text-gray-500">Username</label>
                                            <input type="text" className="w-full border rounded p-2" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} disabled={!!editingUser} required /></div>

                                        <div><label className="text-xs font-bold text-gray-500">{editingUser ? 'New Password (Optional)' : 'Password'}</label>
                                            <input type="text" className="w-full border rounded p-2" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder={editingUser ? "Keep current" : "Required"} /></div>
                                    </>
                                )}

                                {/* DEALER SPECIFIC: Email (No Password) */}
                                {userModalType === 'DEALER' && (
                                    <>
                                        <div><label className="text-xs font-bold text-gray-500">Google Email Address</label>
                                            <input type="email" className="w-full border rounded p-2" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} required placeholder="user@gmail.com" /></div>

                                        <div><label className="text-xs font-bold text-gray-500">Shop Name</label>
                                            <input type="text" className="w-full border rounded p-2" value={userForm.shopName} onChange={e => setUserForm({ ...userForm, shopName: e.target.value })} /></div>

                                        <div><label className="text-xs font-bold text-gray-500">Assign Distributor</label>
                                            <select className="w-full border rounded p-2" value={userForm.distributorId} onChange={e => setUserForm({ ...userForm, distributorId: e.target.value })} required>
                                                <option value="">Select Distributor...</option>
                                                {distributors.filter(d => d.isEnabled).map(d => <option key={d.id} value={d.id}>{d.name} ({d.username})</option>)}
                                            </select></div>
                                    </>
                                )}

                                <div><label className="text-xs font-bold text-gray-500">City</label>
                                    <input type="text" className="w-full border rounded p-2" value={userForm.city} onChange={e => setUserForm({ ...userForm, city: e.target.value })} /></div>

                                <div className="flex items-center gap-2 mt-4 bg-gray-50 p-2 rounded">
                                    <input type="checkbox" checked={userForm.isEnabled} onChange={e => setUserForm({ ...userForm, isEnabled: e.target.checked })} className="w-4 h-4" />
                                    <label className="text-sm font-bold">Account Enabled</label>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded font-bold">Save</button>
                                    <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {selectedOrder && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
                        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="bg-indigo-700 p-4 text-white flex justify-between items-center shrink-0"><h2 className="text-xl font-bold">Order Details #{selectedOrder.id}</h2><button onClick={() => setSelectedOrder(null)} className="hover:bg-indigo-600 p-1 rounded"><X /></button></div>
                            <div className="p-6 overflow-y-auto flex-1">
                                <div className="space-y-4">{selectedOrder.OrderItems?.map((item, i) => (<div key={i} className="flex gap-4 p-4 border rounded-lg"><div className="w-16 h-16 bg-gray-200 rounded overflow-hidden">{item.designImageSnapshot && <img src={getImageUrl(item.designImageSnapshot)} className="w-full h-full object-cover" />}</div><div><div className="font-bold">{item.designNameSnapshot} - {item.colorNameSnapshot}</div><div className="text-sm text-gray-600">{item.width}" x {item.height}" (Qty: {item.quantity})</div></div></div>))}</div>
                            </div>
                        </div>
                    </div>
                )}
                {(showAddColor || editingColor) && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl p-6 max-w-sm w-full">
                            <h3 className="font-bold mb-4">{editingColor ? 'Edit' : 'Add'} Color</h3>
                            <form onSubmit={editingColor ? handleUpdateColorReal : handleAddColorReal} className="space-y-4">
                                <input type="text" className="w-full border p-2 rounded" placeholder="Color Name"
                                    value={editingColor ? editingColor.name : newColor.name}
                                    onChange={e => editingColor ? setEditingColor({ ...editingColor, name: e.target.value }) : setNewColor({ ...newColor, name: e.target.value })} required />
                                <input type="text" className="w-full border p-2 rounded" placeholder="Hex Code (e.g. #FF5733)"
                                    value={(editingColor ? editingColor.hexCode : newColor.hexCode) || ''}
                                    onChange={e => editingColor ? setEditingColor({ ...editingColor, hexCode: e.target.value }) : setNewColor({ ...newColor, hexCode: e.target.value })} />

                                {/* IMAGE UPLOAD - RESTORED */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">Color Image (Optional)</label>
                                    <input type="file" accept="image/*" className="w-full border p-2 rounded text-sm"
                                        onChange={e => editingColor
                                            ? setEditingColor({ ...editingColor, imageFile: e.target.files[0] })
                                            : setNewColor({ ...newColor, image: e.target.files[0] })} />
                                    {editingColor?.imageUrl && <div className="text-xs text-green-600 mt-1">Current image: ✓</div>}
                                </div>

                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-indigo-600 text-white p-2 rounded font-bold">Save</button>
                                    <button type="button" onClick={() => { setShowAddColor(false); setEditingColor(null) }} className="flex-1 bg-gray-200 p-2 rounded">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {(showAddDesign || editingDesign) && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-white rounded-xl p-6 max-w-lg w-full my-8">
                            <h3 className="font-bold text-lg mb-4">{editingDesign ? 'Edit' : 'Add'} Design</h3>
                            <form onSubmit={editingDesign ? handleUpdateDesignReal : handleAddDesignReal} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">Design Number</label>
                                    <input type="text" className="w-full border p-2 rounded" placeholder="e.g. D-001" required
                                        value={editingDesign ? editingDesign.designNumber : newDesign.designNumber}
                                        onChange={e => editingDesign ? setEditingDesign({ ...editingDesign, designNumber: e.target.value }) : setNewDesign({ ...newDesign, designNumber: e.target.value })} />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">Door Type</label>
                                    <select className="w-full border p-2 rounded" required
                                        value={editingDesign ? editingDesign.doorTypeId : newDesign.doorTypeId}
                                        onChange={e => editingDesign ? setEditingDesign({ ...editingDesign, doorTypeId: e.target.value }) : setNewDesign({ ...newDesign, doorTypeId: e.target.value })}>
                                        <option value="">Select Door Type</option>
                                        {doors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">Category (Optional)</label>
                                    <input type="text" className="w-full border p-2 rounded" placeholder="e.g. Premium, Standard"
                                        value={editingDesign ? (editingDesign.category || '') : newDesign.category}
                                        onChange={e => editingDesign ? setEditingDesign({ ...editingDesign, category: e.target.value }) : setNewDesign({ ...newDesign, category: e.target.value })} />
                                </div>

                                {/* DESIGN IMAGE UPLOAD - RESTORED */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">Door Design Image</label>
                                    <input type="file" accept="image/*" className="w-full border p-2 rounded text-sm"
                                        onChange={e => editingDesign
                                            ? setEditingDesign({ ...editingDesign, imageFile: e.target.files[0] })
                                            : setNewDesign({ ...newDesign, image: e.target.files[0] })} />
                                    {editingDesign?.imageUrl && <div className="text-xs text-green-600 mt-1">Current image: ✓</div>}
                                    <p className="text-xs text-gray-400 mt-1">Recommended: Portrait orientation (e.g. 600×900px)</p>
                                </div>

                                {/* COLOR SELECTION REMOVED - All colors available for all designs */}

                                <div className="flex items-center gap-2">
                                    <input type="checkbox"
                                        checked={editingDesign ? editingDesign.isTrending : newDesign.isTrending}
                                        onChange={e => editingDesign ? setEditingDesign({ ...editingDesign, isTrending: e.target.checked }) : setNewDesign({ ...newDesign, isTrending: e.target.checked })} />
                                    <label className="text-sm">Mark as Trending</label>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button type="submit" className="flex-1 bg-indigo-600 text-white p-2 rounded font-bold">Save Design</button>
                                    <button type="button" onClick={() => { setShowAddDesign(false); setEditingDesign(null) }} className="flex-1 bg-gray-200 p-2 rounded">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* BULK UPLOAD MODAL */}
                {/* Bulk Upload Modal */}
                {showBulkUpload && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl p-8 max-w-lg w-full shadow-2xl relative">
                            <button onClick={() => setShowBulkUpload(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>

                            <div className="text-center space-y-4">
                                <div className="bg-lime-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileSpreadsheet className="text-lime-600 w-8 h-8" />
                                </div>

                                <h2 className="text-2xl font-bold text-gray-800">Bulk Upload {bulkUploadType === 'DISTRIBUTOR' ? 'Distributors' : 'Dealers'}</h2>
                                <p className="text-gray-500 text-sm">Upload an Excel file (.xlsx, .xls) to add multiple users at once.</p>

                                <div className="flex flex-col gap-3 py-4">
                                    {/* Download Sample */}
                                    <button
                                        onClick={downloadSample}
                                        className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                                    >
                                        <Download className="text-gray-400 group-hover:text-indigo-600" />
                                        <span className="font-bold text-gray-600 group-hover:text-indigo-700">Download Sample Template</span>
                                    </button>

                                    <div className="text-xs text-gray-400 font-medium">- OR -</div>

                                    {/* Upload File */}
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls, .csv"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <button className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all">
                                            <Upload size={20} />
                                            Upload Excel File
                                        </button>
                                    </div>
                                </div>

                                <div className="text-xs text-left bg-gray-50 p-4 rounded-lg space-y-1 text-gray-500">
                                    <p className="font-bold text-gray-700 mb-1">Required Columns:</p>
                                    {bulkUploadType === 'DISTRIBUTOR' ? (
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>name (Full Name)</li>
                                            <li>username (Login ID)</li>
                                            <li>password (Login Password)</li>
                                            <li>city (Optional)</li>
                                            <li>shopName (Optional)</li>
                                        </ul>
                                    ) : (
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>name (Full Name)</li>
                                            <li>email (Login Email)</li>
                                            <li>distributorId (Distributor ID)</li>
                                            <li>city (Optional)</li>
                                            <li>shopName (Optional)</li>
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

