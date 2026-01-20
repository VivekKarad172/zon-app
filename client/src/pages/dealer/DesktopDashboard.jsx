import { ShoppingCart, Clock, Bell, Users, CheckCircle, X, Plus, Trash2, LogOut, User } from 'lucide-react';

/**
 * Desktop-optimized Dealer Dashboard
 * Features: Side navigation, split panel layout, data tables
 */
export default function DesktopDealerDashboard({
    user, logout, navigate,
    activeTab, setActiveTab,
    doors, designs, filteredDesigns, allColors,
    orderSelection, setOrderSelection,
    sizeRows, addRow, removeRow, updateRow, addAllToCart,
    cart, setCart, placeOrder,
    myOrders, cancelOrder,
    posts,
    getImageUrl
}) {
    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Left Sidebar Navigation */}
            <div className="w-64 bg-gradient-to-b from-indigo-900 to-purple-900 text-white flex flex-col fixed h-full">
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-3 rounded-xl">
                            <span className="font-black text-2xl">Z</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight">Z-ON DOOR</h1>
                            <span className="text-xs opacity-60 uppercase tracking-widest">Dealer Portal</span>
                        </div>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setActiveTab('new-order')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'new-order' ? 'bg-white/20 text-white font-bold' : 'text-white/60 hover:bg-white/10'}`}
                    >
                        <ShoppingCart size={20} />
                        <span>New Order</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('my-orders')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'my-orders' ? 'bg-white/20 text-white font-bold' : 'text-white/60 hover:bg-white/10'}`}
                    >
                        <Clock size={20} />
                        <span>Order History</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('whatsnew')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'whatsnew' ? 'bg-white/20 text-white font-bold' : 'text-white/60 hover:bg-white/10'}`}
                    >
                        <Bell size={20} />
                        <span>What's New</span>
                    </button>
                </nav>

                {/* User Info */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <User size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold truncate">{user?.name}</div>
                            <div className="text-xs text-white/50 truncate">{user?.shopName}</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => navigate('/profile')} className="flex-1 bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm transition-all">
                            Profile
                        </button>
                        <button onClick={logout} className="flex-1 bg-red-500/30 hover:bg-red-500/50 py-2 rounded-lg text-sm text-red-200 transition-all">
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 ml-64">
                {/* NEW ORDER TAB */}
                {activeTab === 'new-order' && (
                    <div className="flex h-screen">
                        {/* Left: Order Form */}
                        <div className="flex-1 p-8 overflow-y-auto">
                            <div className="max-w-3xl">
                                <h1 className="text-3xl font-black text-gray-900 mb-2">Create New Order</h1>
                                <p className="text-gray-500 mb-8">Select material, design, color, then add sizes</p>

                                {/* Step 1: Material */}
                                <section className="mb-8">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 block">Step 1: Select Material</label>
                                    <div className="grid grid-cols-3 gap-4">
                                        {doors.map(d => (
                                            <button
                                                key={d.id}
                                                onClick={() => setOrderSelection({ doorTypeId: d.id, designId: '', colorId: '' })}
                                                className={`p-6 rounded-2xl text-left transition-all ${orderSelection.doorTypeId == d.id
                                                    ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]'
                                                    : 'bg-white hover:bg-gray-50 shadow-md'
                                                    }`}
                                            >
                                                <span className="text-3xl mb-2 block">🚪</span>
                                                <div className="font-bold text-lg">{d.name}</div>
                                                <div className={`text-sm ${orderSelection.doorTypeId == d.id ? 'text-indigo-200' : 'text-gray-400'}`}>{d.thickness}</div>
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                {/* Step 2: Design */}
                                {orderSelection.doorTypeId && (
                                    <section className="mb-8 animate-in fade-in duration-300">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 block">Step 2: Select Design</label>
                                        <div className="grid grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pb-2">
                                            {filteredDesigns.map(d => (
                                                <div
                                                    key={d.id}
                                                    onClick={() => setOrderSelection({ ...orderSelection, designId: d.id, colorId: '' })}
                                                    className={`rounded-2xl overflow-hidden cursor-pointer transition-all ${orderSelection.designId == d.id ? 'ring-4 ring-indigo-500 shadow-xl' : 'shadow-md hover:shadow-lg'}`}
                                                >
                                                    <div className="aspect-[3/4] bg-gray-100 relative">
                                                        {d.imageUrl ? (
                                                            <img src={getImageUrl(d.imageUrl)} className="w-full h-full object-cover" alt={d.designNumber} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🚪</div>
                                                        )}
                                                        {orderSelection.designId == d.id && (
                                                            <div className="absolute inset-0 bg-indigo-900/50 flex items-center justify-center">
                                                                <CheckCircle size={40} className="text-white" />
                                                            </div>
                                                        )}
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-3">
                                                            <div className="text-white font-bold">{d.designNumber}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Step 3: Foil Color */}
                                {orderSelection.designId && (
                                    <section className="mb-8 animate-in fade-in duration-300">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 block">Step 3: Select Foil Color</label>
                                        <div className="bg-white p-6 rounded-2xl shadow-md">
                                            <div className="grid grid-cols-8 gap-4">
                                                {allColors.map(c => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => setOrderSelection({ ...orderSelection, colorId: c.id })}
                                                        className="flex flex-col items-center cursor-pointer group"
                                                    >
                                                        <div className={`w-14 h-14 rounded-full overflow-hidden border-4 transition-all ${orderSelection.colorId == c.id ? 'border-indigo-600 scale-110 ring-4 ring-indigo-100' : 'border-transparent group-hover:scale-105'}`}>
                                                            {c.imageUrl ? (
                                                                <img src={getImageUrl(c.imageUrl)} className="w-full h-full object-cover" alt={c.name} />
                                                            ) : (
                                                                <div className="w-full h-full" style={{ backgroundColor: c.hexCode || '#eee' }} />
                                                            )}
                                                        </div>
                                                        <span className={`text-xs font-bold mt-2 text-center ${orderSelection.colorId == c.id ? 'text-indigo-600' : 'text-gray-500'}`}>
                                                            {c.name}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* Step 4: Quick Add Sizes */}
                                {orderSelection.colorId && (
                                    <section className="animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Step 4: Add Sizes</label>
                                            <button onClick={addRow} className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-100 transition-all">
                                                <Plus size={16} /> Add Row
                                            </button>
                                        </div>
                                        <div className="bg-white p-6 rounded-2xl shadow-md">
                                            {/* Table Header */}
                                            <div className="grid grid-cols-9 gap-4 mb-3 text-xs font-bold text-gray-400 uppercase px-2">
                                                <span className="col-span-3">Width (inch)</span>
                                                <span className="col-span-3">Height (inch)</span>
                                                <span className="col-span-2">Quantity</span>
                                                <span className="col-span-1"></span>
                                            </div>
                                            {/* Rows */}
                                            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                                {sizeRows.map(row => (
                                                    <div key={row.id} className="grid grid-cols-9 gap-4 items-center bg-gray-50 p-3 rounded-xl">
                                                        <input type="number" placeholder="Width" className="col-span-3 bg-white border border-gray-200 rounded-xl p-3 text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none" value={row.width} onChange={e => updateRow(row.id, 'width', e.target.value)} />
                                                        <input type="number" placeholder="Height" className="col-span-3 bg-white border border-gray-200 rounded-xl p-3 text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none" value={row.height} onChange={e => updateRow(row.id, 'height', e.target.value)} />
                                                        <input type="number" min="1" className="col-span-2 bg-white border border-gray-200 rounded-xl p-3 text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none" value={row.quantity} onChange={e => updateRow(row.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                                                        <button onClick={() => removeRow(row.id)} disabled={sizeRows.length <= 1} className={`col-span-1 p-2 rounded-lg transition-all ${sizeRows.length > 1 ? 'text-red-500 hover:bg-red-50' : 'text-gray-300'}`}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Summary */}
                                            <div className="mt-4 pt-4 border-t">
                                                <div className="text-sm text-gray-500 mb-3">
                                                    {sizeRows.filter(r => r.width && r.height).length} valid size(s) ready to add
                                                </div>
                                                <button onClick={addAllToCart} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                                                    <ShoppingCart size={20} /> Add All to Cart
                                                </button>
                                            </div>
                                        </div>
                                    </section>
                                )}
                            </div>
                        </div>

                        {/* Right: Cart Sidebar */}
                        <div className="w-96 bg-white border-l shadow-xl p-6 overflow-y-auto">
                            <div className="sticky top-0 bg-white pb-4 border-b mb-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black flex items-center gap-2">
                                        <ShoppingCart className="text-indigo-600" /> Cart
                                    </h2>
                                    {cart.length > 0 && (
                                        <button onClick={() => setCart([])} className="text-red-500 text-sm hover:underline">Clear All</button>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">{cart.length} item(s)</div>
                            </div>

                            {cart.length === 0 ? (
                                <div className="text-center text-gray-400 py-12">
                                    <ShoppingCart size={48} className="mx-auto mb-4 opacity-30" />
                                    <p>Your cart is empty</p>
                                    <p className="text-xs mt-1">Add items to get started</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3 mb-6">
                                        {cart.map(item => (
                                            <div key={item.id} className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl">
                                                <div className="w-14 h-14 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                                                    {item.designImage && <img src={getImageUrl(item.designImage)} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm truncate">{item.designName}</div>
                                                    <div className="text-xs text-gray-500">{item.colorName} • {item.thickness}</div>
                                                    <div className="text-xs text-indigo-600 font-bold mt-1">
                                                        {item.width}" × {item.height}" | Qty: {item.quantity}
                                                    </div>
                                                </div>
                                                <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-red-400 hover:text-red-600 p-1">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <button onClick={placeOrder} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                                        ✓ Confirm & Place Order
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* MY ORDERS TAB */}
                {activeTab === 'my-orders' && (
                    <div className="p-8">
                        <h1 className="text-3xl font-black text-gray-900 mb-2">Order History</h1>
                        <p className="text-gray-500 mb-8">Track your orders and view past purchases</p>

                        {myOrders.length === 0 ? (
                            <div className="text-center text-gray-400 py-16 bg-white rounded-2xl shadow">
                                <Clock size={48} className="mx-auto mb-4 opacity-30" />
                                <p>No orders yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-6">
                                {myOrders.map(order => {
                                    const statusSteps = ['RECEIVED', 'PRODUCTION', 'READY', 'DISPATCHED'];
                                    const currentStep = statusSteps.indexOf(order.status);
                                    const statusColors = {
                                        RECEIVED: 'bg-yellow-100 text-yellow-700',
                                        PRODUCTION: 'bg-blue-100 text-blue-700',
                                        READY: 'bg-green-100 text-green-700',
                                        DISPATCHED: 'bg-purple-100 text-purple-700',
                                        CANCELLED: 'bg-red-100 text-red-700'
                                    };
                                    return (
                                        <div key={order.id} className="bg-white rounded-2xl shadow-lg p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="text-xl font-bold text-gray-900">Order #{order.id}</div>
                                                    <div className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                                                </div>
                                                <span className={`text-sm font-bold px-3 py-1 rounded-full ${statusColors[order.status] || 'bg-gray-100'}`}>
                                                    {order.status}
                                                </span>
                                            </div>

                                            {/* Progress Bar */}
                                            {order.status !== 'CANCELLED' && (
                                                <div className="grid grid-cols-4 gap-2 mb-4">
                                                    {statusSteps.map((step, idx) => (
                                                        <div key={step} className="text-center">
                                                            <div className={`h-2 rounded-full ${idx <= currentStep ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                                                            <div className={`text-xs mt-1 ${idx <= currentStep ? 'text-gray-700 font-medium' : 'text-gray-300'}`}>
                                                                {step}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Cancel Button */}
                                            {order.status === 'RECEIVED' && (
                                                <button onClick={() => cancelOrder(order.id)} className="w-full bg-red-100 hover:bg-red-200 text-red-600 py-2 rounded-lg text-sm font-bold mb-4 transition-all">
                                                    ❌ Cancel Order
                                                </button>
                                            )}

                                            {/* Items */}
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {order.OrderItems?.map((item, i) => (
                                                    <div key={i} className="flex gap-3 bg-gray-50 p-3 rounded-lg">
                                                        <div className="w-12 h-12 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                                                            {item.designImageSnapshot && <img src={getImageUrl(item.designImageSnapshot)} className="w-full h-full object-cover" />}
                                                        </div>
                                                        <div className="text-sm">
                                                            <div className="font-bold">{item.designNameSnapshot} - {item.colorNameSnapshot}</div>
                                                            <div className="text-gray-500">{item.width}" × {item.height}" | Qty: {item.quantity}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* WHAT'S NEW TAB */}
                {activeTab === 'whatsnew' && (
                    <div className="p-8">
                        <h1 className="text-3xl font-black text-gray-900 mb-2">What's New</h1>
                        <p className="text-gray-500 mb-8">Latest updates, new designs, and announcements</p>

                        {posts.length === 0 ? (
                            <div className="text-center text-gray-400 py-16 bg-white rounded-2xl shadow">
                                <Bell size={48} className="mx-auto mb-4 opacity-30" />
                                <p>No updates yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-6">
                                {posts.map(post => (
                                    <div key={post.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                                        {post.imageUrl && (
                                            <div className="h-48 bg-gray-100">
                                                <img src={getImageUrl(post.imageUrl)} className="w-full h-full object-cover" alt="Post" />
                                            </div>
                                        )}
                                        <div className="p-5">
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${post.postType === 'announcement' ? 'bg-blue-100 text-blue-700' : post.postType === 'new_design' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {post.postType === 'announcement' ? '📢' : post.postType === 'new_design' ? '🚪' : '🎉'} {post.postType.replace('_', ' ')}
                                            </span>
                                            {post.title && <h3 className="font-bold text-lg text-gray-800 mt-3">{post.title}</h3>}
                                            <p className="text-gray-600 mt-2 text-sm line-clamp-3">{post.content}</p>
                                            <div className="text-xs text-gray-400 mt-3">{new Date(post.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
