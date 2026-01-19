import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useMediaQuery';

// Layout-specific components
import MobileDashboard from './MobileDashboard';
import DesktopDashboard from './DesktopDashboard';

/**
 * Dealer Dashboard - Responsive Wrapper
 * Detects screen size and renders the appropriate layout
 */
export default function DealerDashboard() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    const [activeTab, setActiveTab] = useState('new-order');

    // Data State
    const [doors, setDoors] = useState([]);
    const [designs, setDesigns] = useState([]);
    const [filteredDesigns, setFilteredDesigns] = useState([]);
    const [allColors, setAllColors] = useState([]);

    // Order Form State - Multi-Size Quick Add
    const [orderSelection, setOrderSelection] = useState({ doorTypeId: '', designId: '', colorId: '' });
    const [sizeRows, setSizeRows] = useState([{ id: 1, width: '', height: '', thickness: '30mm', quantity: 1, remarks: '' }]);
    const [cart, setCart] = useState([]);

    // My Orders & Posts
    const [myOrders, setMyOrders] = useState([]);
    const [posts, setPosts] = useState([]);

    // === DATA FETCHERS ===
    useEffect(() => {
        fetchDoors();
        fetchDesigns();
        fetchColors();
        if (activeTab === 'my-orders') fetchMyOrders();
        if (activeTab === 'whatsnew') fetchPosts();
    }, [activeTab]);

    useEffect(() => {
        if (orderSelection.doorTypeId) {
            setFilteredDesigns(designs.filter(d => d.doorTypeId == orderSelection.doorTypeId));
        } else {
            setFilteredDesigns([]);
        }
    }, [orderSelection.doorTypeId, designs]);

    const fetchDoors = async () => { try { const res = await api.get('/doors'); setDoors(res.data); } catch (e) { } };
    const fetchDesigns = async () => { try { const res = await api.get('/designs'); setDesigns(res.data); } catch (e) { } };
    const fetchColors = async () => { try { const res = await api.get('/colors'); setAllColors(res.data.filter(c => c.isEnabled)); } catch (e) { } };
    const fetchMyOrders = async () => { try { const res = await api.get('/orders'); setMyOrders(res.data); } catch (e) { } };
    const fetchPosts = async () => { try { const res = await api.get('/posts'); setPosts(res.data); } catch (e) { } };

    const getImageUrl = (path) => path ? api.defaults.baseURL.replace('/api', '') + path : null;

    // === CART & ORDER FUNCTIONS ===
    const addRow = () => {
        setSizeRows([...sizeRows, { id: Date.now(), width: '', height: '', thickness: '30mm', quantity: 1, remarks: '' }]);
    };

    const removeRow = (id) => {
        if (sizeRows.length > 1) {
            setSizeRows(sizeRows.filter(row => row.id !== id));
        }
    };

    const updateRow = (id, field, value) => {
        setSizeRows(sizeRows.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const addAllToCart = () => {
        if (!orderSelection.designId || !orderSelection.colorId) return toast.error('Select Design and Color first');

        const validRows = sizeRows.filter(row => row.width && row.height);
        if (validRows.length === 0) return toast.error('Enter at least one valid size (Width & Height)');

        const design = designs.find(d => d.id == orderSelection.designId);
        const color = allColors.find(c => c.id == orderSelection.colorId);

        const newItems = validRows.map(row => ({
            ...row,
            doorTypeId: orderSelection.doorTypeId,
            designId: orderSelection.designId,
            colorId: orderSelection.colorId,
            designName: design.designNumber,
            colorName: color.name,
            designImage: design.imageUrl,
            colorImage: color.imageUrl,
            id: Date.now() + Math.random()
        }));

        setCart([...cart, ...newItems]);
        setSizeRows([{ id: 1, width: '', height: '', thickness: '30mm', quantity: 1, remarks: '' }]);
        toast.success(`${validRows.length} item(s) added to cart!`);
    };

    const placeOrder = async () => {
        if (cart.length === 0) return;
        try {
            await api.post('/orders', { items: cart });
            toast.success('Order Placed Successfully!');
            setCart([]);
            setActiveTab('my-orders');
        } catch (error) {
            toast.error('Failed to place order');
        }
    };

    const cancelOrder = async (orderId) => {
        if (!confirm('Are you sure you want to cancel this order? This cannot be undone.')) return;
        try {
            await api.put(`/orders/${orderId}/status`, { status: 'CANCELLED' });
            toast.success('Order cancelled');
            fetchMyOrders();
        } catch (error) {
            toast.error('Failed to cancel order');
        }
    };

    // === PROPS FOR CHILD COMPONENTS ===
    const sharedProps = {
        user, logout, navigate,
        activeTab, setActiveTab,
        doors, designs, filteredDesigns, allColors,
        orderSelection, setOrderSelection,
        sizeRows, addRow, removeRow, updateRow, addAllToCart,
        cart, setCart, placeOrder,
        myOrders, cancelOrder,
        posts,
        getImageUrl
    };

    // === RENDER APPROPRIATE LAYOUT ===
    return isMobile ? <MobileDashboard {...sharedProps} /> : <DesktopDashboard {...sharedProps} />;
}
