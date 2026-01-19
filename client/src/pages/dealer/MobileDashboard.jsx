import { ShoppingCart, Clock, Bell, Users, CheckCircle, X, Plus, Trash2, Home, Menu } from 'lucide-react';

/**
 * Mobile-optimized Dealer Dashboard
 * Features: Bottom navigation, full-width cards, large touch targets
 */
export default function MobileDealerDashboard({
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
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Compact Mobile Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-purple-800 shadow-xl p-4 sticky top-0 z-[100] border-b border-white/10">
                <div className="flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <span className="font-black text-lg">Z</span>
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-tight">Z-ON DOOR</h1>
                            <span className="text-[10px] opacity-70 uppercase">Dealer</span>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => navigate('/profile')} className="bg-white/20 p-2 rounded-full">
                            <Users size={16} />
                        </button>
                        <button onClick={logout} className="text-red-200 text-xs bg-red-500/30 px-2 py-1 rounded-full">Exit</button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-4 pt-4">
                {/* NEW ORDER TAB */}
                {activeTab === 'new-order' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Welcome Card */}
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
                            <h2 className="text-xl font-bold">New Order</h2>
                            <p className="text-blue-100 text-sm">Select material → design → color → sizes</p>
                        </div>

                        {/* Step 1: Material */}
                        <section>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">1. Material</label>
                            <div className="grid grid-cols-2 gap-3">
                                {doors.map(d => (
                                    <button
                                        key={d.id}
                                        onClick={() => setOrderSelection({ doorTypeId: d.id, designId: '', colorId: '' })}
                                        className={`p-4 rounded-xl text-left transition-all ${orderSelection.doorTypeId == d.id
                                            ? 'bg-indigo-600 text-white shadow-lg scale-[1.02]'
                                            : 'bg-white shadow-sm'
                                            }`}
                                    >
                                        <span className="text-xl mb-1 block">🚪</span>
                                        <div className="font-bold text-sm">{d.name}</div>
                                        <div className={`text-xs ${orderSelection.doorTypeId == d.id ? 'text-indigo-200' : 'text-gray-400'}`}>{d.thickness}</div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Step 2: Design */}
                        {orderSelection.doorTypeId && (
                            <section className="animate-in fade-in duration-300">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">2. Design</label>
                                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pb-2">
                                    {filteredDesigns.map(d => (
                                        <div
                                            key={d.id}
                                            onClick={() => setOrderSelection({ ...orderSelection, designId: d.id, colorId: '' })}
                                            className={`rounded-xl overflow-hidden cursor-pointer transition-all ${orderSelection.designId == d.id ? 'ring-4 ring-indigo-500 shadow-lg' : 'shadow-sm'}`}
                                        >
                                            <div className="aspect-[3/4] bg-gray-100 relative">
                                                {d.imageUrl ? (
                                                    <img src={getImageUrl(d.imageUrl)} className="w-full h-full object-cover" alt={d.designNumber} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">🚪</div>
                                                )}
                                                {orderSelection.designId == d.id && (
                                                    <div className="absolute inset-0 bg-indigo-900/40 flex items-center justify-center">
                                                        <CheckCircle size={32} className="text-white" />
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-2">
                                                    <div className="text-white font-bold text-sm">{d.designNumber}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Step 3: Foil Color */}
                        {orderSelection.designId && (
                            <section className="animate-in fade-in duration-300">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">3. Foil Color</label>
                                <div className="bg-white p-4 rounded-xl shadow-sm">
                                    <div className="grid grid-cols-5 gap-3">
                                        {allColors.map(c => (
                                            <div
                                                key={c.id}
                                                onClick={() => setOrderSelection({ ...orderSelection, colorId: c.id })}
                                                className="flex flex-col items-center cursor-pointer"
                                            >
                                                <div className={`w-12 h-12 rounded-full overflow-hidden border-3 transition-all ${orderSelection.colorId == c.id ? 'border-indigo-600 scale-110 ring-2 ring-indigo-200' : 'border-transparent'}`}>
                                                    {c.imageUrl ? (
                                                        <img src={getImageUrl(c.imageUrl)} className="w-full h-full object-cover" alt={c.name} />
                                                    ) : (
                                                        <div className="w-full h-full" style={{ backgroundColor: c.hexCode || '#eee' }} />
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-bold mt-1 text-center ${orderSelection.colorId == c.id ? 'text-indigo-600' : 'text-gray-500'}`}>
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
                            <section className="animate-in fade-in duration-300 pb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">4. Sizes</label>
                                    <button onClick={addRow} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full flex items-center gap-1">
                                        <Plus size={14} /> Add Row
                                    </button>
                                </div>
                                <div className="bg-white p-3 rounded-xl shadow-sm space-y-2">
                                    {/* Header */}
                                    <div className="grid grid-cols-12 gap-2 text-[9px] uppercase font-bold text-gray-400 px-1">
                                        <span className="col-span-3">Width</span>
                                        <span className="col-span-3">Height</span>
                                        <span className="col-span-3">Thick</span>
                                        <span className="col-span-2">Qty</span>
                                        <span className="col-span-1"></span>
                                    </div>
                                    {/* Rows */}
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {sizeRows.map(row => (
                                            <div key={row.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg">
                                                <input type="number" placeholder="W" className="col-span-3 bg-white border rounded-lg p-2 text-center text-sm font-bold" value={row.width} onChange={e => updateRow(row.id, 'width', e.target.value)} />
                                                <input type="number" placeholder="H" className="col-span-3 bg-white border rounded-lg p-2 text-center text-sm font-bold" value={row.height} onChange={e => updateRow(row.id, 'height', e.target.value)} />
                                                <select className="col-span-3 bg-white border rounded-lg p-2 text-xs font-bold" value={row.thickness} onChange={e => updateRow(row.id, 'thickness', e.target.value)}>
                                                    <option value="30mm">30mm</option>
                                                    <option value="32mm">32mm</option>
                                                    <option value="35mm">35mm</option>
                                                    <option value="Custom">Custom</option>
                                                </select>
                                                <input type="number" min="1" className="col-span-2 bg-white border rounded-lg p-2 text-center text-sm font-bold" value={row.quantity} onChange={e => updateRow(row.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                                                <button onClick={() => removeRow(row.id)} disabled={sizeRows.length <= 1} className={`col-span-1 p-1 ${sizeRows.length > 1 ? 'text-red-400' : 'text-gray-300'}`}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Add All Button */}
                                    <button onClick={addAllToCart} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl mt-3 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                                        <ShoppingCart size={20} /> Add All to Cart
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* Inline Cart Summary - NOT blocking the form */}
                        {cart.length > 0 && (
                            <div className="bg-gray-900 rounded-2xl shadow-lg p-4 text-white mt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart size={18} />
                                        <span className="font-bold">{cart.length} items in cart</span>
                                    </div>
                                    <button onClick={() => setCart([])} className="text-red-400 text-xs bg-red-500/20 px-2 py-1 rounded-full">Clear</button>
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-2 mb-3 border-t border-gray-700 pt-3">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex items-center gap-2 text-sm bg-gray-800 p-2 rounded-lg">
                                            <div className="w-10 h-10 rounded bg-gray-700 overflow-hidden flex-shrink-0">
                                                {item.designImage && <img src={getImageUrl(item.designImage)} className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold truncate">{item.designName} - {item.colorName}</div>
                                                <div className="text-xs text-gray-400">{item.width}×{item.height} | Qty: {item.quantity}</div>
                                            </div>
                                            <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-red-400 p-1">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={placeOrder} className="w-full bg-green-500 text-white font-bold py-4 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
                                    <CheckCircle size={20} /> Confirm & Place Order
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* MY ORDERS TAB */}
                {activeTab === 'my-orders' && (
                    <div className="space-y-4 animate-in fade-in duration-300 pb-4">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Clock className="text-indigo-600" /> Order History
                        </h2>
                        {myOrders.length === 0 && (
                            <div className="text-center text-gray-400 py-12 bg-white rounded-xl">No orders yet</div>
                        )}
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
                                <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="font-bold text-gray-900">Order #{order.id}</div>
                                            <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[order.status] || 'bg-gray-100'}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    {/* Progress Bar */}
                                    {order.status !== 'CANCELLED' && (
                                        <div className="grid grid-cols-4 gap-1 mb-3">
                                            {statusSteps.map((step, idx) => (
                                                <div key={step} className="text-center">
                                                    <div className={`h-1.5 rounded-full ${idx <= currentStep ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                                                    <div className={`text-[8px] mt-1 ${idx <= currentStep ? 'text-gray-700' : 'text-gray-300'}`}>
                                                        {step === 'RECEIVED' ? '📥' : step === 'PRODUCTION' ? '🔧' : step === 'READY' ? '✅' : '🚚'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Cancel Button */}
                                    {order.status === 'RECEIVED' && (
                                        <button onClick={() => cancelOrder(order.id)} className="w-full bg-red-100 text-red-600 py-2 rounded-lg text-sm font-bold mb-3">
                                            ❌ Cancel Order
                                        </button>
                                    )}
                                    {/* Items */}
                                    <div className="space-y-2">
                                        {order.OrderItems?.map((item, i) => (
                                            <div key={i} className="flex gap-2 bg-gray-50 p-2 rounded-lg">
                                                <div className="w-10 h-10 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                                                    {item.designImageSnapshot && <img src={getImageUrl(item.designImageSnapshot)} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="text-xs">
                                                    <div className="font-bold">{item.designNameSnapshot} - {item.colorNameSnapshot}</div>
                                                    <div className="text-gray-500">{item.width}x{item.height} | Qty: {item.quantity}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* WHAT'S NEW TAB */}
                {activeTab === 'whatsnew' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Bell className="text-indigo-600" /> What's New
                        </h2>
                        {posts.length === 0 && (
                            <div className="text-center text-gray-400 py-12 bg-white rounded-xl">No updates yet</div>
                        )}
                        {posts.map(post => (
                            <div key={post.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                                {post.imageUrl && (
                                    <div className="h-36 bg-gray-100">
                                        <img src={getImageUrl(post.imageUrl)} className="w-full h-full object-cover" alt="Post" />
                                    </div>
                                )}
                                <div className="p-4">
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${post.postType === 'announcement' ? 'bg-blue-100 text-blue-700' : post.postType === 'new_design' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {post.postType === 'announcement' ? '📢' : post.postType === 'new_design' ? '🚪' : '🎉'} {post.postType.replace('_', ' ')}
                                    </span>
                                    {post.title && <h3 className="font-bold text-gray-800 mt-2">{post.title}</h3>}
                                    <p className="text-gray-600 mt-1 text-sm whitespace-pre-wrap">{post.content}</p>
                                    <div className="text-xs text-gray-400 mt-2">{new Date(post.createdAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Fixed Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-xl z-[100]">
                <div className="flex justify-around py-2">
                    <button
                        onClick={() => setActiveTab('new-order')}
                        className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${activeTab === 'new-order' ? 'text-indigo-600' : 'text-gray-400'}`}
                    >
                        <ShoppingCart size={22} />
                        <span className="text-[10px] font-bold mt-1">Order</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('my-orders')}
                        className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${activeTab === 'my-orders' ? 'text-indigo-600' : 'text-gray-400'}`}
                    >
                        <Clock size={22} />
                        <span className="text-[10px] font-bold mt-1">History</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('whatsnew')}
                        className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${activeTab === 'whatsnew' ? 'text-indigo-600' : 'text-gray-400'}`}
                    >
                        <Bell size={22} />
                        <span className="text-[10px] font-bold mt-1">News</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
