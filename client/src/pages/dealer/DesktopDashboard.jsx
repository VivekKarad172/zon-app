import { ShoppingCart, Clock, Bell, Users, CheckCircle, X, Plus, Trash2, LogOut, User, Lock, Wind, MessageSquare, PlusCircle, RefreshCw, Search } from 'lucide-react';

/**
 * Desktop-optimized Dealer Dashboard
 * Features: Side navigation, split panel layout, data tables
 */
export default function DesktopDealerDashboard({
    user, logout, navigate,
    activeTab, setActiveTab,
    doors, designs, filteredDesigns, allColors,
    orderSelection, setOrderSelection,
    sizeRows, addRow, removeRow, updateRow, addAllToCart, addBulkRows,
    cart, setCart, placeOrder,
    myOrders, cancelOrder,
    groupBy, setGroupBy, groupedOrders, // New Props
    posts,
    getImageUrl,
    searchQuery, setSearchQuery, handleReorder // New Features
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
                                <section className="mb-4">
                                    {!orderSelection.doorTypeId ? (
                                        // EXPANDED Step 1
                                        <div className="animate-in fade-in slide-in-from-top-4">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Step 1: Select Material</h3>
                                            <div className="grid grid-cols-3 gap-3">
                                                {doors.map(d => (
                                                    <button
                                                        key={d.id}
                                                        onClick={() => setOrderSelection({ doorTypeId: d.id, designId: '', colorId: '' })}
                                                        className="p-4 rounded-xl text-left bg-white hover:bg-gray-50 shadow-sm border border-transparent hover:border-indigo-100 transition-all flex items-center gap-3 group"
                                                    >
                                                        <span className="text-2xl group-hover:scale-110 transition-transform">🚪</span>
                                                        <div>
                                                            <div className="font-bold text-gray-800">{d.name}</div>
                                                            <div className="text-xs text-gray-400">{d.thickness}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        // COLLAPSED Step 1
                                        <div onClick={() => setOrderSelection({ ...orderSelection, doorTypeId: '', designId: '', colorId: '' })} className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 p-3 rounded-xl cursor-pointer hover:bg-indigo-100 transition-all">
                                            <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">1</div>
                                            <div className="flex-1">
                                                <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Material</div>
                                                <div className="font-black text-indigo-900">{doors.find(d => d.id == orderSelection.doorTypeId)?.name}</div>
                                            </div>
                                            <div className="text-indigo-400 text-xs font-bold uppercase px-3">Change</div>
                                        </div>
                                    )}
                                </section>

                                {/* Step 2: Design */}
                                {orderSelection.doorTypeId && (
                                    <section className="mb-4">
                                        {!orderSelection.designId ? (
                                            // EXPANDED Step 2
                                            <div className="animate-in fade-in slide-in-from-top-4">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Step 2: Select Design</h3>
                                                    <div className="relative">
                                                        <Search size={14} className="absolute left-2 top-2 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search Design..."
                                                            className="pl-7 pr-3 py-1.5 text-xs font-bold border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-40"
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-5 md:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                                                    {filteredDesigns.map(d => (
                                                        <div
                                                            key={d.id}
                                                            onClick={() => setOrderSelection({ ...orderSelection, designId: d.id, colorId: '' })}
                                                            className="rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all ring-1 ring-gray-100 hover:ring-indigo-300 relative group"
                                                        >
                                                            <div className="aspect-[3/4] bg-gray-100 relative">
                                                                {d.imageUrl ? (
                                                                    <img src={getImageUrl(d.imageUrl)} className="w-full h-full object-cover" alt={d.designNumber} />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">🚪</div>
                                                                )}
                                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                                                                    <div className="text-white font-bold text-xs text-center">{d.designNumber}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            // COLLAPSED Step 2
                                            <div onClick={() => setOrderSelection({ ...orderSelection, designId: '', colorId: '' })} className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 p-3 rounded-xl cursor-pointer hover:bg-indigo-100 transition-all">
                                                <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">2</div>
                                                <div className="w-10 h-10 rounded-lg bg-white overflow-hidden shadow-sm">
                                                    <img src={getImageUrl(designs.find(d => d.id == orderSelection.designId)?.imageUrl)} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Design</div>
                                                    <div className="font-black text-indigo-900">{designs.find(d => d.id == orderSelection.designId)?.designNumber}</div>
                                                </div>
                                                <div className="text-indigo-400 text-xs font-bold uppercase px-3">Change</div>
                                            </div>
                                        )}
                                    </section>
                                )}

                                {/* Step 3: Foil Color */}
                                {orderSelection.designId && (
                                    <section className="mb-6">
                                        {!orderSelection.colorId ? (
                                            // EXPANDED Step 3
                                            <div className="animate-in fade-in slide-in-from-top-4">
                                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Step 3: Select Foil Color</h3>
                                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                                    <div className="flex flex-wrap gap-4">
                                                        {allColors.map(c => (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => setOrderSelection({ ...orderSelection, colorId: c.id })}
                                                                className="flex flex-col items-center cursor-pointer group w-16"
                                                            >
                                                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-transparent group-hover:border-indigo-400 group-hover:scale-105 transition-all shadow-sm">
                                                                    {c.imageUrl ? (
                                                                        <img src={getImageUrl(c.imageUrl)} className="w-full h-full object-cover" alt={c.name} />
                                                                    ) : (
                                                                        <div className="w-full h-full" style={{ backgroundColor: c.hexCode || '#eee' }} />
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] font-bold mt-1 text-center text-gray-600 line-clamp-1 group-hover:text-indigo-600">
                                                                    {c.name}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            // COLLAPSED Step 3
                                            <div onClick={() => setOrderSelection({ ...orderSelection, colorId: '' })} className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 p-3 rounded-xl cursor-pointer hover:bg-indigo-100 transition-all">
                                                <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">3</div>
                                                <div className="w-10 h-10 rounded-full bg-white overflow-hidden shadow-sm border border-gray-100">
                                                    <img src={getImageUrl(allColors.find(c => c.id == orderSelection.colorId)?.imageUrl)} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Color</div>
                                                    <div className="font-black text-indigo-900">{allColors.find(c => c.id == orderSelection.colorId)?.name}</div>
                                                </div>
                                                <div className="text-indigo-400 text-xs font-bold uppercase px-3">Change</div>
                                            </div>
                                        )}
                                    </section>
                                )}

                                {/* Step 4: Quick Add Sizes */}
                                {orderSelection.colorId && (
                                    <section className="animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Step 4: Add Sizes</label>
                                            <div className="flex gap-2">
                                                <button onClick={() => addBulkRows(5)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-all">
                                                    +5 Rows
                                                </button>
                                                <button onClick={() => addBulkRows(10)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-all">
                                                    +10 Rows
                                                </button>
                                                <button onClick={addRow} className="text-sm font-bold text-white bg-indigo-600 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md">
                                                    <Plus size={16} /> Add 1 Row
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
                                            {/* Table Header */}
                                            <div className="grid grid-cols-12 gap-2 mb-3 text-[10px] font-black text-gray-400 uppercase tracking-wider px-2 text-center">
                                                <span className="col-span-3 text-left">Width</span>
                                                <span className="col-span-3 text-left">Height</span>
                                                <span className="col-span-1">Lock</span>
                                                <span className="col-span-1">Vent</span>
                                                <span className="col-span-1">Note</span>
                                                <span className="col-span-2">Qty</span>
                                                <span className="col-span-1"></span>
                                            </div>
                                            {/* Rows */}
                                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                {sizeRows.map(row => (
                                                    <div key={row.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50/50 hover:bg-white p-2 rounded-xl border border-transparent hover:border-gray-200 transition-all group">
                                                        <input type="number" placeholder="W" className="col-span-3 bg-white border border-gray-200 rounded-lg p-2 text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={row.width} onChange={e => updateRow(row.id, 'width', e.target.value)} />
                                                        <input type="number" placeholder="H" className="col-span-3 bg-white border border-gray-200 rounded-lg p-2 text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={row.height} onChange={e => updateRow(row.id, 'height', e.target.value)} />

                                                        {/* Lock Toggle */}
                                                        <button
                                                            onClick={() => updateRow(row.id, 'hasLock', !row.hasLock)}
                                                            className={`col-span-1 flex justify-center items-center h-9 rounded-lg transition-all ${row.hasLock ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'}`}
                                                            title="Add Lock Cut"
                                                        >
                                                            <Lock size={16} strokeWidth={row.hasLock ? 2.5 : 2} />
                                                        </button>

                                                        {/* Vent Toggle */}
                                                        <button
                                                            onClick={() => updateRow(row.id, 'hasVent', !row.hasVent)}
                                                            className={`col-span-1 flex justify-center items-center h-9 rounded-lg transition-all ${row.hasVent ? 'bg-cyan-100 text-cyan-600 border border-cyan-200' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'}`}
                                                            title="Add Ventilation"
                                                        >
                                                            <Wind size={16} strokeWidth={row.hasVent ? 2.5 : 2} />
                                                        </button>

                                                        {/* Remarks (Popover or inline input?) let's use small input visible on hover, or just an icon that toggles input? 
                                                            User said "remrk button on every door just beside that delete buttoun or in between delete and quantity"
                                                            Let's make it a small input that expands or just a button that verifies content.
                                                            Actually, putting a small text input is better for speed. 
                                                            Or a button that turns green if remark exists.
                                                            I'll use a small button that toggles a text input or modal? No, slow.
                                                            I'll use a small input field in the grid.
                                                        */}
                                                        <div className="col-span-1 relative group/remark">
                                                            <input
                                                                type="text"
                                                                className={`w-full h-9 rounded-lg border text-xs px-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${row.remarks ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200 text-transparent focus:text-gray-900 placeholder-transparent focus:placeholder-gray-400'}`}
                                                                placeholder="Note"
                                                                value={row.remarks}
                                                                onChange={e => updateRow(row.id, 'remarks', e.target.value)}
                                                                title={row.remarks || "Add Remark"}
                                                            />
                                                            <div className={`pointer-events-none absolute inset-0 flex items-center justify-center text-gray-300 ${row.remarks ? 'hidden' : ''}`}>
                                                                <MessageSquare size={16} />
                                                            </div>
                                                        </div>

                                                        <input type="number" min="1" className="col-span-2 bg-white border border-gray-200 rounded-lg p-2 text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={row.quantity} onChange={e => updateRow(row.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} />

                                                        <button onClick={() => removeRow(row.id)} disabled={sizeRows.length <= 1} className={`col-span-1 h-9 flex items-center justify-center rounded-lg transition-all ${sizeRows.length > 1 ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-gray-200 cursor-not-allowed'}`}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Summary */}
                                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                                <div className="text-sm font-bold text-gray-500">
                                                    {sizeRows.filter(r => r.width && r.height).length} valid item(s) • Total Quantity: {sizeRows.reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0)}
                                                </div>
                                                <button onClick={addAllToCart} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95">
                                                    <ShoppingCart size={20} /> Add to Cart
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
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-3xl font-black text-gray-900">Order History</h1>

                            {/* Group By Control */}
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border shadow-sm">
                                <span className="text-xs font-bold text-gray-400 uppercase">Group By:</span>
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value)}
                                    className="font-bold text-indigo-700 bg-transparent outline-none cursor-pointer"
                                >
                                    <option value="order">Order Number</option>
                                    <option value="design">Design</option>
                                    <option value="color">Foil Color</option>
                                </select>
                            </div>
                        </div>
                        <p className="text-gray-500 mb-8">Track your orders and view past purchases</p>

                        {groupedOrders.length === 0 ? (
                            <div className="text-center text-gray-400 py-16 bg-white rounded-2xl shadow">
                                <Clock size={48} className="mx-auto mb-4 opacity-30" />
                                <p>No records found</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {groupedOrders.map((item, idx) => {
                                    if (groupBy === 'order') {
                                        const statusSteps = ['Received', 'Production', 'Ready', 'Dispatched'];
                                        const currentStep = ['RECEIVED', 'PRODUCTION', 'READY', 'DISPATCHED'].indexOf(item.status);
                                        const statusColors = {
                                            RECEIVED: 'bg-yellow-100 text-yellow-700',
                                            PRODUCTION: 'bg-blue-100 text-blue-700',
                                            READY: 'bg-green-100 text-green-700',
                                            DISPATCHED: 'bg-purple-100 text-purple-700',
                                            CANCELLED: 'bg-red-100 text-red-700'
                                        };
                                        return (
                                            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Order #{item.id}</div>
                                                        <div className="text-sm text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</div>
                                                    </div>
                                                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${statusColors[item.status] || 'bg-gray-100'}`}>
                                                        {item.status}
                                                    </span>
                                                </div>

                                                {/* Progress Bar */}
                                                {item.status !== 'CANCELLED' && (
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

                                                {/* Cancel / Reorder Buttons */}
                                                <div className="flex gap-2 mb-4">
                                                    {item.status === 'RECEIVED' && (
                                                        <button onClick={() => cancelOrder(item.id)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 py-2 rounded-lg text-sm font-bold transition-all">
                                                            ❌ Cancel
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleReorder(item)} className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2">
                                                        <RefreshCw size={14} /> Re-Order
                                                    </button>
                                                </div>

                                                {/* Items */}
                                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                                    {item.OrderItems?.map((orderItem, i) => (
                                                        <div key={i} className="flex gap-3 bg-gray-50 p-3 rounded-lg">
                                                            <div className="w-12 h-12 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                                                                {orderItem.designImageSnapshot && <img src={getImageUrl(orderItem.designImageSnapshot)} className="w-full h-full object-cover" />}
                                                            </div>
                                                            <div className="text-sm">
                                                                <div className="font-bold text-gray-900">{orderItem.designNameSnapshot} - {orderItem.colorNameSnapshot}</div>
                                                                <div className="text-gray-500 text-xs">{orderItem.width}" × {orderItem.height}" | Qty: {orderItem.quantity}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        // GROUPED CARD (Design/Color)
                                        return (
                                            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-4">
                                                        {item.items[0]?.designImageSnapshot && (
                                                            <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shadow-sm">
                                                                <img src={getImageUrl(item.items[0].designImageSnapshot)} className="w-full h-full object-cover" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h3 className="text-xl font-black text-gray-900">{item.name}</h3>
                                                            <div className="flex gap-2 mt-1">
                                                                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">{item.ordersCount} Orders</span>
                                                                <span className="text-gray-400 text-xs flex items-center">Last: {new Date(item.lastDate).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-3xl font-black text-indigo-600">{item.totalItems}</div>
                                                        <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Total Units</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
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
