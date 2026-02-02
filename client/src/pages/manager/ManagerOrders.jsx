import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Search, Package, Ruler, Calendar, ChevronDown, ChevronUp, MapPin, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManagerOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await api.get('/orders');
            setOrders(res.data);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const toggleOrder = (orderId) => {
        setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
    };

    const filteredOrders = orders.filter(o =>
        o.id.toString().includes(searchTerm) ||
        o.User?.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.User?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Package className="text-indigo-600" /> Order Registry
                </h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search Order ID or Shop..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-100 w-64 transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-400 font-bold animate-pulse">Loading Registry...</div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Order ID</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Dealer / Shop</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Items</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredOrders.length > 0 ? filteredOrders.map(order => {
                                const isExpanded = expandedOrderId === order.id;
                                return (
                                    <React.Fragment key={order.id}>
                                        <tr
                                            onClick={() => toggleOrder(order.id)}
                                            className={`cursor-pointer transition-all border-b border-slate-50 ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="p-4 font-black text-slate-700">#{order.id}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800">{order.User?.shopName}</div>
                                                <div className="text-xs text-slate-400 font-bold">{order.User?.name}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold">
                                                    {order.OrderItems?.length} Doors
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs font-bold text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <StatusBadge status={order.status} />
                                            </td>
                                            <td className="p-4 text-right">
                                                {isExpanded ? <ChevronUp size={20} className="text-indigo-600 inline" /> : <ChevronDown size={20} className="text-slate-300 inline" />}
                                            </td>
                                        </tr>

                                        {/* EXPANDED DETAILS ROW */}
                                        {isExpanded && (
                                            <tr className="bg-indigo-50/30 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <td colSpan="6" className="p-0">
                                                    <div className="p-6 space-y-6 border-b border-indigo-100">
                                                        {/* HEADER INFO */}
                                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-4 bg-white rounded-xl border border-indigo-100/50 shadow-sm">
                                                            <div className="flex gap-4">
                                                                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                                                                    <MapPin size={24} />
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Delivery To</div>
                                                                    <div className="font-bold text-slate-900">{order.User?.shopName}, {order.User?.city}</div>
                                                                    <div className="text-xs text-slate-500 font-medium mt-1">Order placed on {new Date(order.createdAt).toLocaleString()}</div>
                                                                </div>
                                                            </div>
                                                            <div className="px-4 py-2 bg-slate-100 rounded-lg">
                                                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Total Qty: </span>
                                                                <span className="font-black text-slate-800 text-lg">{order.OrderItems?.reduce((sum, item) => sum + item.quantity, 0)} Units</span>
                                                            </div>
                                                        </div>

                                                        {/* ITEMS GRID */}
                                                        <div>
                                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <Ruler size={14} /> Measurements Manifest
                                                            </h4>
                                                            <div className="overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
                                                                <table className="w-full text-left">
                                                                    <thead className="bg-slate-50 border-b border-slate-200">
                                                                        <tr>
                                                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Image</th>
                                                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Design Details</th>
                                                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dimensions</th>
                                                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Remarks</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {order.OrderItems?.map((item, i) => (
                                                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                                                <td className="px-4 py-2">
                                                                                    <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                                                                        {item.designImageSnapshot ? (
                                                                                            <img src={item.designImageSnapshot} alt="Img" className="w-full h-full object-cover" />
                                                                                        ) : (
                                                                                            <div className="flex items-center justify-center w-full h-full text-[8px] font-bold text-slate-300">N/A</div>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-2">
                                                                                    <div className="text-sm font-bold text-slate-900">{item.designNameSnapshot}</div>
                                                                                    <div className="text-xs text-slate-500">{item.colorNameSnapshot}</div>
                                                                                </td>
                                                                                <td className="px-4 py-2">
                                                                                    <span className="font-black text-indigo-600 text-sm">
                                                                                        {item.width}" <span className="text-slate-300 mx-1">×</span> {item.height}"
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-2">
                                                                                    <span className="font-bold text-slate-800 text-sm">{item.quantity}</span>
                                                                                </td>
                                                                                <td className="px-4 py-2 text-xs text-slate-500 italic max-w-[200px] truncate">
                                                                                    {item.remarks || '-'}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="6" className="p-10 text-center text-slate-400 font-bold italic">
                                        No orders found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const styles = {
        RECEIVED: 'bg-yellow-100 text-yellow-700',
        PRODUCTION: 'bg-indigo-100 text-indigo-700',
        READY: 'bg-green-100 text-green-700',
        DISPATCHED: 'bg-slate-100 text-slate-600',
        CANCELLED: 'bg-red-50 text-red-500'
    };
    return (
        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${styles[status] || styles.DISPATCHED}`}>
            {status}
        </span>
    );
}
