import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useMediaQuery';
import * as XLSX from 'xlsx';

// Layout-specific components
import MobileDashboard from './MobileDashboard';
import DesktopDashboard from './DesktopDashboard';

/**
 * Distributor Dashboard - Responsive Wrapper
 */
export default function DistributorDashboard() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    const [activeTab, setActiveTab] = useState('orders');
    const [orderFilter, setOrderFilter] = useState('all');
    const [orders, setOrders] = useState([]);
    const [dealers, setDealers] = useState([]);
    const [posts, setPosts] = useState([]);

    const [showAddDealer, setShowAddDealer] = useState(false);
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    const [isEditingDealer, setIsEditingDealer] = useState(false);
    const [editingDealerId, setEditingDealerId] = useState(null);
    const [newDealer, setNewDealer] = useState({ name: '', email: '', city: '', shopName: '' });

    // === DATA FETCHERS ===
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
            const res = await api.get('/users?role=DEALER');
            setDealers(res.data);
        } catch (e) { }
    };

    const fetchPosts = async () => {
        try { const res = await api.get('/posts'); setPosts(res.data); } catch (e) { }
    };

    const getImageUrl = (path) => path ? api.defaults.baseURL.replace('/api', '') + path : null;

    // === HANDLERS ===
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
        if (!orders.length) return toast.error('No orders to export');

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

    const handleAddDealer = async (e) => {
        e.preventDefault();
        try {
            if (isEditingDealer) {
                await api.put(`/users/${editingDealerId}`, {
                    name: newDealer.name,
                    city: newDealer.city,
                    shopName: newDealer.shopName
                });
                toast.success('Dealer updated successfully');
            } else {
                await api.post('/users', { ...newDealer, role: 'DEALER' });
                toast.success('Dealer created successfully');
            }
            setShowAddDealer(false);
            setNewDealer({ name: '', email: '', city: '', shopName: '' });
            setIsEditingDealer(false);
            setEditingDealerId(null);
            fetchDealers();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
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

    const processBulkUpload = async (users) => {
        try {
            const res = await api.post('/users/bulk', { users, role: 'DEALER' });
            toast.success(res.data.message);
            if (res.data.failed > 0) {
                toast.error(`Failed to create ${res.data.failed} users.`);
            }
            setShowBulkUpload(false);
            fetchDealers();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Bulk upload failed');
        }
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

    // === COMPUTED VALUES ===
    const filteredOrders = orders.filter(order => {
        if (orderFilter === 'pending') return ['RECEIVED', 'PRODUCTION'].includes(order.status);
        if (orderFilter === 'completed') return ['READY', 'DISPATCHED'].includes(order.status);
        return true;
    });

    const pendingCount = orders.filter(o => ['RECEIVED', 'PRODUCTION'].includes(o.status)).length;
    const completedCount = orders.filter(o => ['READY', 'DISPATCHED'].includes(o.status)).length;

    const getStatusBadge = (status) => {
        const styles = {
            'RECEIVED': 'bg-yellow-100 text-yellow-800',
            'PRODUCTION': 'bg-blue-100 text-blue-800',
            'READY': 'bg-green-100 text-green-800',
            'DISPATCHED': 'bg-purple-100 text-purple-800',
            'CANCELLED': 'bg-red-100 text-red-800'
        };
        const emojis = { 'RECEIVED': '📥', 'PRODUCTION': '🔧', 'READY': '✅', 'DISPATCHED': '🚚', 'CANCELLED': '❌' };
        return <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm inline-flex items-center gap-1 whitespace-nowrap ${styles[status] || 'bg-gray-100'}`}>{emojis[status] || ''} {status}</span>;
    };

    // === PROPS FOR CHILD COMPONENTS ===
    const sharedProps = {
        user, logout, navigate,
        activeTab, setActiveTab,
        orders, filteredOrders, orderFilter, setOrderFilter,
        dealers, posts,
        updateStatus, handleExportOrders,
        showAddDealer, setShowAddDealer, newDealer, setNewDealer, handleAddDealer,
        isEditingDealer, openEditDealer, handleDeleteDealer, showDeleteConfirm, setShowDeleteConfirm,
        showBulkUpload, setShowBulkUpload, handleFileUpload, downloadSample,
        pendingCount, completedCount, getStatusBadge, getImageUrl
    };

    return isMobile ? <MobileDashboard {...sharedProps} /> : <DesktopDashboard {...sharedProps} />;
}
