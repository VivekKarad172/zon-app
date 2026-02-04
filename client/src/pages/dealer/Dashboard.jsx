import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
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
    const [searchQuery, setSearchQuery] = useState(''); // New Search State
    const [sizeRows, setSizeRows] = useState([{ id: 1, width: '', height: '', quantity: 1, remarks: '', hasLock: false, hasVent: false }]);
    const [cart, setCart] = useState([]);

    // My Orders & Posts
    const [myOrders, setMyOrders] = useState([]);
    const [posts, setPosts] = useState([]);

    // === DATA FETCHERS ===
    useEffect(() => {
        fetchDoors();
        fetchDesigns();
        fetchColors();

        let interval;
        if (activeTab === 'my-orders') {
            fetchMyOrders();
            interval = setInterval(fetchMyOrders, 5000);
        }
        if (activeTab === 'whatsnew') fetchPosts();

        return () => interval && clearInterval(interval);
    }, [activeTab]);

    useEffect(() => {
        let result = designs;
        if (orderSelection.doorTypeId) {
            result = result.filter(d => d.doorTypeId == orderSelection.doorTypeId);
        }
        if (searchQuery) {
            result = result.filter(d => d.designNumber.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        setFilteredDesigns(result);
    }, [orderSelection.doorTypeId, designs, searchQuery]);

    const fetchDoors = async () => { try { const res = await api.get('/doors'); setDoors(res.data); } catch (e) { } };
    const fetchDesigns = async () => { try { const res = await api.get('/designs'); setDesigns(res.data); } catch (e) { } };
    const fetchColors = async () => { try { const res = await api.get('/colors'); setAllColors(res.data.filter(c => c.isEnabled)); } catch (e) { } };
    const fetchMyOrders = async () => { try { const res = await api.get('/orders'); setMyOrders(res.data); } catch (e) { } };
    const fetchPosts = async () => { try { const res = await api.get('/posts'); setPosts(res.data); } catch (e) { } };

    const getImageUrl = (path) => path ? api.defaults.baseURL.replace('/api', '') + path : null;

    // === CART & ORDER FUNCTIONS ===
    const addRow = () => {
        setSizeRows([...sizeRows, { id: Date.now(), width: '', height: '', quantity: 1, remarks: '', hasLock: false, hasVent: false }]);
    };

    const addBulkRows = (count) => {
        const newRows = Array.from({ length: count }).map((_, i) => ({
            id: Date.now() + i,
            width: '',
            height: '',
            quantity: 1,
            remarks: '',
            hasLock: false,
            hasVent: false
        }));
        setSizeRows([...sizeRows, ...newRows]);
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

    // === CART & ORDER FUNCTIONS ===
    // ...

    // === COMPUTED VALUES FOR ORDER HISTORY ===
    const [groupBy, setGroupBy] = useState('order'); // 'order', 'design', 'color'

    const groupedOrders = useMemo(() => {
        if (!myOrders) return [];
        if (groupBy === 'order') return myOrders;

        const groups = {};
        myOrders.forEach(order => {
            if (!order.OrderItems) return;

            order.OrderItems.forEach(item => {
                const key = groupBy === 'design' ? item.designNameSnapshot : item.colorNameSnapshot;
                if (!groups[key]) {
                    groups[key] = {
                        name: key,
                        totalItems: 0,
                        items: [],
                        ordersCount: 0,
                        lastDate: order.createdAt // track latest date
                    };
                }
                groups[key].totalItems += item.quantity;
                groups[key].items.push({ ...item, orderId: order.id, status: order.status, date: order.createdAt });
                // We could count unique orders if needed
            });
        });

        // Calculate unique order count per group
        Object.values(groups).forEach(g => {
            const uniqueOrders = new Set(g.items.map(i => i.orderId));
            g.ordersCount = uniqueOrders.size;
        });

        return Object.values(groups).sort((a, b) => b.totalItems - a.totalItems);
    }, [myOrders, groupBy]);

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
        setCart([...cart, ...newItems]);
        setSizeRows([{ id: 1, width: '', height: '', quantity: 1, remarks: '', hasLock: false, hasVent: false }]);
        toast.success(`${validRows.length} item(s) added to cart!`);
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

    const handleReorder = (order) => {
        // Map old order items to new cart items
        // Note: We need to ensure design/color still exist, but for now we trust snapshots or just copy IDs
        // For Cart, we need: doorTypeId, designId, colorId, width, height, qty...
        // The order item has: width, height, quantity. It might NOT have original IDs if they were deleted.
        // But assuming they exist:

        const newCartItems = order.OrderItems.map(item => ({
            id: Date.now() + Math.random(),
            width: item.width,
            height: item.height,
            quantity: item.quantity,
            remarks: item.remarks || '',
            hasLock: item.hasLock || false,
            hasVent: item.hasVent || false,
            // Logic to find IDs based on snapshots names if needed, or use existing IDs if preserved
            // For simplicity, we assume we can't fully reconstruct if IDs are missing.
            // But we can try to find Design ID by Name
            designId: designs.find(d => d.designNumber === item.designNameSnapshot)?.id || '',
            colorId: allColors.find(c => c.name === item.colorNameSnapshot)?.id || '',
            // We need Door Type? Ideally it's same for all?
            // If we can't find exact ID, we might skip or use dummy?
            // Let's rely on finding them.
            designName: item.designNameSnapshot,
            colorName: item.colorNameSnapshot,
            // Images?
            designImage: designs.find(d => d.designNumber === item.designNameSnapshot)?.imageUrl,
            colorImage: allColors.find(c => c.name === item.colorNameSnapshot)?.imageUrl,

            // We need doorTypeId to be valid?
            // Not strictly needed for UI display but needed for order submission?
            // Actually placeOrder just sends items. Backend creates OrderItems.
            // Backend might validate.
            // Let's assume user just wants to add to cart and maybe edit?
        }));

        // Filter out items that couldn't be matched (deleted designs)
        const validItems = newCartItems.filter(i => i.designId && i.colorId);

        if (validItems.length < newCartItems.length) {
            toast('Some items could not be restored (Design/Color deleted)', { icon: '⚠️' });
        }

        if (validItems.length > 0) {
            setCart([...cart, ...validItems]);
            toast.success('Items added to cart!');
            setActiveTab('new-order');
        } else {
            toast.error('Could not restore items.');
        }
    };

    // === PROPS FOR CHILD COMPONENTS ===
    const sharedProps = {
        user, logout, navigate,
        activeTab, setActiveTab,
        doors, designs, filteredDesigns, allColors,
        orderSelection, setOrderSelection,
        sizeRows, addRow, removeRow, updateRow, addAllToCart, addBulkRows,
        cart, setCart, placeOrder,
        myOrders, cancelOrder, handleReorder,
        groupBy, setGroupBy, groupedOrders, // New Props
        searchQuery, setSearchQuery, // Search Prop
        posts,
        getImageUrl
    };

    // === RENDER APPROPRIATE LAYOUT ===
    return isMobile ? <MobileDashboard {...sharedProps} /> : <DesktopDashboard {...sharedProps} />;
}
