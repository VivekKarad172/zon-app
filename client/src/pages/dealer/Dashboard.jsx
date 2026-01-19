import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { ShoppingCart, Clock, Bell, Users, CheckCircle, X, Plus, Trash2 } from 'lucide-react';

export default function DealerDashboard() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('new-order'); // new-order, my-orders

    // Data State
    const [doors, setDoors] = useState([]);
    const [designs, setDesigns] = useState([]);
    const [filteredDesigns, setFilteredDesigns] = useState([]);
    const [allColors, setAllColors] = useState([]); // All 20 colors available for all designs

    // Order Form State - Multi-Size Quick Add
    const [orderSelection, setOrderSelection] = useState({ doorTypeId: '', designId: '', colorId: '' });
    const [sizeRows, setSizeRows] = useState([{ id: 1, width: '', height: '', thickness: '30mm', quantity: 1, remarks: '' }]);
    const [cart, setCart] = useState([]);

    // My Orders
    const [myOrders, setMyOrders] = useState([]);
    const [posts, setPosts] = useState([]); // What's New posts

    useEffect(() => {
        fetchDoors();
        fetchDesigns();
        fetchColors(); // Fetch ALL colors on load
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

    // No longer filter colors by design - ALL colors available for ALL designs
    // Removed: useEffect for filteredColors

    const fetchDoors = async () => { try { const res = await api.get('/doors'); setDoors(res.data); } catch (e) { } };
    const fetchDesigns = async () => { try { const res = await api.get('/designs'); setDesigns(res.data); } catch (e) { } };
    const fetchColors = async () => { try { const res = await api.get('/colors'); setAllColors(res.data.filter(c => c.isEnabled)); } catch (e) { } };
    const fetchMyOrders = async () => { try { const res = await api.get('/orders'); setMyOrders(res.data); } catch (e) { } };
    const fetchPosts = async () => { try { const res = await api.get('/posts'); setPosts(res.data); } catch (e) { } };

    const getImageUrl = (path) => path ? api.defaults.baseURL.replace('/api', '') + path : null;

    // Multi-Size Quick Add Functions
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
        setSizeRows([{ id: 1, width: '', height: '', thickness: '30mm', quantity: 1, remarks: '' }]); // Reset rows
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

    // Cancel Order (only if RECEIVED status - before production starts)
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

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Premium Mobile Header with Gradient */}
            <div className="bg-gradient-to-r from-indigo-700 to-purple-800 shadow-xl p-4 sticky top-0 z-[100] border-b border-white/10 backdrop-blur-md">
                <div className="flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md border border-white/10 shadow-inner">
                            <span className="font-black text-xl tracking-tighter">Z</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-black tracking-tight leading-loose uppercase">Z-ON PANEL</h1>
                            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest block -mt-1">Dealer Workspace</span>
                        </div>
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

            {/* Premium Tab Navigation (Floating) */}
            <div className="max-w-md mx-auto px-4 -mt-6 relative z-[110] mb-8">
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-1.5 flex justify-between gap-1 border border-white/50">
                    <button onClick={() => setActiveTab('new-order')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 ${activeTab === 'new-order' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 ring-4 ring-indigo-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                        <ShoppingCart size={18} />
                        <span>New Order</span>
                    </button>
                    <button onClick={() => setActiveTab('my-orders')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 ${activeTab === 'my-orders' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 ring-4 ring-indigo-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                        <Clock size={18} />
                        <span>History</span>
                    </button>
                    <button onClick={() => setActiveTab('whatsnew')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 ${activeTab === 'whatsnew' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 ring-4 ring-indigo-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                        <Bell size={18} />
                        <span>News</span>
                    </button>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4">
                {activeTab === 'new-order' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Welcome Banner */}
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg mb-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                            <div className="relative z-10">
                                <h2 className="text-2xl font-bold mb-1">Start New Order</h2>
                                <p className="text-blue-100 text-sm">Select material to browse designs</p>
                            </div>
                        </div>

                        {/* Step 1: Material/Door Type Cards */}
                        <section>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block ml-1">1. Select Material</label>
                            <div className="grid grid-cols-2 gap-4">
                                {doors.map(d => (
                                    <button key={d.id}
                                        onClick={() => setOrderSelection({ ...orderSelection, doorTypeId: d.id, designId: '', colorId: '' })}
                                        className={`relative p-5 rounded-2xl text-left transition-all duration-300 group overflow-hidden ${orderSelection.doorTypeId == d.id
                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-[1.02] ring-2 ring-indigo-600 ring-offset-2'
                                            : 'bg-white hover:bg-gray-50 text-gray-700 shadow-sm hover:shadow-md'
                                            }`}
                                    >
                                        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
                                            <div className="w-16 h-16 rounded-full bg-current"></div>
                                        </div>
                                        <div className="relative z-10">
                                            <span className="text-2xl mb-2 block">🚪</span>
                                            <div className="font-bold text-lg leading-tight">{d.name}</div>
                                            <div className={`text-xs mt-1 font-medium ${orderSelection.doorTypeId == d.id ? 'text-indigo-200' : 'text-gray-400'}`}>{d.thickness}</div>
                                        </div>
                                        {orderSelection.doorTypeId == d.id && (
                                            <div className="absolute bottom-3 right-3 bg-white/20 p-1 rounded-full backdrop-blur-sm">
                                                <CheckCircle size={14} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Step 2: Design */}
                        {orderSelection.doorTypeId && (
                            <section className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block ml-1">2. Select Design</label>
                                <div className="grid grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1 pb-4">
                                    {filteredDesigns.map(d => (
                                        <div key={d.id}
                                            onClick={() => setOrderSelection({ ...orderSelection, designId: d.id, colorId: '' })}
                                            className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group ${orderSelection.designId == d.id
                                                ? 'ring-4 ring-indigo-500 ring-offset-2 shadow-xl'
                                                : 'shadow-md hover:shadow-xl hover:-translate-y-1'
                                                }`}
                                        >
                                            <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center relative">
                                                {/* Image */}
                                                {d.imageUrl ? (
                                                    <img src={getImageUrl(d.imageUrl)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={d.designNumber} />
                                                ) : (
                                                    <div className="text-gray-300 text-4xl">🚪</div>
                                                )}
                                                {/* Gradient Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60"></div>

                                                {/* Selected Indicator */}
                                                {orderSelection.designId == d.id && (
                                                    <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[1px] flex items-center justify-center animate-in fade-in">
                                                        <div className="bg-white text-indigo-600 rounded-full p-3 shadow-lg transform scale-125">
                                                            <CheckCircle size={24} strokeWidth={3} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                                <div className="font-bold text-lg shadow-black drop-shadow-md">{d.designNumber}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Step 3: Color */}
                        {orderSelection.designId && (
                            <section className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block ml-1">3. Color</label>
                                <div className="bg-white p-5 rounded-3xl shadow-sm">
                                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-y-4 gap-x-2">
                                        {allColors.map(c => (
                                            <div key={c.id}
                                                onClick={() => setOrderSelection({ ...orderSelection, colorId: c.id })}
                                                className="cursor-pointer flex flex-col items-center group"
                                            >
                                                <div className={`w-14 h-14 rounded-full shadow-sm overflow-hidden border-[3px] transition-all duration-300 ${orderSelection.colorId == c.id ? 'border-indigo-600 scale-110 shadow-lg ring-2 ring-indigo-200 ring-offset-2' : 'border-transparent hover:scale-105'}`}>
                                                    {c.imageUrl ? (
                                                        <img src={getImageUrl(c.imageUrl)} className="w-full h-full object-cover" alt={c.name} />
                                                    ) : (
                                                        <div className="w-full h-full" style={{ backgroundColor: c.hexCode || '#eee' }}></div>
                                                    )}
                                                </div>
                                                <span className={`text-xs font-black mt-2 text-center leading-tight transition-colors ${orderSelection.colorId == c.id ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-800'}`}>
                                                    {c.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Step 4: Multi-Size Quick Add Table */}
                        {orderSelection.colorId && (
                            <section className="animate-in fade-in slide-in-from-bottom-8 duration-500 pb-10">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">4. Add Sizes</label>
                                    <button onClick={addRow} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-full transition-all hover:bg-indigo-100">
                                        <Plus size={14} /> Add Row
                                    </button>
                                </div>
                                <div className="bg-white p-4 rounded-3xl shadow-lg border border-indigo-50/50">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-12 gap-2 mb-2 px-1">
                                        <div className="col-span-3 text-[10px] uppercase font-bold text-gray-400">Width</div>
                                        <div className="col-span-3 text-[10px] uppercase font-bold text-gray-400">Height</div>
                                        <div className="col-span-3 text-[10px] uppercase font-bold text-gray-400">Thick</div>
                                        <div className="col-span-2 text-[10px] uppercase font-bold text-gray-400">Qty</div>
                                        <div className="col-span-1"></div>
                                    </div>

                                    {/* Size Rows */}
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {sizeRows.map((row, index) => (
                                            <div key={row.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                <input
                                                    type="number"
                                                    className="col-span-3 bg-white border border-gray-200 rounded-lg p-2 text-center font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    placeholder="W"
                                                    value={row.width}
                                                    onChange={e => updateRow(row.id, 'width', e.target.value)}
                                                />
                                                <input
                                                    type="number"
                                                    className="col-span-3 bg-white border border-gray-200 rounded-lg p-2 text-center font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    placeholder="H"
                                                    value={row.height}
                                                    onChange={e => updateRow(row.id, 'height', e.target.value)}
                                                />
                                                <select
                                                    className="col-span-3 bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    value={row.thickness}
                                                    onChange={e => updateRow(row.id, 'thickness', e.target.value)}
                                                >
                                                    <option value="30mm">30mm</option>
                                                    <option value="32mm">32mm</option>
                                                    <option value="35mm">35mm</option>
                                                    <option value="Custom">Custom</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    className="col-span-2 bg-white border border-gray-200 rounded-lg p-2 text-center font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    placeholder="Qty"
                                                    value={row.quantity}
                                                    min="1"
                                                    onChange={e => updateRow(row.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                                />
                                                <button
                                                    onClick={() => removeRow(row.id)}
                                                    className={`col-span-1 p-2 rounded-lg transition-all ${sizeRows.length > 1 ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
                                                    disabled={sizeRows.length <= 1}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Summary & Add All Button */}
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="text-xs text-gray-500 mb-3 text-center">
                                            {sizeRows.filter(r => r.width && r.height).length} valid size(s) ready to add
                                        </div>
                                        <button onClick={addAllToCart} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transform active:scale-95 transition-all">
                                            <ShoppingCart size={20} /> Add All to Cart
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Cart Floating Action Button or Preview */}
                        {cart.length > 0 && (
                            <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
                                <div className="bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-4 text-white border border-gray-700/50">
                                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
                                        <div>
                                            <div className="font-bold text-lg flex items-center gap-2">
                                                <div className="bg-indigo-500 w-8 h-8 rounded-full flex items-center justify-center text-sm">{cart.length}</div>
                                                Items in Cart
                                            </div>
                                            <div className="text-gray-400 text-xs mt-1">Ready to place order?</div>
                                        </div>
                                        <button onClick={() => setCart([])} className="text-xs text-red-300 hover:text-red-100 font-medium px-2 py-1 rounded bg-red-900/30">Clear</button>
                                    </div>

                                    <div className="max-h-48 overflow-y-auto space-y-2 mb-4 scrollbar-hide">
                                        {cart.map((item, i) => (
                                            <div key={item.id} className="flex gap-3 items-center bg-gray-800/50 p-2 rounded-xl border border-gray-700/30">
                                                <div className="w-14 h-14 rounded-xl bg-white overflow-hidden flex-shrink-0 border border-gray-700/50 shadow-inner">
                                                    {item.designImage && <img src={getImageUrl(item.designImage)} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black text-sm truncate">{item.designName} <span className="text-indigo-300 text-[10px]">({item.colorName})</span></div>
                                                    <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{item.thickness} Thickness</div>
                                                    <div className="text-[10px] text-gray-400 font-medium">{item.width}" x {item.height}" | Qty: {item.quantity}</div>
                                                </div>
                                                <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-gray-500 hover:text-red-400 p-2"><X size={16} /></button>
                                            </div>
                                        ))}
                                    </div>

                                    <button onClick={placeOrder} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all uppercase tracking-widest text-xs">
                                        Confirm & Place Order <CheckCircle size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'my-orders' && (
                    <div className="px-1 max-w-lg mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-6 transition-all duration-500">
                        <h2 className="text-lg font-bold text-gray-800 mb-2">My Orders</h2>
                        {myOrders.length === 0 && (
                            <div className="bg-white rounded-xl p-8 text-center text-gray-400">No orders yet. Place your first order!</div>
                        )}
                        {myOrders.map(order => {
                            const statusSteps = ['RECEIVED', 'PRODUCTION', 'READY', 'DISPATCHED'];
                            const currentStep = order.status === 'CANCELLED' || order.status === 'DELAYED' ? -1 : statusSteps.indexOf(order.status);
                            const isCancelled = order.status === 'CANCELLED';
                            const isDelayed = order.status === 'DELAYED';

                            return (
                                <div key={order.id} className={`bg-white p-4 rounded-xl shadow-sm border ${isCancelled ? 'border-red-300 bg-red-50' : isDelayed ? 'border-orange-300 bg-orange-50' : order.isEdited ? 'border-l-4 border-orange-400' : 'border-gray-100'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-indigo-700 text-lg">Order #{order.id}</span>
                                            {order.isEdited && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">EDITED</span>}
                                        </div>
                                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${order.status === 'RECEIVED' ? 'bg-yellow-100 text-yellow-800' :
                                            order.status === 'PRODUCTION' ? 'bg-blue-100 text-blue-800' :
                                                order.status === 'READY' ? 'bg-green-100 text-green-800' :
                                                    order.status === 'DISPATCHED' ? 'bg-purple-100 text-purple-800' :
                                                        order.status === 'DELAYED' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-red-100 text-red-800'
                                            }`}>
                                            {order.status === 'RECEIVED' ? '📥' : order.status === 'PRODUCTION' ? '🔧' : order.status === 'READY' ? '✅' : order.status === 'DISPATCHED' ? '🚚' : order.status === 'DELAYED' ? '⏳' : '❌'} {order.status}
                                        </span>
                                    </div>

                                    {/* Status Progress Bar - Hide if CANCELLED or DELAYED */}
                                    {!isCancelled && !isDelayed && (
                                        <div className="flex items-center gap-1 mb-4">
                                            {statusSteps.map((step, idx) => (
                                                <div key={step} className="flex-1">
                                                    <div className={`h-2 rounded-full ${idx <= currentStep ?
                                                        (step === 'DISPATCHED' ? 'bg-purple-500' : step === 'READY' ? 'bg-green-500' : step === 'PRODUCTION' ? 'bg-blue-500' : 'bg-yellow-500')
                                                        : 'bg-gray-200'}`} />
                                                    <div className={`text-[9px] text-center mt-1 ${idx <= currentStep ? 'text-gray-700 font-medium' : 'text-gray-300'}`}>
                                                        {step === 'RECEIVED' ? '📥' : step === 'PRODUCTION' ? '🔧' : step === 'READY' ? '✅' : '🚚'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Cancel Button - Only show if RECEIVED (before production) */}
                                    {order.status === 'RECEIVED' && (
                                        <button
                                            onClick={() => cancelOrder(order.id)}
                                            className="w-full bg-red-100 text-red-600 py-2 rounded-lg text-sm font-bold mb-3 hover:bg-red-200 transition-all"
                                        >
                                            ❌ Cancel Order
                                        </button>
                                    )}

                                    <div className="text-xs text-gray-500 mb-3">{new Date(order.createdAt).toLocaleString()}</div>
                                    <div className="space-y-2">
                                        {order.OrderItems?.map((item, i) => (
                                            <div key={i} className="flex gap-3 bg-gray-50 p-2 rounded">
                                                <div className="w-10 h-10 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                                                    {item.designImageSnapshot && <img src={getImageUrl(item.designImageSnapshot)} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="text-sm">
                                                    <div className="font-bold">{item.designNameSnapshot} - {item.colorNameSnapshot}</div>
                                                    <div className="text-gray-600">{item.width} x {item.height} | Qty: {item.quantity}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* What's New Tab - Read Only Feed for Dealers */}
                {activeTab === 'whatsnew' && (
                    <div className="px-4 max-w-lg mx-auto space-y-4">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Bell className="text-indigo-600" /> What's New
                        </h2>
                        {posts.length === 0 && (
                            <div className="text-center text-gray-400 py-12 bg-white rounded-xl">No updates yet. Check back soon!</div>
                        )}
                        {posts.map(post => (
                            <div key={post.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                {post.imageUrl && (
                                    <div className="h-40 bg-gray-100">
                                        <img src={getImageUrl(post.imageUrl)} className="w-full h-full object-cover" alt="Post" />
                                    </div>
                                )}
                                <div className="p-4">
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${post.postType === 'announcement' ? 'bg-blue-100 text-blue-700' : post.postType === 'new_design' ? 'bg-purple-100 text-purple-700' : post.postType === 'promotion' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {post.postType === 'announcement' ? '📢' : post.postType === 'new_design' ? '🚪' : post.postType === 'promotion' ? '🎉' : '📋'} {post.postType.replace('_', ' ')}
                                    </span>
                                    {post.title && <h3 className="font-bold text-lg text-gray-800 mt-2">{post.title}</h3>}
                                    <p className="text-gray-600 mt-2 whitespace-pre-wrap text-sm">{post.content}</p>
                                    <div className="text-xs text-gray-400 mt-3">{new Date(post.createdAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
