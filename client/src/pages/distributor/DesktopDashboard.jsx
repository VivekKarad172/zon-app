import { Bell, ShoppingBag, Users, Clock, CheckCircle, Upload, X, FileSpreadsheet, User, LogOut, Plus, Edit2, Trash2, Search } from 'lucide-react';

/**
 * Desktop-optimized Distributor Dashboard
 * Features: Sidebar navigation, data tables, multi-column layout
 */
export default function DesktopDistributorDashboard({
    user, logout, navigate,
    activeTab, setActiveTab,
    orders, filteredOrders, orderFilter, setOrderFilter,
    groupBy, setGroupBy, groupedOrders, // New props
    dealers, posts,
    updateStatus, handleExportOrders,
    showAddDealer, setShowAddDealer, newDealer, setNewDealer, handleAddDealer,
    isEditingDealer, openEditDealer, handleDeleteDealer, showDeleteConfirm, setShowDeleteConfirm,
    showBulkUpload, setShowBulkUpload, handleFileUpload, downloadSample,
    pendingCount, completedCount, getStatusBadge, getImageUrl
}) {
    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Left Sidebar */}
            <div className="w-64 bg-gradient-to-b from-blue-800 to-indigo-900 text-white flex flex-col fixed h-full">
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-3 rounded-xl">
                            <span className="font-black text-2xl">Z</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black">Z-ON DOOR</h1>
                            <span className="text-xs opacity-60 uppercase">Distributor</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'orders' ? 'bg-white/20 font-bold' : 'text-white/60 hover:bg-white/10'}`}>
                        <ShoppingBag size={20} />
                        <span>Orders</span>
                        {pendingCount > 0 && <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>}
                    </button>
                    <button onClick={() => setActiveTab('dealers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'dealers' ? 'bg-white/20 font-bold' : 'text-white/60 hover:bg-white/10'}`}>
                        <Users size={20} />
                        <span>Dealers</span>
                        <span className="ml-auto text-xs opacity-60">{dealers.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('whatsnew')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'whatsnew' ? 'bg-white/20 font-bold' : 'text-white/60 hover:bg-white/10'}`}>
                        <Bell size={20} />
                        <span>What's New</span>
                    </button>
                </nav>

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
                        <button onClick={() => navigate('/profile')} className="flex-1 bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm transition-all">Profile</button>
                        <button onClick={logout} className="flex-1 bg-red-500/30 hover:bg-red-500/50 py-2 rounded-lg text-sm text-red-200 transition-all">Logout</button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 ml-64 p-8">
                {/* ORDERS TAB */}
                {activeTab === 'orders' && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900">Orders</h1>
                                <p className="text-gray-500">Manage and track all dealer orders</p>
                            </div>
                            <button onClick={handleExportOrders} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
                                <FileSpreadsheet size={18} /> Export Excel
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-6 mb-8">
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <div className="text-3xl font-black text-gray-900">{orders.length}</div>
                                <div className="text-sm text-gray-500 font-bold">Total Orders</div>
                            </div>
                            <div className="bg-orange-50 rounded-2xl p-6 shadow-sm">
                                <div className="text-3xl font-black text-orange-600">{pendingCount}</div>
                                <div className="text-sm text-orange-600 font-bold">Pending</div>
                            </div>
                            <div className="bg-green-50 rounded-2xl p-6 shadow-sm">
                                <div className="text-3xl font-black text-green-600">{completedCount}</div>
                                <div className="text-sm text-green-600 font-bold">Completed</div>
                            </div>
                            <div className="bg-indigo-50 rounded-2xl p-6 shadow-sm">
                                <div className="text-3xl font-black text-indigo-600">{dealers.length}</div>
                                <div className="text-sm text-indigo-600 font-bold">Active Dealers</div>
                            </div>
                        </div>

                        {/* Filter & Grouping */}
                        <div className="flex gap-4 mb-6">
                            <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)} className="bg-white border rounded-xl px-4 py-2 font-bold focus:ring-2 focus:ring-indigo-100 outline-none">
                                <option value="all">All Orders</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                            </select>

                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border shadow-sm">
                                <span className="text-xs font-bold text-gray-400 uppercase">Group By:</span>
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value)}
                                    className="font-bold text-indigo-700 bg-transparent outline-none cursor-pointer"
                                >
                                    <option value="order">Order Number</option>
                                    <option value="dealer">Dealer</option>
                                    <option value="design">Design</option>
                                    <option value="color">Foil Color</option>
                                </select>
                            </div>
                        </div>

                        {/* Orders Table */}
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="text-left p-4 font-bold text-sm text-gray-600">
                                            {groupBy === 'order' ? 'Order' : groupBy === 'dealer' ? 'Dealer' : groupBy === 'design' ? 'Design' : 'Color'}
                                        </th>
                                        {groupBy === 'order' && <th className="text-left p-4 font-bold text-sm text-gray-600">Dealer</th>}
                                        <th className="text-left p-4 font-bold text-sm text-gray-600">
                                            {groupBy === 'dealer' ? 'Summary' : groupBy === 'order' ? 'Items' : 'Quantity'}
                                        </th>
                                        {groupBy === 'order' && <th className="text-left p-4 font-bold text-sm text-gray-600">Date</th>}
                                        {groupBy === 'order' && <th className="text-left p-4 font-bold text-sm text-gray-600">Status</th>}
                                        {groupBy === 'order' && <th className="text-left p-4 font-bold text-sm text-gray-600">Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedOrders.length === 0 && (
                                        <tr><td colSpan="6" className="text-center py-12 text-gray-400">No records found</td></tr>
                                    )}

                                    {groupedOrders.map((row, idx) => (
                                        <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                                            {groupBy === 'order' ? (
                                                // STANDARD ORDER ROW
                                                <>
                                                    <td className="p-4 font-bold text-gray-900">#{row.id}</td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-gray-900">{row.User?.name}</div>
                                                        <div className="text-xs text-gray-500">{row.User?.shopName || row.User?.city}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-1">
                                                            {row.OrderItems?.slice(0, 3).map((item, i) => (
                                                                <div key={i} className="w-8 h-8 rounded bg-gray-100 overflow-hidden">
                                                                    {item.designImageSnapshot && <img src={getImageUrl(item.designImageSnapshot)} className="w-full h-full object-cover" />}
                                                                </div>
                                                            ))}
                                                            {row.OrderItems?.length > 3 && (
                                                                <span className="text-xs text-gray-500 ml-1">+{row.OrderItems.length - 3}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600">{new Date(row.createdAt).toLocaleDateString()}</td>
                                                    <td className="p-4">{getStatusBadge(row.status)}</td>
                                                    <td className="p-4">
                                                        {row.status !== 'DISPATCHED' && row.status !== 'CANCELLED' ? (
                                                            <select
                                                                value={row.status}
                                                                onChange={e => updateStatus(row.id, e.target.value)}
                                                                className="bg-gray-50 border rounded-lg px-3 py-2 text-sm font-bold"
                                                            >
                                                                <option value="RECEIVED">📥 Received</option>
                                                                <option value="PRODUCTION">🔧 Production</option>
                                                                <option value="READY">✅ Ready</option>
                                                                <option value="DISPATCHED">🚚 Dispatched</option>
                                                            </select>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">—</span>
                                                        )}
                                                    </td>
                                                </>
                                            ) : (
                                                // GROUPED ROW (Dealer, Design, Color)
                                                <>
                                                    <td className="p-4">
                                                        <div className="font-bold text-gray-900 text-lg">{row.name}</div>
                                                        {groupBy === 'dealer' && (
                                                            <div className="text-xs text-gray-500">{row.dealer?.shopName || row.dealer?.city}</div>
                                                        )}
                                                    </td>

                                                    <td className="p-4">
                                                        {groupBy === 'dealer' ? (
                                                            <div className="flex gap-4">
                                                                <div className="bg-indigo-50 px-3 py-1 rounded-lg">
                                                                    <span className="block text-xs font-bold text-indigo-400 uppercase">Orders</span>
                                                                    <span className="font-black text-indigo-700">{row.totalOrders}</span>
                                                                </div>
                                                                <div className="bg-purple-50 px-3 py-1 rounded-lg">
                                                                    <span className="block text-xs font-bold text-purple-400 uppercase">Total Items</span>
                                                                    <span className="font-black text-purple-700">{row.totalItems}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="font-bold text-gray-700 text-xl">{row.totalItems} <span className="text-sm font-normal text-gray-400">units</span></div>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* DEALERS TAB */}
                {activeTab === 'dealers' && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900">My Dealers</h1>
                                <p className="text-gray-500">Manage your dealer network</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowBulkUpload(true)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
                                    <Upload size={18} /> Bulk Upload
                                </button>
                                <button
                                    onClick={() => { setNewDealer({ name: '', email: '', city: '', shopName: '' }); setShowAddDealer(true); }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
                                >
                                    <Plus size={18} /> Add Dealer
                                </button>
                            </div>
                        </div>

                        {/* Dealers Grid */}
                        {dealers.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-2xl shadow">
                                <Users size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-400">No dealers yet. Add your first dealer!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-6">
                                {dealers.map(dealer => (
                                    <div key={dealer.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="text-xl font-bold text-gray-900">{dealer.name}</div>
                                                <div className="text-sm text-gray-500">{dealer.email}</div>
                                            </div>
                                            <div className={`text-xs font-bold px-2 py-1 rounded-full ${dealer.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {dealer.isEnabled ? '✓ Active' : '✗ Disabled'}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-600 mb-4">
                                            {[dealer.shopName, dealer.city].filter(Boolean).join(' • ') || 'No location info'}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditDealer(dealer)} className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-all">
                                                <Edit2 size={14} /> Edit
                                            </button>
                                            <button onClick={() => setShowDeleteConfirm(dealer.id)} className="flex-1 bg-red-50 hover:bg-red-100 py-2 rounded-lg text-sm font-bold text-red-600 flex items-center justify-center gap-1 transition-all">
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* WHAT'S NEW TAB */}
                {activeTab === 'whatsnew' && (
                    <div className="animate-in fade-in duration-300">
                        <h1 className="text-3xl font-black text-gray-900 mb-2">What's New</h1>
                        <p className="text-gray-500 mb-8">Updates, announcements, and new designs</p>

                        {posts.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-2xl shadow">
                                <Bell size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-400">No updates yet</p>
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
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${post.postType === 'announcement' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {post.postType === 'announcement' ? '📢' : '🚪'} {post.postType.replace('_', ' ')}
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

            {/* Modals */}
            {showAddDealer && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black">{isEditingDealer ? 'Edit Dealer' : 'Add New Dealer'}</h3>
                            <button onClick={() => setShowAddDealer(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddDealer} className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-gray-600 block mb-1">Name</label>
                                <input type="text" required className="w-full border rounded-xl p-3" value={newDealer.name} onChange={e => setNewDealer({ ...newDealer, name: e.target.value })} />
                            </div>
                            {!isEditingDealer && (
                                <div>
                                    <label className="text-sm font-bold text-gray-600 block mb-1">Email (Google Login)</label>
                                    <input type="email" required className="w-full border rounded-xl p-3" value={newDealer.email} onChange={e => setNewDealer({ ...newDealer, email: e.target.value })} />
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-bold text-gray-600 block mb-1">City</label>
                                <input type="text" className="w-full border rounded-xl p-3" value={newDealer.city} onChange={e => setNewDealer({ ...newDealer, city: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-600 block mb-1">Shop Name</label>
                                <input type="text" className="w-full border rounded-xl p-3" value={newDealer.shopName} onChange={e => setNewDealer({ ...newDealer, shopName: e.target.value })} />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all">
                                {isEditingDealer ? 'Update Dealer' : 'Add Dealer'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h3 className="text-xl font-bold mb-2">Delete Dealer?</h3>
                        <p className="text-gray-500 mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition-all">Cancel</button>
                            <button onClick={() => handleDeleteDealer(showDeleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {showBulkUpload && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black">Bulk Upload Dealers</h3>
                            <button onClick={() => setShowBulkUpload(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
                                <div>
                                    <div className="font-bold">Step 1: Download Sample</div>
                                    <div className="text-sm text-gray-500">Get the correct Excel format</div>
                                </div>
                                <button onClick={downloadSample} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all">
                                    <FileSpreadsheet size={16} /> Download
                                </button>
                            </div>
                            <div className="bg-indigo-50 rounded-xl p-4">
                                <div className="font-bold text-indigo-700 mb-2">Step 2: Upload Your File</div>
                                <label className="block w-full bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-8 text-center cursor-pointer transition-all">
                                    <Upload size={32} className="mx-auto text-indigo-400 mb-2" />
                                    <span className="font-bold text-indigo-600">Click to select Excel file</span>
                                    <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
