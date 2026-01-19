import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { ShoppingCart, Clock, Bell } from 'lucide-react';

export default function DealerDashboard() {
    const { logout, user } = useAuth();
    const [activeTab, setActiveTab] = useState('new-order'); // new-order, my-orders

    // Data State
    const [doors, setDoors] = useState([]);
    const [designs, setDesigns] = useState([]);
    const [filteredDesigns, setFilteredDesigns] = useState([]);
    const [allColors, setAllColors] = useState([]); // All 20 colors available for all designs

    // Order Form State
    const [orderItem, setOrderItem] = useState({ doorTypeId: '', designId: '', colorId: '', width: '', height: '', quantity: 1, remarks: '' });
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
        if (orderItem.doorTypeId) {
            setFilteredDesigns(designs.filter(d => d.doorTypeId == orderItem.doorTypeId));
        } else {
            setFilteredDesigns([]);
        }
    }, [orderItem.doorTypeId, designs]);

    // No longer filter colors by design - ALL colors available for ALL designs
    // Removed: useEffect for filteredColors

    const fetchDoors = async () => { try { const res = await api.get('/doors'); setDoors(res.data); } catch (e) { } };
    const fetchDesigns = async () => { try { const res = await api.get('/designs'); setDesigns(res.data); } catch (e) { } };
    const fetchColors = async () => { try { const res = await api.get('/colors'); setAllColors(res.data.filter(c => c.isEnabled)); } catch (e) { } };
    const fetchMyOrders = async () => { try { const res = await api.get('/orders'); setMyOrders(res.data); } catch (e) { } };
    const fetchPosts = async () => { try { const res = await api.get('/posts'); setPosts(res.data); } catch (e) { } };

    const getImageUrl = (path) => path ? api.defaults.baseURL.replace('/api', '') + path : null;

    const addToCart = (e) => {
        e.preventDefault();
        if (!orderItem.designId || !orderItem.colorId) return toast.error('Select Design and Color');

        // Enrich item with display data
        const design = designs.find(d => d.id == orderItem.designId);
        const color = allColors.find(c => c.id == orderItem.colorId);

        setCart([...cart, { ...orderItem, designName: design.designNumber, colorName: color.name, designImage: design.imageUrl, colorImage: color.imageUrl, id: Date.now() }]);
        setOrderItem({ ...orderItem, quantity: 1, remarks: '' }); // Reset quantity/remarks but keep selection
        toast.success('Added to cart');
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
            {/* Mobile Header */}
            <div className="bg-white shadow p-4 sticky top-0 z-50 flex justify-between items-center">
                <h1 className="text-xl font-bold text-indigo-700">Z-on Door</h1>
                <div className="flex gap-3 text-sm">
                    <span>{user?.name}</span>
                    <button onClick={logout} className="text-red-500 font-bold">Exit</button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-2 my-4 px-4">
                <button onClick={() => setActiveTab('new-order')} className={`flex-1 py-3 rounded-xl font-bold text-sm shadow-sm transition-all ${activeTab === 'new-order' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500'}`}>
                    New Order
                </button>
                <button onClick={() => setActiveTab('my-orders')} className={`flex-1 py-3 rounded-xl font-bold text-sm shadow-sm transition-all ${activeTab === 'my-orders' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500'}`}>
                    History
                </button>
                <button onClick={() => setActiveTab('whatsnew')} className={`flex-1 py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-1 ${activeTab === 'whatsnew' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500'}`}>
                    <Bell size={14} /> News
                </button>
            </div>

            {activeTab === 'new-order' && (
                <div className="px-4 max-w-lg mx-auto">
                    {/* Step 1: Door Type */}
                    <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
                        <label className="text-xs font-bold text-gray-400 uppercase">1. Select Material</label>
                        <div className="flex gap-2 mt-2">
                            {doors.map(d => (
                                <button key={d.id}
                                    onClick={() => setOrderItem({ ...orderItem, doorTypeId: d.id, designId: '', colorId: '' })}
                                    className={`flex-1 py-3 rounded-lg border-2 font-bold ${orderItem.doorTypeId == d.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100'}`}
                                >
                                    {d.name} <span className="text-xs block font-normal text-gray-500">{d.thickness}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: Design */}
                    {orderItem.doorTypeId && (
                        <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
                            <label className="text-xs font-bold text-gray-400 uppercase">2. Select Design</label>
                            <div className="grid grid-cols-2 gap-3 mt-2 max-h-80 overflow-y-auto">
                                {filteredDesigns.map(d => (
                                    <div key={d.id}
                                        onClick={() => setOrderItem({ ...orderItem, designId: d.id, colorId: '' })}
                                        className={`rounded-xl overflow-hidden cursor-pointer transition-all shadow-md hover:shadow-lg ${orderItem.designId == d.id ? 'ring-2 ring-indigo-600 ring-offset-2' : 'bg-white'}`}
                                    >
                                        {/* Portrait Door Image */}
                                        <div className="aspect-[3/4] bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center p-2">
                                            {d.imageUrl ? (
                                                <img src={getImageUrl(d.imageUrl)} className="max-h-full max-w-full object-contain drop-shadow-lg" alt={d.designNumber} />
                                            ) : (
                                                <div className="text-gray-300 text-2xl">🚪</div>
                                            )}
                                        </div>
                                        <div className="p-2 bg-white text-center">
                                            <div className="font-bold text-sm text-gray-800">Design {d.designNumber}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Color - All Colors Available for All Designs */}
                    {orderItem.designId && (
                        <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
                            <label className="text-xs font-bold text-gray-400 uppercase">3. Select Color</label>
                            <p className="text-xs text-gray-400 mb-2">All colors available for all designs</p>
                            <div className="grid grid-cols-5 gap-3 mt-2">
                                {allColors.map(c => (
                                    <div key={c.id}
                                        onClick={() => setOrderItem({ ...orderItem, colorId: c.id })}
                                        className={`cursor-pointer flex flex-col items-center transition-all ${orderItem.colorId == c.id ? 'scale-110' : 'hover:scale-105'}`}
                                    >
                                        {/* Round Color Circle */}
                                        <div className={`w-12 h-12 rounded-full shadow-md overflow-hidden border-4 ${orderItem.colorId == c.id ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-white'}`}>
                                            {c.imageUrl ? (
                                                <img src={getImageUrl(c.imageUrl)} className="w-full h-full object-cover" alt={c.name} />
                                            ) : (
                                                <div className="w-full h-full" style={{ backgroundColor: c.hexCode || '#ccc' }}></div>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-center font-bold leading-tight mt-1 truncate w-full">{c.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Size & Qty */}
                    {orderItem.colorId && (
                        <div className="bg-white p-4 rounded-xl shadow-sm mb-4 space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase">4. Dimensions</label>
                            <div className="flex gap-2">
                                <div>
                                    <label className="text-xs font-bold">Width</label>
                                    <input type="number" className="w-full border rounded-lg p-2" value={orderItem.width} onChange={e => setOrderItem({ ...orderItem, width: e.target.value })} placeholder='0"' />
                                </div>
                                <div>
                                    <label className="text-xs font-bold">Height</label>
                                    <input type="number" className="w-full border rounded-lg p-2" value={orderItem.height} onChange={e => setOrderItem({ ...orderItem, height: e.target.value })} placeholder='0"' />
                                </div>
                                <div>
                                    <label className="text-xs font-bold">Qty</label>
                                    <input type="number" className="w-full border rounded-lg p-2" value={orderItem.quantity} onChange={e => setOrderItem({ ...orderItem, quantity: e.target.value })} placeholder='1' />
                                </div>
                            </div>
                            <input type="text" className="w-full border rounded-lg p-2 text-sm" placeholder="Remarks (optional)" value={orderItem.remarks} onChange={e => setOrderItem({ ...orderItem, remarks: e.target.value })} />

                            <button onClick={addToCart} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg mt-2">
                                Add to Order List
                            </button>
                        </div>
                    )}

                    {/* Cart Preview */}
                    {cart.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm mb-8 border border-indigo-100">
                            <h3 className="font-bold text-lg mb-2">Current Order List ({cart.length})</h3>
                            {cart.map((item, i) => (
                                <div key={item.id} className="flex justify-between items-start text-sm border-b py-2 last:border-0">
                                    <div>
                                        <div className="font-bold">{item.designName} - {item.colorName}</div>
                                        <div className="text-gray-500">{item.width}" x {item.height}" | Qty: {item.quantity}</div>
                                    </div>
                                    <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-red-500 text-xs">Remove</button>
                                </div>
                            ))}
                            <button onClick={placeOrder} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg mt-4 animate-pulse">
                                Confirm & Place Order
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'my-orders' && (
                <div className="px-4 max-w-lg mx-auto space-y-4">
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
    );
}
