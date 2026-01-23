import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, Image as ImageIcon, Filter, Search, Edit2, Eye, EyeOff, Save, Trash2, User, Users, ShoppingBag, Bell, Upload, Download, FileSpreadsheet, Home, CheckSquare, Calendar, ChevronDown, Factory, Hammer, RefreshCw, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
    const { logout, user, isAuthenticated } = useAuth();
    const navigate = useNavigate(); // NEW: For Profile Navigation
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
    const [showImportOrders, setShowImportOrders] = useState(false);
    const [showBulkDesigns, setShowBulkDesigns] = useState(false);
    const [showBulkColors, setShowBulkColors] = useState(false);

    // NEW: Production View State
    const [productionOrders, setProductionOrders] = useState([]);
    const [productionDistributorId, setProductionDistributorId] = useState('');

    // NEW: Factory State
    const [workers, setWorkers] = useState([]);
    const [factoryStats, setFactoryStats] = useState({});
    const [factoryTracking, setFactoryTracking] = useState([]);
    const [factoryLocation, setFactoryLocation] = useState(null);
    const [showAddWorker, setShowAddWorker] = useState(false);
    const [newWorker, setNewWorker] = useState({ name: '', pinCode: '', role: 'PVC_CUT' });
    const [showManualGeo, setShowManualGeo] = useState(false);
    const [manualLat, setManualLat] = useState('');
    const [manualLng, setManualLng] = useState('');

    // Stage Management (Manual Move)
    const [selectedStage, setSelectedStage] = useState(null);
    const [stageUnits, setStageUnits] = useState([]);
    const [selectedUnitIds, setSelectedUnitIds] = useState([]);
    const [moveTarget, setMoveTarget] = useState('');

    useEffect(() => {
        if (activeTab === 'home') fetchAnalytics();
        if (activeTab === 'orders') fetchOrders();
        if (activeTab === 'production') { fetchProductionOrders(); fetchDistributors(); }
        if (activeTab === 'factory') { fetchWorkers(); fetchFactoryStats(); fetchFactoryTracking(); fetchFactoryLocation(); }
        if (activeTab === 'designs' || activeTab === 'masters') { fetchDesigns(); fetchDoors(); fetchColors(); }
        if (activeTab === 'distributors') fetchDistributors();
        if (activeTab === 'dealers') { fetchDealers(); fetchDistributors(); }
        if (activeTab === 'whatsnew') fetchPosts();
    }, [activeTab, orderFilter, dateRange, productionDistributorId]);

    // Live Factory Stats Polling
    useEffect(() => {
        let interval;
        if (activeTab === 'factory') {
            fetchFactoryStats();
            fetchFactoryTracking();
            interval = setInterval(() => {
                fetchFactoryStats();
                fetchFactoryTracking();
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [activeTab]);

    // FETCHERS
    const fetchAnalytics = async () => { try { const res = await api.get('/orders/analytics'); setAnalytics(res.data); } catch (e) { } };

    const fetchFactoryStats = async () => { try { const res = await api.get('/workers/stats'); setFactoryStats(res.data); } catch (e) { } };
    const fetchFactoryTracking = async () => { try { const res = await api.get('/workers/tracking'); setFactoryTracking(res.data); } catch (e) { } };
    const fetchFactoryLocation = async () => { try { const res = await api.get('/workers/settings/location'); setFactoryLocation(res.data); } catch (e) { } };
    const fetchWorkers = async () => { try { const res = await api.get('/workers'); setWorkers(res.data); } catch (e) { } };

    // State for Grouping & Filtering
    const [groupBy, setGroupBy] = useState('order'); // 'order', 'design', 'color', 'distributor'
    const [trackingFilter, setTrackingFilter] = useState('');

    // Aggregation Logic
    const groupedTrackingData = useMemo(() => {
        let data = factoryTracking;
        if (!data) return [];

        // 1. Filter
        if (trackingFilter) {
            const lowerFilter = trackingFilter.toLowerCase();
            data = data.filter(order =>
                order.id.toString().includes(lowerFilter) ||
                order.distributor.toLowerCase().includes(lowerFilter) ||
                (order.items && order.items.some(i => i.designName.toLowerCase().includes(lowerFilter) || i.colorName.toLowerCase().includes(lowerFilter)))
            );
        }

        // 2. Group
        if (groupBy === 'order') return data;

        const groups = {};
        data.forEach(order => {
            if (!order.items) return;

            if (groupBy === 'distributor') {
                const key = order.distributor;
                if (!groups[key]) groups[key] = { name: key, distributor: key, total: 0, progress: { pvc: 0, foil: 0, emboss: 0, door: 0, packed: 0 }, pending: 0 };
                groups[key].total += order.total;
                groups[key].pending += order.pending;
                ['pvc', 'foil', 'emboss', 'door', 'packed'].forEach(k => groups[key].progress[k] += order.progress[k]);
            } else {
                order.items.forEach(item => {
                    const key = groupBy === 'design' ? item.designName : item.colorName;
                    if (!groups[key]) groups[key] = { name: key, total: 0, progress: { pvc: 0, foil: 0, emboss: 0, door: 0, packed: 0 }, pending: 0 };
                    groups[key].total += item.quantity;
                    if (item.progress) ['pvc', 'foil', 'emboss', 'door', 'packed'].forEach(k => groups[key].progress[k] += item.progress[k]);
                });
            }
        });

        return Object.values(groups).sort((a, b) => b.total - a.total);
    }, [factoryTracking, groupBy, trackingFilter]);

    const handleSetLocation = () => {
        if (!navigator.geolocation) return toast.error('Browser does not support GPS');
        const tId = toast.loading('Getting Admin GPS (High Accuracy)...');
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                await api.post('/workers/settings/location', { lat: latitude, lng: longitude });
                toast.success('Factory Location Updated!');
                fetchFactoryLocation();
                toast.dismiss(tId);
            } catch (error) {
                toast.error('Failed to save location');
                toast.dismiss(tId);
            }
        }, (err) => {
            console.error(err);
            toast.error('Location Access Denied');
            toast.dismiss(tId);
        }, { enableHighAccuracy: true });
    };

    const handleManualLocationSubmit = async () => {
        if (!manualLat || !manualLng) return toast.error('Enter both Lat and Lng');
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);
        if (isNaN(lat) || isNaN(lng)) return toast.error('Invalid coordinates');

        try {
            await api.post('/workers/settings/location', { lat, lng });
            toast.success('Manual Location Saved!');
            fetchFactoryLocation();
            setShowManualGeo(false);
        } catch (error) {
            toast.error('Failed to save manual location');
        }
    };

    const handleAddWorker = async (e) => {
        e.preventDefault();
        try {
            await api.post('/workers', newWorker);
            toast.success('Worker Added');
            setShowAddWorker(false);
            setNewWorker({ name: '', pinCode: '', role: 'PVC_CUT' });
            fetchWorkers();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to add worker');
        }
    };

    const handleDeleteWorker = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/workers/${id}`);
            toast.success('Worker Removed');
            fetchWorkers();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const fetchProductionOrders = async () => {
        try {
            let query = `?status=PRODUCTION`; // Or Received + Production? User said "Pending in Production". Usually includes Received.
            // Let's assume Pending means NOT ready/dispatched.
            // But API filter only supports single status string? No, backend: "if (status) where.status = status;". Code supports single status.
            // I might need to update backend to support passing multiple statuses OR just fetch all and filter client side.
            // Or better: fetch all and filter in frontend since volume isn't massive yet.
            // Actually, let's just fetch all for now or fetch by distributor and filter.

            const params = new URLSearchParams();
            if (productionDistributorId) params.append('distributorId', productionDistributorId);

            // Backend doesn't support list of statuses easily without change.
            // Let's fetch ALL for the distributor, then filter in client.
            const res = await api.get(`/orders?${params.toString()}`);

            // Filter for Pending/Production
            const pending = res.data.filter(o => ['RECEIVED', 'PRODUCTION'].includes(o.status));
            setProductionOrders(pending);
        } catch (e) { }
    };

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

    // === ORDER IMPORT FROM EXCEL ===
    const downloadOrderImportSample = () => {
        const wb = XLSX.utils.book_new();
        const sampleData = [
            { dealerEmail: 'dealer@example.com', designNumber: 'D-001', colorName: 'Teak Wood', width: 30, height: 78, thickness: '30mm', quantity: 2, status: 'RECEIVED', orderDate: '2024-01-15' },
            { dealerEmail: 'dealer@example.com', designNumber: 'D-002', colorName: 'Charcoal Grey', width: 32, height: 80, thickness: '32mm', quantity: 1, status: 'PRODUCTION', orderDate: '2024-01-16' }
        ];
        const ws = XLSX.utils.json_to_sheet(sampleData);
        ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws, "Orders");
        XLSX.writeFile(wb, 'order_import_sample.xlsx');
    };

    const handleOrderImportFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);

                // Clean and validate data
                const cleanData = data.map(row => {
                    const newRow = {};
                    Object.keys(row).forEach(key => { newRow[key.trim()] = row[key]; });
                    return newRow;
                });

                if (cleanData.length === 0) return toast.error('No data found in file');

                // Send to backend
                const res = await api.post('/orders/import', { orders: cleanData });
                toast.success(`${res.data.created} orders imported successfully!`);
                if (res.data.failed > 0) {
                    toast.error(`${res.data.failed} rows failed - see console`);
                    console.error('Import Errors:', res.data.errors);
                }
                setShowImportOrders(false);
                fetchOrders();
            } catch (err) {
                toast.error(err.response?.data?.error || 'Import failed');
                console.error('Import Error:', err);
            }
        };
        reader.readAsBinaryString(file);
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

    // ORDER Delete Handlers
    const handleDeleteOrder = async (id) => {
        if (!confirm('Are you sure you want to delete this order? This cannot be undone.')) return;
        try {
            await api.delete(`/orders/${id}`);
            toast.success('Order deleted');
            fetchOrders();
        } catch (e) {
            toast.error('Failed to delete order');
        }
    };

    const handleBulkDeleteOrders = async () => {
        if (selectedOrders.length === 0) return toast.error('No orders selected');
        if (!confirm(`Are you sure you want to delete ${selectedOrders.length} order(s)? This cannot be undone.`)) return;
        try {
            await api.post('/orders/bulk-delete', { orderIds: selectedOrders });
            toast.success(`${selectedOrders.length} order(s) deleted`);
            setSelectedOrders([]);
            fetchOrders();
        } catch (e) {
            toast.error('Failed to delete orders');
        }
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

    // === BULK UPLOAD FOR DESIGNS ===
    const downloadDesignSample = () => {
        const wb = XLSX.utils.book_new();
        const data = [
            { designNumber: 'D-001', category: 'Premium', doorType: 'WPC', isTrending: 'false' },
            { designNumber: 'D-002', category: 'Classic', doorType: 'PVC', isTrending: 'true' }
        ];
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, ws, "Designs");
        XLSX.writeFile(wb, 'design_bulk_sample.xlsx');
    };

    const handleBulkDesignUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);
                const cleanData = data.map(row => {
                    const newRow = {};
                    Object.keys(row).forEach(key => newRow[key.trim()] = row[key]);
                    return newRow;
                });

                const res = await api.post('/designs/bulk', { designs: cleanData });
                toast.success(res.data.message);
                setShowBulkDesigns(false);
                fetchDesigns();
            } catch (err) {
                toast.error(err.response?.data?.error || 'Bulk design upload failed');
            }
        };
        reader.readAsBinaryString(file);
    };

    // === BULK UPLOAD FOR FOIL COLORS ===
    const downloadFoilColorSample = () => {
        const wb = XLSX.utils.book_new();
        const data = [
            { name: 'Teak Wood' },
            { name: 'Matt White' },
            { name: 'Charcoal Grey' },
            { name: 'Natural Oak' }
        ];
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{ wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, "FoilColors");
        XLSX.writeFile(wb, 'foil_color_bulk_sample.xlsx');
    };

    const handleBulkFoilColorUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);
                const cleanData = data.map(row => {
                    const newRow = {};
                    Object.keys(row).forEach(key => newRow[key.trim()] = row[key]);
                    return newRow;
                });

                const res = await api.post('/colors/bulk', { colors: cleanData });
                toast.success(res.data.message);
                setShowBulkColors(false);
                fetchColors();
            } catch (err) {
                toast.error(err.response?.data?.error || 'Bulk foil color upload failed');
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-indigo-800 shadow-xl p-4 sticky top-0 z-[100] backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
                            <span className="font-black text-2xl tracking-tighter">Z</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight leading-tight">Z-ON ADMIN</h1>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">System Live v3.2</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 text-sm items-center">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="font-bold text-xs opacity-70 uppercase tracking-tighter">Authorized Personal</span>
                            <span className="font-medium text-sm">{user?.name}</span>
                        </div>
                        <button onClick={() => navigate('/profile')} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all backdrop-blur-md border border-white/10 group">
                            <User size={18} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button onClick={logout} className="text-red-200 hover:text-white font-bold text-xs bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 hover:bg-red-500/30 transition-all">EXIT</button>
                    </div>
                </div>
            </div>

            {/* Floating Navigation Panels */}
            <div className="px-4 -mt-6 relative z-[110] mb-8">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-2 flex justify-between gap-1 max-w-5xl mx-auto overflow-x-auto border border-white/50 ring-1 ring-black/5 no-scrollbar">
                    {[
                        { id: 'home', label: 'Home', icon: Home },
                        { id: 'production', label: 'Production', icon: Factory, hideFor: ['DISTRIBUTOR'] },
                        { id: 'factory', label: 'Factory Mgmt', icon: Hammer, hideFor: ['DISTRIBUTOR'] }, // NEW
                        { id: 'orders', label: 'Orders', icon: ShoppingBag },
                        { id: 'distributors', label: 'Distributors', icon: Users, hideFor: ['DISTRIBUTOR'] },
                        { id: 'dealers', label: 'Dealers', icon: User },
                        { id: 'designs', label: 'Designs', icon: ImageIcon },
                        { id: 'masters', label: 'Masters', icon: Filter },
                        { id: 'whatsnew', label: "New", icon: Bell }
                    ].filter(tab => !tab.hideFor || !tab.hideFor.includes(user?.role)).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 px-6 rounded-2xl font-bold text-sm transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-2 whitespace-nowrap group ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 ring-4 ring-indigo-50' : 'text-gray-400 hover:bg-gray-100/50 hover:text-gray-600'}`}
                        >
                            <tab.icon size={18} className={`${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4">
                {/* Global Controls Filter Bar */}
                <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 focus-within:ring-2 ring-indigo-100 transition-all">
                            <Calendar size={16} className="text-gray-400" />
                            <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="bg-transparent text-xs font-bold border-none focus:ring-0 p-0 text-gray-700" />
                            <span className="text-gray-300">to</span>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="bg-transparent text-xs font-bold border-none focus:ring-0 p-0 text-gray-700" />
                        </div>
                        <div className="relative group w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search everything..."
                                value={orderFilter.search}
                                onChange={e => setOrderFilter({ ...orderFilter, search: e.target.value })}
                                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm w-full focus:ring-2 ring-indigo-100 outline-none transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                        <select
                            value={orderFilter.status}
                            onChange={e => setOrderFilter({ ...orderFilter, status: e.target.value })}
                            className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 ring-indigo-100 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="RECEIVED">Received</option>
                            <option value="PRODUCTION">Production</option>
                            <option value="READY">Ready</option>
                            <option value="DISPATCHED">Dispatched</option>
                        </select>
                        <button onClick={exportOrdersToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold p-2.5 rounded-xl shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center gap-2 px-3">
                            <FileSpreadsheet size={18} />
                            <span className="text-xs hidden sm:inline">Export</span>
                        </button>
                        <button onClick={() => setShowImportOrders(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2 px-3">
                            <Upload size={18} />
                            <span className="text-xs hidden sm:inline">Import</span>
                        </button>
                    </div>
                </div>

                {/* --- TAB CONTENT --- */}
                {activeTab === 'home' && analytics && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-10">
                        {/* KPI CARDS - STYLIZED */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-3xl shadow-sm border border-indigo-100/50 relative overflow-hidden group hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-500">
                                <div className="absolute -right-6 -top-6 bg-indigo-500/5 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <p className="text-indigo-900/60 text-xs font-black uppercase tracking-widest mb-1">Total Orders</p>
                                        <h3 className="text-4xl font-black text-indigo-900 tracking-tighter tabular-nums">{analytics.kpi.totalOrders}</h3>
                                    </div>
                                    <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200 text-white">
                                        <ShoppingBag size={24} strokeWidth={2.5} />
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2 relative z-10">
                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">LIFETIME</span>
                                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-tight">System Volume</span>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-orange-50 to-white p-6 rounded-3xl shadow-sm border border-orange-100/50 relative overflow-hidden group hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-500">
                                <div className="absolute -right-6 -top-6 bg-orange-500/5 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <p className="text-orange-900/60 text-xs font-black uppercase tracking-widest mb-1">Pending Actions</p>
                                        <h3 className="text-4xl font-black text-orange-600 tracking-tighter tabular-nums">{analytics.kpi.pendingOrders}</h3>
                                    </div>
                                    <div className="bg-orange-500 p-3 rounded-2xl shadow-lg shadow-orange-200 text-white">
                                        <Bell size={24} strokeWidth={2.5} />
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2 relative z-10">
                                    <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full">URGENT</span>
                                    <span className="text-[10px] text-orange-400 font-bold uppercase tracking-tight">Requires Attention</span>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-3xl shadow-sm border border-emerald-100/50 relative overflow-hidden group hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-500">
                                <div className="absolute -right-6 -top-6 bg-emerald-500/5 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <p className="text-emerald-900/60 text-xs font-black uppercase tracking-widest mb-1">Completed</p>
                                        <h3 className="text-4xl font-black text-emerald-600 tracking-tighter tabular-nums">{analytics.kpi.completedOrders}</h3>
                                    </div>
                                    <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200 text-white">
                                        <CheckSquare size={24} strokeWidth={2.5} />
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2 relative z-10">
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full">SUCCESS</span>
                                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-tight">Dispatched</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* CHART PANEL */}
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 lg:col-span-2 group">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="font-black text-xl text-gray-900 tracking-tight">Market Distribution</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Top Distributors by Volume</p>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 group-hover:border-indigo-100 transition-colors">
                                        <BarChart size={20} className="text-indigo-400" />
                                    </div>
                                </div>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.chartData}>
                                            <defs>
                                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                                                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} dx={-10} />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc', radius: 12 }}
                                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                            />
                                            <Bar dataKey="count" fill="url(#barGradient)" radius={[10, 10, 2, 2]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* RECENT FEED PANEL */}
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col group">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="font-black text-xl text-gray-900 tracking-tight">Activity Feed</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Real-time Order Updates</p>
                                    </div>
                                    <button onClick={() => setActiveTab('orders')} className="text-indigo-600 hover:text-indigo-700 font-black text-[10px] uppercase tracking-tighter bg-indigo-50 px-3 py-1.5 rounded-full transition-colors">View All</button>
                                </div>
                                <div className="space-y-4 flex-1 overflow-y-auto max-h-[320px] pr-2 no-scrollbar">
                                    {analytics.recentOrders.length > 0 ? analytics.recentOrders.map(o => (
                                        <div
                                            key={o.id}
                                            className="flex gap-4 items-center p-4 bg-gray-50/50 hover:bg-white rounded-2xl transition-all duration-300 border border-transparent hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50 group/item cursor-pointer"
                                            onClick={() => setSelectedOrder(o)}
                                        >
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner transition-transform group-hover/item:rotate-6 ${o.status === 'RECEIVED' ? 'bg-yellow-100 text-yellow-600' : 'bg-indigo-100 text-indigo-600'
                                                }`}>
                                                {o.status === 'RECEIVED' ? <Download size={20} /> : <ShoppingBag size={20} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-black text-sm text-gray-800 truncate">Order #{o.id}</div>
                                                <div className="text-[11px] text-gray-500 font-bold truncate flex items-center gap-1">
                                                    <User size={10} /> {o.User?.name}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-gray-400 mb-1">{new Date(o.createdAt).toLocaleDateString()}</div>
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm ${o.status === 'RECEIVED' ? 'bg-yellow-400 text-yellow-900' : 'bg-indigo-600 text-white'
                                                    }`}>
                                                    {o.status}
                                                </span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex flex-col items-center justify-center py-10 opacity-30 grayscale italic text-sm">No activity recorded...</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* NEW: PRODUCTION DASHBOARD */}
                {activeTab === 'production' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Production Floor</h2>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Pending Manufacturer Orders</p>
                            </div>

                            <div className="relative group w-full md:w-72">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
                                <select
                                    value={productionDistributorId}
                                    onChange={(e) => setProductionDistributorId(e.target.value)}
                                    className="w-full pl-12 pr-10 py-3 bg-indigo-50 border-none rounded-2xl text-[10px] font-black text-indigo-900 appearance-none focus:ring-4 ring-indigo-100 transition-all cursor-pointer uppercase tracking-widest"
                                >
                                    <option value="">All Distributors</option>
                                    {distributors.map(dist => (
                                        <option key={dist.id} value={dist.id}>{dist.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" size={14} />
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                            <table className="min-w-full text-left">
                                <thead className="bg-gray-50/50 text-gray-400 font-black uppercase text-[10px] tracking-widest border-b border-gray-100">
                                    <tr>
                                        <th className="px-8 py-6">Order Ref</th>
                                        <th className="px-6 py-6">Dealer (Client)</th>
                                        <th className="px-6 py-6">Distributor</th>
                                        <th className="px-6 py-6">Items</th>
                                        <th className="px-6 py-6 h-10 w-10">Status</th>
                                        <th className="px-6 py-6">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {productionOrders.length > 0 ? productionOrders.map(order => (
                                        <tr key={order.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="font-black text-gray-900">#{order.id}</div>
                                                <div className="text-[10px] text-gray-400 font-bold">{new Date(order.createdAt).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                        {order.User?.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-xs">{order.User?.name}</div>
                                                        <div className="text-[10px] text-gray-400">{order.User?.shopName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-xs font-bold text-indigo-600 bg-indigo-50 w-fit px-2 py-1 rounded-lg">
                                                    {distributors.find(d => d.id === order.distributorId)?.name || 'Unknown'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="font-black text-gray-700">{order.OrderItems?.length || 0} Doors</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight flex items-center gap-1.5 w-fit ${order.status === 'RECEIVED' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${order.status === 'RECEIVED' ? 'bg-yellow-500' : 'bg-indigo-500'
                                                        }`}></span>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <button
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all font-bold text-xs flex items-center gap-2"
                                                >
                                                    <Eye size={16} /> View
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="6" className="px-6 py-20 text-center"><div className="text-gray-300 font-black uppercase tracking-[0.2em] italic">No Pending Orders Found</div></td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* FACTORY MANAGEMENT TAB */}
                {activeTab === 'factory' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        {/* 1. Live Floor Stats */}
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><div className="w-1.5 h-8 bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-full"></div>Live Floor Status</h2>
                                <button
                                    onClick={async () => {
                                        if (!confirm('Fix missing data for existing orders?')) return;
                                        const toastId = toast.loading('Repairing...');
                                        try {
                                            const res = await api.post('/workers/repair');
                                            toast.success(res.data.message, { id: toastId });
                                            fetchFactoryStats();
                                        } catch (e) { toast.error('Repair failed', { id: toastId }); }
                                    }}
                                    className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg"
                                >
                                    ⚠️ Fix Missing Data
                                </button>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                {['PVC_CUT', 'FOIL_PASTING', 'EMBOSS', 'DOOR_MAKING', 'PACKING'].map((stage, idx) => (
                                    <div key={stage} className="bg-white p-5 rounded-3xl shadow-lg shadow-gray-100 border border-gray-100 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                                        <div className={`absolute top-0 left-0 w-full h-1 ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-purple-500' : idx === 2 ? 'bg-orange-500' : idx === 3 ? 'bg-cyan-500' : 'bg-green-500'
                                            }`} />
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stage.replace('_', ' ')}</h3>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg ${idx === 0 ? 'bg-blue-500 shadow-blue-200' : idx === 1 ? 'bg-purple-500 shadow-purple-200' : idx === 2 ? 'bg-orange-500 shadow-orange-200' : idx === 3 ? 'bg-cyan-500 shadow-cyan-200' : 'bg-green-500 shadow-green-200'
                                                }`}>{idx + 1}</div>
                                        </div>
                                        <div className="text-3xl font-black text-gray-800 tabular-nums">
                                            {factoryStats[stage] || 0} <span className="text-xs text-gray-400 font-bold ml-1">Units</span>
                                        </div>
                                        <div className="mt-2 text-[10px] bg-gray-50 text-gray-400 font-bold px-2 py-1 rounded-lg w-fit">Pending</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Worker Roster */}
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Worker Roster</h2>
                                    <p className="text-xs text-gray-400 font-bold mt-1">Manage Factory Staff & Access</p>
                                </div>
                                <button
                                    onClick={() => setShowAddWorker(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                                >
                                    <Plus size={16} strokeWidth={3} /> Register Worker
                                </button>
                            </div>

                            <table className="min-w-full text-left">
                                <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest border-b border-gray-100">
                                    <tr>
                                        <th className="px-8 py-5">Worker Name</th>
                                        <th className="px-6 py-5">Role / Station</th>
                                        <th className="px-6 py-5">PIN Access</th>
                                        <th className="px-6 py-5">Status</th>
                                        <th className="px-6 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {workers.length > 0 ? workers.map(worker => (
                                        <tr key={worker.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-8 py-4">
                                                <div className="font-black text-gray-900">{worker.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase px-2 py-1 rounded-lg border border-indigo-100">
                                                    {worker.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-gray-400 text-xs font-mono">****</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                    <span className="text-[10px] font-black text-green-600 uppercase">Active</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteWorker(worker.id)}
                                                    className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="5" className="px-6 py-20 text-center text-gray-300 font-black uppercase tracking-widest italic">No Workers Registered</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>


                        {/* ORDER TRACKING TABLE */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-6 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center bg-gray-50 gap-4">
                                <div>
                                    <h3 className="font-bold text-gray-700">Live Production Tracking</h3>
                                    <p className="text-xs text-gray-400">Real-time status from factory floor</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Group By Control */}
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Group By:</span>
                                        <select
                                            value={groupBy}
                                            onChange={(e) => setGroupBy(e.target.value)}
                                            className="text-sm font-bold text-indigo-700 bg-transparent outline-none cursor-pointer"
                                        >
                                            <option value="order">Order Number</option>
                                            <option value="design">Design Number</option>
                                            <option value="color">Foil Color</option>
                                            <option value="distributor">Distributor</option>
                                        </select>
                                    </div>

                                    {/* Filter Control */}
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Filter..."
                                            value={trackingFilter}
                                            onChange={(e) => setTrackingFilter(e.target.value)}
                                            className="pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none w-40"
                                        />
                                    </div>

                                    <button onClick={fetchFactoryTracking} className="p-2 hover:bg-gray-200 rounded-lg text-indigo-600 transition-colors">
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider border-b">
                                            <th className="p-3 font-bold">{groupBy === 'order' ? 'Order #' : groupBy === 'design' ? 'Design' : groupBy === 'color' ? 'Color' : 'Distributor'}</th>
                                            {groupBy === 'order' && <th className="p-3 font-bold">Distributor</th>}
                                            <th className="p-3 font-bold text-center">Total</th>
                                            <th className="p-3 font-bold text-center text-blue-600">PVC</th>
                                            <th className="p-3 font-bold text-center text-purple-600">Foil</th>
                                            <th className="p-3 font-bold text-center text-orange-600">Emboss</th>
                                            <th className="p-3 font-bold text-center text-cyan-600">Door</th>
                                            <th className="p-3 font-bold text-center text-green-600">Pack</th>
                                            {groupBy === 'order' && <th className="p-3 font-bold text-right">Pending</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {groupedTrackingData.length === 0 ? (
                                            <tr><td colSpan="9" className="text-center py-10 text-gray-400 italic">No Active Production</td></tr>
                                        ) : (
                                            groupedTrackingData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-3 font-bold text-indigo-900">
                                                        {groupBy === 'order' ? `#${row.id}` : row.name}
                                                    </td>
                                                    {groupBy === 'order' && <td className="p-3 font-medium text-gray-700">{row.distributor}</td>}
                                                    <td className="p-3 text-center font-bold bg-gray-50">{row.total}</td>

                                                    {['pvc', 'foil', 'emboss', 'door', 'packed'].map(stage => (
                                                        <td key={stage} className="p-3 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.progress[stage] >= row.total ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                    {row.progress[stage]}
                                                                </span>
                                                                {/* Progress Bar for Grouped Views */}
                                                                {groupBy !== 'order' && row.total > 0 && (
                                                                    <div className="w-12 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                                                                        <div
                                                                            className={`h-full ${stage === 'packed' ? 'bg-green-500' : 'bg-indigo-400'}`}
                                                                            style={{ width: `${(row.progress[stage] / row.total) * 100}%` }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    ))}

                                                    {groupBy === 'order' && (
                                                        <td className="p-3 text-right">
                                                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">
                                                                {row.pending}
                                                            </span>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        )}


                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* FACTORY SETTINGS */}
                        <div className="mt-6 flex justify-end">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-xs font-black uppercase text-gray-400">Factory Geofence</h3>
                                        <div className="font-bold text-gray-700 text-sm flex items-center gap-1">
                                            <MapPin size={14} className={factoryLocation ? 'text-green-500' : 'text-red-400'} />
                                            {factoryLocation ? `Set: ${factoryLocation.lat.toFixed(4)}, ${factoryLocation.lng.toFixed(4)}` : 'Not Set'}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowManualGeo(!showManualGeo)} className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200">
                                            {showManualGeo ? 'Cancel' : 'Manual'}
                                        </button>
                                        {!showManualGeo && (
                                            <button onClick={handleSetLocation} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all">
                                                {factoryLocation ? 'Update GPS' : 'Set GPS'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {showManualGeo && (
                                    <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg animate-in slide-in-from-top-2">
                                        <input
                                            type="number"
                                            placeholder="Lat"
                                            value={manualLat}
                                            onChange={e => setManualLat(e.target.value)}
                                            className="w-24 p-2 text-xs border rounded"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Lng"
                                            value={manualLng}
                                            onChange={e => setManualLng(e.target.value)}
                                            className="w-24 p-2 text-xs border rounded"
                                        />
                                        <button onClick={handleManualLocationSubmit} className="bg-green-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-green-700">
                                            Save
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add Worker Modal */}
                        {showAddWorker && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-900/20 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200 border border-white/50">
                                    <button onClick={() => setShowAddWorker(false)} className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>

                                    <div className="mb-8">
                                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-inner">
                                            <User size={24} />
                                        </div>
                                        <h2 className="text-2xl font-black text-gray-900">Add Staff</h2>
                                        <p className="text-gray-500 text-sm mt-1">Create a new factory login.</p>
                                    </div>

                                    <form onSubmit={handleAddWorker} className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Full Name</label>
                                            <input
                                                type="text"
                                                value={newWorker.name}
                                                onChange={e => setNewWorker({ ...newWorker, name: e.target.value })}
                                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 ring-indigo-500"
                                                placeholder="e.g. Ramesh Kumar"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">4-Digit PIN</label>
                                            <input
                                                type="text" // text to avoid spinners
                                                pattern="\d{4}"
                                                maxLength="4"
                                                value={newWorker.pinCode}
                                                onChange={e => setNewWorker({ ...newWorker, pinCode: e.target.value.replace(/\D/g, '') })}
                                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 ring-indigo-500 tracking-[0.5em] text-center"
                                                placeholder="0000"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Assigned Station</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['PVC_CUT', 'FOIL_PASTING', 'EMBOSS', 'DOOR_MAKING', 'PACKING'].map(role => (
                                                    <button
                                                        type="button"
                                                        key={role}
                                                        onClick={() => setNewWorker({ ...newWorker, role })}
                                                        className={`text-[10px] font-black uppercase py-3 rounded-xl border transition-all ${newWorker.role === role
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                                                            : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-100 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {role.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-xl shadow-indigo-200 transition-all mt-4 active:scale-95">
                                            CREATE ACCOUNT
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )
                }

                {
                    activeTab === 'orders' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                            {/* Bulk Action Alert Bar */}
                            {selectedOrders.length > 0 && (
                                <div className="bg-indigo-600 rounded-3xl p-4 flex justify-between items-center shadow-2xl shadow-indigo-200 animate-in slide-in-from-top-4">
                                    <div className="flex items-center gap-4 px-4 text-white">
                                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                                            <CheckSquare size={20} className="text-white" />
                                        </div>
                                        <span className="font-black text-sm tracking-tight">{selectedOrders.length} Orders Selected for Bulk Action</span>
                                    </div>
                                    <div className="flex gap-2 relative">
                                        <button
                                            onClick={() => setShowBulkAction(!showBulkAction)}
                                            className="bg-white text-indigo-900 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-50 transition-all"
                                        >
                                            Update Status <ChevronDown size={14} strokeWidth={3} />
                                        </button>
                                        {showBulkAction && (
                                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
                                                {['PRODUCTION', 'READY', 'DISPATCHED'].map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => handleBulkStatusUpdate(s)}
                                                        className="w-full text-left px-6 py-3 text-xs font-black text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                                                    >
                                                        Set to {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <button
                                            onClick={handleBulkDeleteOrders}
                                            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                        <button onClick={() => setSelectedOrders([])} className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-2xl transition-all"><X size={18} /></button>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                                <table className="min-w-full text-left">
                                    <thead className="bg-gray-50/50 text-gray-400 font-black uppercase text-[10px] tracking-widest border-b border-gray-100">
                                        <tr>
                                            <th className="px-8 py-6 w-10">
                                                <input
                                                    type="checkbox"
                                                    onChange={e => {
                                                        if (e.target.checked) setSelectedOrders(orders.map(o => o.id));
                                                        else setSelectedOrders([]);
                                                    }}
                                                    checked={selectedOrders.length === orders.length && orders.length > 0}
                                                    className="rounded-lg border-gray-200 text-indigo-600 focus:ring-indigo-500 w-5 h-5 cursor-pointer"
                                                />
                                            </th>
                                            <th className="px-6 py-6 font-black">Order Reference</th>
                                            <th className="px-6 py-6 font-black">Client (Dealer)</th>
                                            <th className="px-6 py-6 font-black">Item Count</th>
                                            <th className="px-6 py-6 font-black">Current Status</th>
                                            <th className="px-6 py-6 font-black">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {orders.length > 0 ? orders.map(order => (
                                            <tr key={order.id} className={`hover:bg-indigo-50/30 transition-colors group ${order.isEdited ? 'bg-orange-50/50' : ''} ${selectedOrders.includes(order.id) ? 'bg-indigo-50' : ''}`}>
                                                <td className="px-8 py-5 align-middle">
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedOrders.includes(order.id)}
                                                            onChange={() => toggleOrderSelection(order.id)}
                                                            className="rounded-lg border-gray-200 text-indigo-600 focus:ring-indigo-500 w-5 h-5 cursor-pointer shadow-sm transition-all"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-black text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setSelectedOrder(order)}>#{order.id}</div>
                                                        {order.isEdited && <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-black tracking-tighter shadow-sm animate-pulse">REVISED</span>}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase">{new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="font-black text-gray-900 text-sm tracking-tight truncate max-w-[150px]">{order.User?.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5"><Home size={10} className="opacity-50" /> {order.User?.shopName}</div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">{order.OrderItems?.length} Units</span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm flex items-center w-fit gap-1.5 whitespace-nowrap ${order.status === 'RECEIVED' ? 'bg-yellow-400 text-yellow-900 ring-4 ring-yellow-50' :
                                                        order.status === 'PRODUCTION' ? 'bg-indigo-600 text-white ring-4 ring-indigo-50' :
                                                            order.status === 'READY' ? 'bg-emerald-600 text-white ring-4 ring-emerald-50' :
                                                                order.status === 'DISPATCHED' ? 'bg-purple-600 text-white ring-4 ring-purple-50' :
                                                                    'bg-red-500 text-white ring-4 ring-red-50'
                                                        }`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white opacity-60"></span>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2">
                                                        {order.status !== 'CANCELLED' ? (
                                                            <div className="relative group/select">
                                                                <select
                                                                    value={order.status}
                                                                    onChange={(e) => updateStatus(order.id, e.target.value)}
                                                                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer group-hover/select:bg-white group-hover/select:shadow-lg transition-all outline-none text-gray-700 ring-1 ring-black/5"
                                                                >
                                                                    <option value="RECEIVED">📥 Received</option>
                                                                    <option value="PRODUCTION">🔧 Production</option>
                                                                    <option value="READY">✅ Ready</option>
                                                                    <option value="DISPATCHED">🚚 Dispatched</option>
                                                                    <option value="DELAYED">⏳ Delayed</option>
                                                                    <option value="CANCELLED">❌ Cancel</option>
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            <span className="text-red-500 font-black text-[10px] uppercase tracking-widest bg-red-50 px-3 py-1 rounded-xl opacity-60 italic">Voided</span>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteOrder(order.id)}
                                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Delete Order"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="6" className="px-6 py-20 text-center"><div className="text-gray-300 font-black uppercase tracking-[0.2em] italic">No Orders Detected</div></td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'distributors' && user?.role === 'MANUFACTURER' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Distributor Network</h2>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Manage partners and authorizations</p>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button onClick={() => { setBulkUploadType('DISTRIBUTOR'); setShowBulkUpload(true); }} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl font-black shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 text-xs transition-all active:scale-95 uppercase tracking-widest"><Upload size={16} /> Bulk</button>
                                    <button onClick={() => openUserModal('DISTRIBUTOR')} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-widest text-xs">+ Register New</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {distributors.length > 0 ? distributors.map(d => (
                                    <div key={d.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden group hover:border-indigo-200 transition-all duration-300">
                                        <div className={`absolute top-0 left-0 w-1.5 h-full ${d.isEnabled ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:bg-indigo-50 transition-colors">
                                                🏢
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => openUserModal('DISTRIBUTOR', d)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDeleteUser(d.id)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-black text-gray-900 text-lg leading-tight truncate">{d.name}</h3>
                                                <span className={`w-2 h-2 rounded-full ${d.isEnabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-1"><Home size={10} /> {d.shopName || 'Wholesale Partner'}</p>

                                            <div className="space-y-3 pt-4 border-t border-gray-50">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-400 font-bold">Region</span>
                                                    <span className="text-gray-700 font-black truncate max-w-[120px]">{d.city}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-400 font-bold">Volume</span>
                                                    <div className="flex gap-1">
                                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg font-black text-[10px]">{d.orderCount || 0} Total</span>
                                                        <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-lg font-black text-[10px]">{d.pendingOrderCount || 0} Pend.</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => toggleUserStatus(d.id, !d.isEnabled)} className={`mt-6 w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${d.isEnabled ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                                            }`}>
                                            {d.isEnabled ? 'Suspend Access' : 'Restore Access'}
                                        </button>
                                    </div>
                                )) : (
                                    <div className="col-span-full py-20 text-center opacity-30 grayscale italic text-sm">No partners detected...</div>
                                )}
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'dealers' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Dealer Directory</h2>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Client database and assignments</p>
                                    </div>
                                    <div className="w-px h-10 bg-gray-100 hidden sm:block"></div>
                                    <div className="relative group w-full sm:w-64">
                                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
                                        <select
                                            value={distributorFilter}
                                            onChange={(e) => setDistributorFilter(e.target.value)}
                                            className="w-full pl-12 pr-10 py-3 bg-indigo-50 border-none rounded-2xl text-[10px] font-black text-indigo-900 appearance-none focus:ring-4 ring-indigo-100 transition-all cursor-pointer uppercase tracking-widest"
                                        >
                                            <option value="">All Partners</option>
                                            {distributors.map(dist => (
                                                <option key={dist.id} value={dist.id}>{dist.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" size={14} />
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full lg:w-auto">
                                    <button onClick={() => { setBulkUploadType('DEALER'); setShowBulkUpload(true); }} className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-black shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest">
                                        <Upload size={18} /> Bulk
                                    </button>
                                    <button onClick={() => openUserModal('DEALER')} className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest">
                                        <Plus size={18} /> New Dealer
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                                {filteredDealers.length > 0 ? filteredDealers.map(dealer => (
                                    <div key={dealer.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 relative group hover:border-indigo-200 transition-all duration-300">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                                                    {dealer.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-gray-900 text-lg leading-tight truncate max-w-[150px]">{dealer.name}</h3>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`w - 1.5 h - 1.5 rounded - full ${dealer.isEnabled ? 'bg-emerald-500' : 'bg-red-500'} `}></span>
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{dealer.isEnabled ? 'Active Client' : 'Restricted'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openUserModal('DEALER', dealer)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDeleteUser(dealer.id)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Home size={14} className="text-gray-400" />
                                                    <span className="text-xs font-black text-gray-700 truncate">{dealer.shopName || 'General Store'}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Filter size={14} className="text-gray-400" />
                                                    <span className="text-xs font-bold text-gray-500">{dealer.city || 'Regional Area'}</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center px-2">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Assigned To</p>
                                                    <p className="text-xs font-black text-indigo-600">@{dealer.Distributor?.name || 'Unassigned'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Status</p>
                                                    <button
                                                        onClick={() => toggleUserStatus(dealer.id, !dealer.isEnabled)}
                                                        className={`text-[10px] font-black uppercase px-3 py-1 rounded-full transition-all ${dealer.isEnabled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                            }`}
                                                    >
                                                        {dealer.isEnabled ? 'Enabled' : 'Disabled'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-full py-20 text-center opacity-30 grayscale italic text-sm">No clients detected...</div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* Designs & Masters Tabs (Reused) */}
                {
                    activeTab === 'designs' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Design Portfolio</h2>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Digital catalog and product inventory</p>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button onClick={() => setShowBulkDesigns(true)} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-black shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest">
                                        <Upload size={16} /> Bulk
                                    </button>
                                    <button onClick={() => setShowAddDesign(true)} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest">
                                        <Plus size={18} /> New
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                                {designs.map(d => (
                                    <div key={d.id} className={`group relative bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-100/50 hover:-translate-y-2 ${!d.isEnabled ? 'grayscale opacity-60' : ''}`}>
                                        {/* Image Container */}
                                        <div className="aspect-[3/4.5] bg-gray-50 relative flex items-center justify-center overflow-hidden">
                                            {d.imageUrl ? (
                                                <img
                                                    src={getImageUrl(d.imageUrl)}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    alt={d.designNumber}
                                                />
                                            ) : (
                                                <ImageIcon size={48} className="text-gray-200" />
                                            )}

                                            {/* Overlay Controls */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                                <button onClick={() => openEditDesign(d)} className="bg-white/90 hover:bg-white text-indigo-600 p-3 rounded-2xl shadow-xl transition-all active:scale-90"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDeleteDesign(d.id)} className="bg-white/90 hover:bg-white text-red-600 p-3 rounded-2xl shadow-xl transition-all active:scale-90"><Trash2 size={18} /></button>
                                            </div>

                                            {/* Badges */}
                                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                                <span className="bg-white/90 backdrop-blur-md text-gray-900 text-[10px] px-3 py-1.5 rounded-full font-black shadow-lg uppercase tracking-widest border border-white/50">
                                                    {d.DoorType?.name || 'Standard'}
                                                </span>
                                                {d.isTrending && (
                                                    <span className="bg-yellow-400 text-yellow-900 text-[10px] px-3 py-1.5 rounded-full font-black shadow-lg uppercase tracking-widest border border-yellow-200 animate-pulse">
                                                        🔥 Trending
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Design Details */}
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-black text-gray-900 text-lg tracking-tight">#{d.designNumber}</h3>
                                                {!d.isEnabled && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Inactive</span>}
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                                                {d.category || 'Premium Collection'} • {d.DoorType?.thickness || '32mm'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }
                {
                    activeTab === 'masters' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12">
                            {/* Global Foil Color Master */}
                            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Foil Color Spectrum</h2>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Laminate texture and finish definitions</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowBulkColors(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl font-black shadow-lg shadow-emerald-100 flex items-center gap-2 transition-all active:scale-95 text-[10px] uppercase tracking-widest"><Upload size={14} /> Bulk</button>
                                        <button onClick={() => setShowAddColor(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl font-black shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all active:scale-95 text-[10px] uppercase tracking-widest">+ New Foil</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-4">
                                    {colors.map(c => (
                                        <div key={c.id} className={`relative group aspect-square rounded-3xl overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-100/30 ${!c.isEnabled ? 'grayscale opacity-50' : ''}`}>
                                            {c.imageUrl ? (
                                                <img src={getImageUrl(c.imageUrl)} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full shadow-inner" style={{ backgroundColor: c.hexCode }}></div>
                                            )}

                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingColor({ ...c, imageFile: null })} className="bg-white/90 hover:bg-white text-indigo-600 p-2 rounded-xl shadow-lg transition-all active:scale-90"><Edit2 size={14} /></button>
                                                    <button onClick={() => handleDeleteColor(c.id)} className="bg-white/90 hover:bg-white text-red-600 p-2 rounded-xl shadow-lg transition-all active:scale-90"><Trash2 size={14} /></button>
                                                </div>
                                                <span className="text-[10px] text-white font-black uppercase tracking-widest">{c.name}</span>
                                            </div>

                                            <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-black text-center truncate shadow-sm group-hover:opacity-0 transition-opacity border border-white/50">
                                                {c.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Door Types */}
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 h-min">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">Architecture</h2>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-8">Structural specifications</p>
                                <div className="space-y-3">
                                    {doors.map(d => (
                                        <div key={d.id} className="flex justify-between items-center p-5 bg-gray-50/50 rounded-2xl border border-gray-100 group hover:border-indigo-100 hover:bg-indigo-50/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform">🚪</div>
                                                <div>
                                                    <span className="block text-xs font-black text-gray-900 uppercase tracking-tight">{d.name}</span>
                                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Standard Type</span>
                                                </div>
                                            </div>
                                            <span className="font-black text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">{d.thickness}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* What's New Tab - Social Feed for Admin */}
                {
                    activeTab === 'whatsnew' && (
                        <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
                            {/* Create Post Header */}
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Post Broadcast</h2>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Share updates with your entire network</p>
                            </div>

                            {/* Create Post Card */}
                            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/60 p-8 border border-gray-50 transform hover:scale-[1.01] transition-all duration-500">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 animate-pulse">
                                        <Bell size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-900 leading-none">Global Announcement</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Compose your message</p>
                                    </div>
                                </div>

                                <form onSubmit={handleCreatePost} className="space-y-6">
                                    <input
                                        type="text"
                                        placeholder="Brief Title (e.g. New Door Series Launch)"
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 placeholder:text-gray-300 focus:ring-4 ring-indigo-50 transition-all"
                                        value={newPost.title}
                                        onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                                    />
                                    <textarea
                                        placeholder="Describe your update in detail..."
                                        className="w-full bg-gray-50 border-none rounded-2xl p-6 text-sm font-medium text-gray-600 placeholder:text-gray-300 min-h-[150px] resize-none focus:ring-4 ring-indigo-50 transition-all"
                                        value={newPost.content}
                                        onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                                        required
                                    />

                                    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-gray-50/50 p-4 rounded-[2rem] border border-gray-100">
                                        <div className="flex gap-4">
                                            <div className="relative">
                                                <select
                                                    className="pl-4 pr-10 py-2.5 bg-white border-none rounded-xl text-[10px] font-black text-gray-700 appearance-none focus:ring-4 ring-indigo-100 transition-all cursor-pointer uppercase tracking-widest shadow-sm"
                                                    value={newPost.postType}
                                                    onChange={e => setNewPost({ ...newPost, postType: e.target.value })}
                                                >
                                                    <option value="announcement">📢 Broadcast</option>
                                                    <option value="new_design">🚪 Design</option>
                                                    <option value="promotion">🎉 Promo</option>
                                                    <option value="update">📋 System</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                                            </div>

                                            <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2.5 rounded-xl shadow-sm hover:bg-indigo-50 transition-colors border-none group">
                                                <ImageIcon size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Add Media</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={e => setNewPost({ ...newPost, image: e.target.files[0] })} />
                                            </label>
                                        </div>

                                        {newPost.image && (
                                            <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100 animate-in zoom-in">
                                                ✓ {newPost.image.name.length > 15 ? newPost.image.name.substring(0, 15) + '...' : newPost.image.name}
                                            </div>
                                        )}
                                    </div>

                                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-xs">
                                        Publish Update
                                    </button>
                                </form>
                            </div>

                            {/* Posts Feed Section */}
                            <div className="space-y-10 relative">
                                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-100/50 via-gray-100 to-transparent -translate-x-1/2 hidden sm:block"></div>

                                {posts.length === 0 ? (
                                    <div className="text-center bg-white p-12 rounded-[3rem] border border-dashed border-gray-200">
                                        <div className="text-gray-200 mb-4 flex justify-center"><Bell size={48} /></div>
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs italic">Awaiting your first broadcast...</p>
                                    </div>
                                ) : posts.map((post, idx) => (
                                    <div key={post.id} className={`relative sm:w-[90%] ${idx % 2 === 0 ? 'sm:mr-auto' : 'sm:ml-auto'} group`}>
                                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100 hover:border-indigo-200 transition-all duration-500">
                                            {post.imageUrl && (
                                                <div className="h-64 bg-gray-50 overflow-hidden relative">
                                                    <img src={getImageUrl(post.imageUrl)} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Post" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                                </div>
                                            )}
                                            <div className="p-8">
                                                <div className="flex justify-between items-start mb-6">
                                                    <span className={`text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-sm ring-1 ring-inset ${post.postType === 'announcement' ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' :
                                                        post.postType === 'new_design' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                                                            post.postType === 'promotion' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                                                                'bg-gray-50 text-gray-700 ring-gray-200'
                                                        }`}>
                                                        {post.postType.replace('_', ' ')}
                                                    </span>
                                                    <button onClick={() => handleDeletePost(post.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                {post.title && <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-3 leading-tight uppercase">{post.title}</h3>}
                                                <p className="text-gray-500 text-sm leading-relaxed font-medium whitespace-pre-wrap">{post.content}</p>

                                                <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-600 italic">Z</div>
                                                        <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Admin Team</span>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }

                {/* MODALS */}
                {/* 1. USER MODAL */}
                {
                    showUserModal && (
                        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in duration-300 border border-gray-100 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">{editingUser ? 'Update' : 'Initialize'} Partner</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Configure {userModalType.toLowerCase()} credentials</p>
                                    </div>
                                    <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-100 rounded-2xl transition-all text-gray-400"><X /></button>
                                </div>

                                <form onSubmit={handleUserSubmit} className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                                        <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 focus:ring-4 ring-indigo-50 transition-all" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} required />
                                    </div>

                                    {/* DISTRIBUTOR SPECIFIC */}
                                    {userModalType === 'DISTRIBUTOR' && (
                                        <>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Universal Username</label>
                                                <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 focus:ring-4 ring-indigo-50 transition-all disabled:opacity-50" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} disabled={!!editingUser} required />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{editingUser ? 'New Password (Optional)' : 'Secure Password'}</label>
                                                <input type="password" title="Set a secure password" size="20" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 focus:ring-4 ring-indigo-50 transition-all" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder={editingUser ? "Leave empty to keep current" : "Min. 6 characters"} />
                                            </div>
                                        </>
                                    )}

                                    {/* DEALER SPECIFIC */}
                                    {userModalType === 'DEALER' && (
                                        <>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Authorized Google Email</label>
                                                <input type="email" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 focus:ring-4 ring-indigo-50 transition-all" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} required placeholder="partner@gmail.com" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Establishment Name</label>
                                                <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 focus:ring-4 ring-indigo-50 transition-all" value={userForm.shopName} onChange={e => setUserForm({ ...userForm, shopName: e.target.value })} placeholder="e.g. Premium Hardware Hub" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reporting Distributor</label>
                                                <div className="relative">
                                                    <select className="w-full bg-gray-50 border-none rounded-2xl p-4 text-[11px] font-black text-indigo-900 appearance-none focus:ring-4 ring-indigo-50 transition-all cursor-pointer uppercase tracking-widest" value={userForm.distributorId} onChange={e => setUserForm({ ...userForm, distributorId: e.target.value })} required>
                                                        <option value="">Select Primary Partner...</option>
                                                        {distributors.filter(d => d.isEnabled).map(d => <option key={d.id} value={d.id}>{d.name} (@{d.username})</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" size={14} />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City / Region</label>
                                        <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 focus:ring-4 ring-indigo-50 transition-all" value={userForm.city} onChange={e => setUserForm({ ...userForm, city: e.target.value })} />
                                    </div>

                                    <div className="flex items-center gap-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 group transition-all hover:bg-indigo-50/30">
                                        <input type="checkbox" checked={userForm.isEnabled} onChange={e => setUserForm({ ...userForm, isEnabled: e.target.checked })} className="w-5 h-5 rounded-lg border-gray-200 text-indigo-600 focus:ring-indigo-500" />
                                        <label className="text-xs font-black text-gray-600 uppercase tracking-widest group-hover:text-indigo-900 transition-colors">Grant System Authorization</label>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all active:scale-95 uppercase tracking-widest text-[10px]">Confirm Protocol</button>
                                        <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 py-4 rounded-2xl font-black transition-all active:scale-95 uppercase tracking-widest text-[10px]">Abort</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {
                    selectedOrder && (
                        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setSelectedOrder(null)}>
                            <div className="bg-white rounded-[3rem] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                                <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 px-10 py-8 text-white flex justify-between items-center shrink-0 border-b border-white/10">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Manifest Document</p>
                                        <h2 className="text-3xl font-black tracking-tight">Order #{selectedOrder.id}</h2>
                                    </div>
                                    <button onClick={() => setSelectedOrder(null)} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all"><X /></button>
                                </div>

                                <div className="p-10 overflow-y-auto flex-1 bg-gray-50/30">
                                    <div className="flex flex-col md:flex-row gap-8 mb-10">
                                        <div className="flex-1 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Client Information</p>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Authorized Dealer</span><span className="text-xs font-black text-gray-900">{selectedOrder.Dealer?.name}</span></div>
                                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Establishment</span><span className="text-xs font-black text-gray-900">{selectedOrder.Dealer?.shopName}</span></div>
                                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Region</span><span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{selectedOrder.Dealer?.city}</span></div>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Order Metadata</p>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Timestamp</span><span className="text-xs font-black text-gray-900">{new Date(selectedOrder.createdAt).toLocaleString()}</span></div>
                                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Item Quantity</span><span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{selectedOrder.OrderItems?.length || 0} Products</span></div>
                                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Current Status</span><span className={`text - xs font - black px - 2 py - 1 rounded - lg uppercase ${selectedOrder.status === 'READY' ? 'bg-emerald-500 text-white' :
                                                    selectedOrder.status === 'PENDING' ? 'bg-amber-500 text-white' :
                                                        'bg-indigo-600 text-white'
                                                    }`}>{selectedOrder.status}</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Bill of Materials</p>
                                        {selectedOrder.OrderItems?.map((item, i) => (
                                            <div key={i} className="group flex flex-col sm:flex-row gap-8 p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500">
                                                <div className="w-full sm:w-32 aspect-[3/4.5] bg-gray-100 rounded-3xl overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-700">
                                                    {item.designImageSnapshot ? (
                                                        <img src={getImageUrl(item.designImageSnapshot)} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={32} /></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 flex flex-col justify-center">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <h4 className="text-2xl font-black text-gray-900 tracking-tight mb-2 uppercase">{item.designNameSnapshot}</h4>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: item.colorHexSnapshot || '#EEE' }}></div>
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.colorNameSnapshot} Finish</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-4xl font-black text-indigo-500/20 group-hover:text-indigo-500/100 transition-colors">x{item.quantity}</span>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-gray-50 p-4 rounded-2xl flex flex-col border border-gray-100/50">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Architecture</span>
                                                            <span className="text-xs font-black text-gray-900">{item.doorTypeNameSnapshot}</span>
                                                        </div>
                                                        <div className="bg-gray-50 p-4 rounded-2xl flex flex-col border border-gray-100/50">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Dimensions</span>
                                                            <span className="text-xs font-black text-gray-900">{item.width}" × {item.height}"</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="px-10 py-6 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
                                    <button onClick={() => setSelectedOrder(null)} className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Close Manifest</button>
                                    <button onClick={() => window.print()} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"><Download size={14} /> Print Order</button>
                                </div>
                            </div>
                        </div>
                    )
                }
                {
                    (showAddColor || editingColor) && (
                        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300 border border-gray-100">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">{editingColor ? 'Edit' : 'Create'} Shade</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-8">Spectrum Definition Protocol</p>

                                <form onSubmit={editingColor ? handleUpdateColorReal : handleAddColorReal} className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Color Display Name</label>
                                        <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 focus:ring-4 ring-indigo-50 transition-all" placeholder="e.g. Royal Teak"
                                            value={editingColor ? editingColor.name : newColor.name}
                                            onChange={e => editingColor ? setEditingColor({ ...editingColor, name: e.target.value }) : setNewColor({ ...newColor, name: e.target.value })} required />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Hexadecimal Index</label>
                                        <div className="relative">
                                            <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-sm font-black font-mono text-gray-700 focus:ring-4 ring-indigo-50 transition-all uppercase" placeholder="#000000"
                                                value={(editingColor ? editingColor.hexCode : newColor.hexCode) || ''}
                                                onChange={e => editingColor ? setEditingColor({ ...editingColor, hexCode: e.target.value }) : setNewColor({ ...newColor, hexCode: e.target.value })} />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-lg border border-white/50 shadow-sm" style={{ backgroundColor: (editingColor ? editingColor.hexCode : newColor.hexCode) || '#EEE' }}></div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Visual Sample (Optional)</label>
                                        <label className="flex items-center justify-center gap-2 cursor-pointer bg-gray-50 hover:bg-indigo-50 border-2 border-dashed border-gray-100 hover:border-indigo-200 rounded-2xl p-4 transition-all group">
                                            <Upload size={18} className="text-gray-400 group-hover:text-indigo-600" />
                                            <span className="text-xs font-black text-gray-500 group-hover:text-indigo-900 uppercase tracking-widest">Select Image</span>
                                            <input type="file" accept="image/*" className="hidden"
                                                onChange={e => editingColor
                                                    ? setEditingColor({ ...editingColor, imageFile: e.target.files[0] })
                                                    : setNewColor({ ...newColor, image: e.target.files[0] })} />
                                        </label>
                                        {(editingColor?.imageUrl || (editingColor?.imageFile || newColor.image)) && (
                                            <div className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1 mt-2">
                                                ✓ Digital texture assets detected
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all active:scale-95 uppercase tracking-widest text-[10px]">Registry Save</button>
                                        <button type="button" onClick={() => { setShowAddColor(false); setEditingColor(null) }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 py-4 rounded-2xl font-black transition-all active:scale-95 uppercase tracking-widest text-[10px]">Cancel</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }
                {
                    (showAddDesign || editingDesign) && (
                        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white rounded-[3rem] p-10 max-w-xl w-full my-8 shadow-2xl animate-in zoom-in duration-300 border border-gray-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 -z-10 translate-x-8 translate-y-8 blur-3xl opacity-50"></div>

                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">{editingDesign ? 'Modify' : 'Draft'} Architecture</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Design Master Database Entry</p>
                                    </div>
                                    <button onClick={() => { setShowAddDesign(false); setEditingDesign(null) }} className="p-2 hover:bg-gray-100 rounded-2xl transition-all text-gray-400"><X /></button>
                                </div>

                                <form onSubmit={editingDesign ? handleUpdateDesignReal : handleAddDesignReal} className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Design Serial #</label>
                                            <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-black text-gray-900 focus:ring-4 ring-indigo-50 transition-all" placeholder="e.g. Z-101" required
                                                value={editingDesign ? editingDesign.designNumber : newDesign.designNumber}
                                                onChange={e => editingDesign ? setEditingDesign({ ...editingDesign, designNumber: e.target.value }) : setNewDesign({ ...newDesign, designNumber: e.target.value })} />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Architectural Type</label>
                                            <div className="relative">
                                                <select className="w-full bg-gray-50 border-none rounded-2xl p-4 text-[11px] font-black text-indigo-900 appearance-none focus:ring-4 ring-indigo-50 transition-all cursor-pointer uppercase tracking-widest" required
                                                    value={editingDesign ? editingDesign.doorTypeId : newDesign.doorTypeId}
                                                    onChange={e => editingDesign ? setEditingDesign({ ...editingDesign, doorTypeId: e.target.value }) : setNewDesign({ ...newDesign, doorTypeId: e.target.value })}>
                                                    <option value="">Select Structure...</option>
                                                    {doors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" size={14} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Collection / Category</label>
                                        <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 focus:ring-4 ring-indigo-50 transition-all" placeholder="e.g. Luxury Oak Series"
                                            value={editingDesign ? (editingDesign.category || '') : newDesign.category}
                                            onChange={e => editingDesign ? setEditingDesign({ ...editingDesign, category: e.target.value }) : setNewDesign({ ...newDesign, category: e.target.value })} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Master Render Asset</label>
                                        <label className="flex items-center justify-center flex-col gap-3 cursor-pointer bg-gray-50 hover:bg-indigo-50 border-2 border-dashed border-gray-100 hover:border-indigo-200 rounded-[2rem] p-8 transition-all group overflow-hidden relative">
                                            {/* Preview Thumbnail */}
                                            {(editingDesign?.imageFile || newDesign.image) ? (
                                                <div className="flex items-center gap-4 animate-in zoom-in">
                                                    <div className="w-12 h-16 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"><img src={URL.createObjectURL(editingDesign?.imageFile || newDesign.image)} className="w-full h-full object-cover" /></div>
                                                    <span className="text-xs font-black text-indigo-600 uppercase">Asset Buffered</span>
                                                </div>
                                            ) : editingDesign?.imageUrl ? (
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-16 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"><img src={getImageUrl(editingDesign.imageUrl)} className="w-full h-full object-cover" /></div>
                                                    <span className="text-xs font-black text-emerald-600 uppercase">Current Asset: ✓</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-300 shadow-sm group-hover:text-indigo-500 transition-colors"><Upload size={24} /></div>
                                                    <div className="text-center">
                                                        <span className="text-[10px] font-black text-gray-500 group-hover:text-indigo-900 uppercase tracking-widest block">Upload Portrait CAD/Render</span>
                                                        <span className="text-[9px] font-bold text-gray-300 uppercase mt-1">PNG/JPG • Max 5MB</span>
                                                    </div>
                                                </>
                                            )}
                                            <input type="file" accept="image/*" className="hidden"
                                                onChange={e => editingDesign
                                                    ? setEditingDesign({ ...editingDesign, imageFile: e.target.files[0] })
                                                    : setNewDesign({ ...newDesign, image: e.target.files[0] })} />
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-3 bg-gray-50/50 p-6 rounded-[1.5rem] border border-gray-100 group transition-all hover:bg-amber-50/30">
                                        <input type="checkbox"
                                            checked={editingDesign ? editingDesign.isTrending : newDesign.isTrending}
                                            onChange={e => editingDesign ? setEditingDesign({ ...editingDesign, isTrending: e.target.checked }) : setNewDesign({ ...newDesign, isTrending: e.target.checked })}
                                            className="w-6 h-6 rounded-lg border-gray-200 text-amber-500 focus:ring-amber-500" />
                                        <div className="flex flex-col">
                                            <label className="text-xs font-black text-gray-700 uppercase tracking-widest">Trending Visibility</label>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Prioritize in Dealer Gallery</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-6">
                                        <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all active:scale-95 uppercase tracking-widest text-[10px]">Execute Save</button>
                                        <button type="button" onClick={() => { setShowAddDesign(false); setEditingDesign(null) }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 py-4 rounded-2xl font-black transition-all active:scale-95 uppercase tracking-widest text-[10px]">Abort</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* BULK UPLOAD MODAL */}
                {
                    showBulkUpload && (
                        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white rounded-[3rem] p-12 max-w-xl w-full shadow-2xl relative overflow-hidden animate-in zoom-in duration-300 border border-gray-100">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-lime-400 to-emerald-500"></div>

                                <button onClick={() => setShowBulkUpload(false)} className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-2xl transition-all text-gray-400">
                                    <X size={24} />
                                </button>

                                <div className="text-center">
                                    <div className="bg-lime-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-lime-100/50">
                                        <FileSpreadsheet className="text-lime-600 w-10 h-10 animate-bounce" />
                                    </div>

                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight uppercase">Batch Import</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2 mb-10">Protocols for {bulkUploadType.toLowerCase()} network expansion</p>

                                    <div className="flex flex-col gap-4 mb-10">
                                        {/* Download Sample */}
                                        <button
                                            onClick={downloadSample}
                                            className="flex items-center justify-between px-8 py-5 bg-gray-50 hover:bg-white border-2 border-dashed border-gray-100 hover:border-indigo-500 rounded-[2rem] transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 group-hover:text-indigo-600 shadow-sm transition-colors border border-gray-100"><Download size={20} /></div>
                                                <div className="text-left">
                                                    <span className="block text-[10px] font-black text-gray-600 uppercase tracking-widest group-hover:text-indigo-900 transition-colors">Digital Blueprint</span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Download XLSX Template</span>
                                                </div>
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-gray-300 group-hover:text-indigo-500 shadow-sm">→</div>
                                        </button>

                                        <div className="flex items-center gap-4 px-2">
                                            <div className="flex-1 h-px bg-gray-100"></div>
                                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">OR SOURCE ASSET</span>
                                            <div className="flex-1 h-px bg-gray-100"></div>
                                        </div>

                                        {/* Upload File */}
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept=".xlsx, .xls, .csv"
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="flex items-center justify-center gap-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-100 transition-all active:scale-95 uppercase tracking-widest text-[11px]">
                                                <Upload size={20} className="animate-pulse" />
                                                Initialize Data Stream
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/80 p-6 rounded-[2rem] border border-gray-100 text-left">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
                                            <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Required Data Mapping:</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {bulkUploadType === 'DISTRIBUTOR' ? (
                                                <>
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Identity</span>
                                                        <ul className="text-[10px] font-bold text-gray-600 space-y-1"><li>• Legal Name</li><li>• Shop Identifier</li></ul>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Credentials</span>
                                                        <ul className="text-[10px] font-bold text-gray-600 space-y-1"><li>• Master Username</li><li>• Secure Password</li></ul>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Entity</span>
                                                        <ul className="text-[10px] font-bold text-gray-600 space-y-1"><li>• Dealer Name</li><li>• Shop Label</li></ul>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Routing</span>
                                                        <ul className="text-[10px] font-bold text-gray-600 space-y-1"><li>• Google Auth Email</li><li>• Parent Distributor ID</li></ul>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* === IMPORT ORDERS MODAL === */}
                {
                    showImportOrders && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative animate-in zoom-in-95 duration-300">
                                <button onClick={() => setShowImportOrders(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
                                    <X size={20} />
                                </button>

                                <div className="text-center mb-6">
                                    <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Upload size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900">Import Orders from Excel</h3>
                                    <p className="text-gray-500 text-sm mt-1">Upload historical orders or bulk import new orders</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Step 1: Download Sample */}
                                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-gray-700">Step 1: Download Sample</p>
                                                <p className="text-xs text-gray-500">Get the correct format template</p>
                                            </div>
                                            <button onClick={downloadOrderImportSample} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2">
                                                <Download size={14} /> Sample
                                            </button>
                                        </div>
                                    </div>

                                    {/* Step 2: Upload File */}
                                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="font-bold text-blue-700">Step 2: Upload Your File</p>
                                                <p className="text-xs text-blue-600/70">Excel .xlsx or .xls format</p>
                                            </div>
                                        </div>
                                        <label className="block w-full bg-white border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-blue-50/50">
                                            <Upload size={24} className="mx-auto text-blue-400 mb-2" />
                                            <span className="text-sm font-bold text-blue-600">Click to select file</span>
                                            <input type="file" accept=".xlsx,.xls" onChange={handleOrderImportFile} className="hidden" />
                                        </label>
                                    </div>

                                    {/* Required Columns Info */}
                                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                                        <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">Required Columns:</p>
                                        <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-amber-800">
                                            <span>dealerEmail</span>
                                            <span>designNumber</span>
                                            <span>colorName</span>
                                            <span>width</span>
                                            <span>height</span>
                                            <span>thickness</span>
                                            <span>quantity</span>
                                            <span>status</span>
                                            <span>orderDate</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Bulk Upload Designs Modal */}
                {
                    showBulkDesigns && (
                        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 animate-in fade-in">
                            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-gray-900">Bulk Upload Designs</h3>
                                    <button onClick={() => setShowBulkDesigns(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-gray-700">Step 1: Download Sample</p>
                                                <p className="text-xs text-gray-500">Template with columns: designNumber, category, doorType</p>
                                            </div>
                                            <button onClick={downloadDesignSample} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2">
                                                <Download size={14} /> Sample
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                                        <p className="font-bold text-indigo-700 mb-2">Step 2: Upload Your File</p>
                                        <label className="block w-full bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer transition-all">
                                            <Upload size={24} className="mx-auto text-indigo-400 mb-2" />
                                            <span className="text-sm font-bold text-indigo-600">Click to upload Excel</span>
                                            <p className="text-xs text-gray-400 mt-1">Photos can be uploaded later via Edit</p>
                                            <input type="file" accept=".xlsx,.xls" onChange={handleBulkDesignUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Bulk Upload Foil Colors Modal */}
                {
                    showBulkColors && (
                        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 animate-in fade-in">
                            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-gray-900">Bulk Upload Foil Colors</h3>
                                    <button onClick={() => setShowBulkColors(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-gray-700">Step 1: Download Sample</p>
                                                <p className="text-xs text-gray-500">Template with column: name</p>
                                            </div>
                                            <button onClick={downloadFoilColorSample} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2">
                                                <Download size={14} /> Sample
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                                        <p className="font-bold text-emerald-700 mb-2">Step 2: Upload Your File</p>
                                        <label className="block w-full bg-white border-2 border-dashed border-emerald-200 hover:border-emerald-400 rounded-xl p-6 text-center cursor-pointer transition-all">
                                            <Upload size={24} className="mx-auto text-emerald-400 mb-2" />
                                            <span className="text-sm font-bold text-emerald-600">Click to upload Excel</span>
                                            <p className="text-xs text-gray-400 mt-1">Texture photos can be uploaded later</p>
                                            <input type="file" accept=".xlsx,.xls" onChange={handleBulkFoilColorUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
}


