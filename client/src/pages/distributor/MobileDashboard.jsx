import { Bell, ShoppingBag, Users, Clock, CheckCircle, Upload, X, FileSpreadsheet, User, LogOut, Plus, Edit2, Trash2 } from 'lucide-react';

/**
 * Mobile-optimized Distributor Dashboard
 * Features: Bottom navigation, card-based orders, touch-friendly
 */
export default function MobileDistributorDashboard({
    user, logout, navigate,
    activeTab, setActiveTab,
    orders, filteredOrders, orderFilter, setOrderFilter,
    dealers, posts,
    updateStatus, handleExportOrders,
    showAddDealer, setShowAddDealer, newDealer, setNewDealer, handleAddDealer,
    isEditingDealer, openEditDealer, handleDeleteDealer, showDeleteConfirm, setShowDeleteConfirm,
    showBulkUpload, setShowBulkUpload, handleFileUpload, downloadSample,
    pendingCount, completedCount, getStatusBadge, getImageUrl
}) {
    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Compact Mobile Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 shadow-lg p-4 sticky top-0 z-[100]">
                <div className="flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <span className="font-black text-lg">Z</span>
                        </div>
                        <div>
                            <h1 className="text-base font-bold">Z-ON DOOR</h1>
                            <span className="text-[10px] opacity-70 uppercase">Distributor</span>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => navigate('/profile')} className="bg-white/20 p-2 rounded-full">
                            <User size={16} />
                        </button>
                        <button onClick={logout} className="text-red-200 text-xs bg-red-500/30 px-2 py-1 rounded-full">Exit</button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 pt-4">
                {/* ORDERS TAB */}
                {activeTab === 'orders' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
                                <div className="text-2xl font-black text-gray-900">{orders.length}</div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Total</div>
                            </div>
                            <div className="bg-orange-50 rounded-xl p-3 shadow-sm text-center">
                                <div className="text-2xl font-black text-orange-600">{pendingCount}</div>
                                <div className="text-[10px] text-orange-600 uppercase font-bold">Pending</div>
                            </div>
                            <div className="bg-green-50 rounded-xl p-3 shadow-sm text-center">
                                <div className="text-2xl font-black text-green-600">{completedCount}</div>
                                <div className="text-[10px] text-green-600 uppercase font-bold">Done</div>
                            </div>
                        </div>

                        {/* Filter & Export */}
                        <div className="flex gap-2">
                            <select
                                value={orderFilter}
                                onChange={e => setOrderFilter(e.target.value)}
                                className="flex-1 bg-white border rounded-xl p-3 text-sm font-bold"
                            >
                                <option value="all">All Orders</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                            </select>
                            <button onClick={handleExportOrders} className="bg-green-600 text-white p-3 rounded-xl">
                                <FileSpreadsheet size={18} />
                            </button>
                        </div>

                        {/* Order Cards */}
                        <div className="space-y-3">
                            {filteredOrders.length === 0 && (
                                <div className="text-center text-gray-400 py-12 bg-white rounded-xl">No orders found</div>
                            )}
                            {filteredOrders.map(order => (
                                <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="font-bold text-gray-900">Order #{order.id}</div>
                                            <div className="text-xs text-gray-500">{order.User?.name} • {order.User?.shopName || order.User?.city}</div>
                                        </div>
                                        {getStatusBadge(order.status)}
                                    </div>

                                    <div className="text-xs text-gray-500 mb-3">
                                        {new Date(order.createdAt).toLocaleDateString()} • {order.OrderItems?.length || 0} items
                                    </div>

                                    {/* Items Preview */}
                                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                                        {order.OrderItems?.slice(0, 4).map((item, i) => (
                                            <div key={i} className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                                {item.designImageSnapshot && <img src={getImageUrl(item.designImageSnapshot)} className="w-full h-full object-cover" />}
                                            </div>
                                        ))}
                                        {order.OrderItems?.length > 4 && (
                                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                +{order.OrderItems.length - 4}
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Status Update */}
                                    {order.status !== 'DISPATCHED' && order.status !== 'CANCELLED' && (
                                        <select
                                            className="w-full bg-gray-50 border rounded-lg p-2 text-sm font-bold"
                                            value={order.status}
                                            onChange={e => updateStatus(order.id, e.target.value)}
                                        >
                                            <option value="RECEIVED">📥 Received</option>
                                            <option value="PRODUCTION">🔧 Production</option>
                                            <option value="READY">✅ Ready</option>
                                            <option value="DISPATCHED">🚚 Dispatched</option>
                                        </select>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* DEALERS TAB */}
                {activeTab === 'dealers' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">My Dealers ({dealers.length})</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setShowBulkUpload(true)} className="bg-gray-100 p-2 rounded-lg">
                                    <Upload size={18} className="text-gray-600" />
                                </button>
                                <button
                                    onClick={() => { setNewDealer({ name: '', email: '', city: '', shopName: '' }); setShowAddDealer(true); }}
                                    className="bg-indigo-600 text-white p-2 rounded-lg"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>

                        {dealers.length === 0 && (
                            <div className="text-center text-gray-400 py-12 bg-white rounded-xl">No dealers yet</div>
                        )}

                        <div className="space-y-3">
                            {dealers.map(dealer => (
                                <div key={dealer.id} className="bg-white rounded-xl shadow-sm p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-gray-900">{dealer.name}</div>
                                            <div className="text-xs text-gray-500">{dealer.email}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {[dealer.shopName, dealer.city].filter(Boolean).join(' • ')}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditDealer(dealer)} className="p-2 bg-gray-100 rounded-lg">
                                                <Edit2 size={14} className="text-gray-600" />
                                            </button>
                                            <button onClick={() => setShowDeleteConfirm(dealer.id)} className="p-2 bg-red-50 rounded-lg">
                                                <Trash2 size={14} className="text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-full inline-block ${dealer.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {dealer.isEnabled ? '✓ Active' : '✗ Disabled'}
                                    </div>
                                </div>
                            ))}
                        </div>
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
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${post.postType === 'announcement' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {post.postType === 'announcement' ? '📢' : '🚪'} {post.postType.replace('_', ' ')}
                                    </span>
                                    {post.title && <h3 className="font-bold text-gray-800 mt-2">{post.title}</h3>}
                                    <p className="text-gray-600 mt-1 text-sm">{post.content}</p>
                                    <div className="text-xs text-gray-400 mt-2">{new Date(post.createdAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-xl z-[100]">
                <div className="flex justify-around py-2">
                    <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'orders' ? 'text-indigo-600' : 'text-gray-400'}`}>
                        <ShoppingBag size={22} />
                        <span className="text-[10px] font-bold mt-1">Orders</span>
                    </button>
                    <button onClick={() => setActiveTab('dealers')} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'dealers' ? 'text-indigo-600' : 'text-gray-400'}`}>
                        <Users size={22} />
                        <span className="text-[10px] font-bold mt-1">Dealers</span>
                    </button>
                    <button onClick={() => setActiveTab('whatsnew')} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'whatsnew' ? 'text-indigo-600' : 'text-gray-400'}`}>
                        <Bell size={22} />
                        <span className="text-[10px] font-bold mt-1">News</span>
                    </button>
                </div>
            </div>

            {/* Add/Edit Dealer Modal */}
            {showAddDealer && (
                <div className="fixed inset-0 bg-black/60 flex items-end z-[200] animate-in fade-in">
                    <div className="bg-white rounded-t-3xl w-full p-6 animate-in slide-in-from-bottom">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">{isEditingDealer ? 'Edit Dealer' : 'Add New Dealer'}</h3>
                            <button onClick={() => setShowAddDealer(false)} className="p-2"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddDealer} className="space-y-4">
                            <input type="text" placeholder="Name" required className="w-full border rounded-xl p-3" value={newDealer.name} onChange={e => setNewDealer({ ...newDealer, name: e.target.value })} />
                            {!isEditingDealer && <input type="email" placeholder="Email (Google login)" required className="w-full border rounded-xl p-3" value={newDealer.email} onChange={e => setNewDealer({ ...newDealer, email: e.target.value })} />}
                            <input type="text" placeholder="City" className="w-full border rounded-xl p-3" value={newDealer.city} onChange={e => setNewDealer({ ...newDealer, city: e.target.value })} />
                            <input type="text" placeholder="Shop Name" className="w-full border rounded-xl p-3" value={newDealer.shopName} onChange={e => setNewDealer({ ...newDealer, shopName: e.target.value })} />
                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl">
                                {isEditingDealer ? 'Update Dealer' : 'Add Dealer'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h3 className="text-lg font-bold mb-2">Delete Dealer?</h3>
                        <p className="text-gray-500 text-sm mb-4">This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold">Cancel</button>
                            <button onClick={() => handleDeleteDealer(showDeleteConfirm)} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkUpload && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Bulk Upload Dealers</h3>
                            <button onClick={() => setShowBulkUpload(false)}><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <button onClick={downloadSample} className="w-full bg-gray-100 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                <FileSpreadsheet size={16} /> Download Sample
                            </button>
                            <label className="block w-full bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-xl p-6 text-center cursor-pointer">
                                <Upload size={24} className="mx-auto text-indigo-400 mb-2" />
                                <span className="text-sm font-bold text-indigo-600">Click to upload Excel</span>
                                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
