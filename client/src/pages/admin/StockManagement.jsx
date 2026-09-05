import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Package, Plus, RefreshCw, History, AlertTriangle, TrendingDown } from 'lucide-react';

export default function StockManagement() {
    const [sheets, setSheets] = useState([]);
    const [stockHistory, setStockHistory] = useState([]);
    const [showAddStockModal, setShowAddStockModal] = useState(false);
    const [selectedSheet, setSelectedSheet] = useState(null);
    const [addStockForm, setAddStockForm] = useState({ quantity: '', description: '' });
    const [showHistory, setShowHistory] = useState(false);
    const [loading, setLoading] = useState(true);
    const [materialFilter, setMaterialFilter] = useState('ALL'); // 'ALL', 'PVC', 'WPC'

    useEffect(() => {
        fetchSheets();
    }, []);

    const fetchSheets = async () => {
        try {
            setLoading(true);
            const res = await api.get('/sheets');
            setSheets(res.data);
        } catch (error) {
            console.error('Error fetching sheets:', error);
            toast.error('Failed to load stock data');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/sheets/history/all?limit=50');
            setStockHistory(res.data);
            setShowHistory(true);
        } catch (error) {
            console.error('Error fetching history:', error);
            toast.error('Failed to load history');
        }
    };

    const handleAddStock = async () => {
        if (!selectedSheet || !addStockForm.quantity) {
            toast.error('Please enter quantity');
            return;
        }

        try {
            await api.post('/sheets/stock', {
                sheetId: selectedSheet.id,
                quantity: parseInt(addStockForm.quantity),
                description: addStockForm.description || 'Stock purchase'
            });

            toast.success('Stock added successfully!');
            setShowAddStockModal(false);
            setAddStockForm({ quantity: '', description: '' });
            setSelectedSheet(null);
            fetchSheets();
        } catch (error) {
            console.error('Error adding stock:', error);
            toast.error('Failed to add stock');
        }
    };

    const filteredSheets = materialFilter === 'ALL'
        ? sheets
        : sheets.filter(s => s.materialType === materialFilter);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Sheet Inventory Management</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                        Track Stock Levels & Orders
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchSheets}
                        className="bg-white hover:bg-gray-50 text-red-600 px-4 py-2.5 rounded-xl font-bold shadow-sm border border-red-100 flex items-center gap-2 text-xs transition-all active:scale-95"
                    >
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button
                        onClick={fetchHistory}
                        className="bg-white hover:bg-gray-50 text-red-600 px-4 py-2.5 rounded-xl font-bold shadow-sm border border-red-100 flex items-center gap-2 text-xs transition-all active:scale-95"
                    >
                        <History size={16} /> History
                    </button>
                </div>
            </div>

            {/* Material Filter */}
            <div className="flex gap-2">
                {['ALL', 'PVC', 'WPC'].map(type => (
                    <button
                        key={type}
                        onClick={() => setMaterialFilter(type)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${materialFilter === type
                            ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-red-300'
                            }`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-red-50 to-rose-50 border-b-2 border-red-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                                    Sheet Size
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                                    Material
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-black text-gray-700 uppercase tracking-wider">
                                    Current Stock
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-black text-gray-700 uppercase tracking-wider">
                                    Min Stock
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-black text-gray-700 uppercase tracking-wider">
                                    Orders Received
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-black text-gray-700 uppercase tracking-wider">
                                    Blocked Sheets
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-black text-gray-700 uppercase tracking-wider">
                                    Available
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-black text-gray-700 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-black text-gray-700 uppercase tracking-wider">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredSheets.map((sheet, idx) => {
                                const isLow = sheet.currentStock <= sheet.minStock;
                                const ordersReceived = sheet.ordersReceived || 0;
                                const blockedSheets = sheet.blockedSheets || 0;

                                return (
                                    <tr
                                        key={sheet.id}
                                        className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-black text-gray-900">
                                                {sheet.width} × {sheet.height}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black ${sheet.materialType === 'PVC'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-green-100 text-green-700'
                                                }`}>
                                                {sheet.materialType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-lg font-black text-red-600">
                                                {sheet.currentStock}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-sm font-bold text-gray-500">
                                                {sheet.minStock}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-sm font-bold text-red-600">
                                                {ordersReceived}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-sm font-bold text-orange-600">
                                                {blockedSheets}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={`text-lg font-black ${sheet.availableStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {sheet.availableStock ?? sheet.currentStock}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isLow ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-black">
                                                    <AlertTriangle size={12} />
                                                    LOW
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-black">
                                                    ✓ GOOD
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => {
                                                    setSelectedSheet(sheet);
                                                    setShowAddStockModal(true);
                                                }}
                                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1 mx-auto transition-all active:scale-95 shadow-sm"
                                            >
                                                <Plus size={14} /> Add
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredSheets.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <Package size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold">No sheets found</p>
                    </div>
                )}
            </div>

            {/* Add Stock Modal */}
            {showAddStockModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-black text-gray-900 mb-4">
                            Add Stock: {selectedSheet?.width} × {selectedSheet?.height} ({selectedSheet?.materialType})
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Quantity</label>
                                <input
                                    type="number"
                                    value={addStockForm.quantity}
                                    onChange={(e) => setAddStockForm({ ...addStockForm, quantity: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                                    placeholder="Enter quantity"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Description (Optional)</label>
                                <input
                                    type="text"
                                    value={addStockForm.description}
                                    onChange={(e) => setAddStockForm({ ...addStockForm, description: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                                    placeholder="e.g., Purchase from supplier"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleAddStock}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-black shadow-lg shadow-red-200 transition-all active:scale-95"
                                >
                                    Add Stock
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddStockModal(false);
                                        setAddStockForm({ quantity: '', description: '' });
                                        setSelectedSheet(null);
                                    }}
                                    className="px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 font-bold transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-900">Stock Transaction History</h3>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-3">
                                {stockHistory.map((record, idx) => (
                                    <div key={idx} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-gray-900">
                                                {record.SheetMaster?.width} × {record.SheetMaster?.height} ({record.SheetMaster?.materialType})
                                            </div>
                                            <div className="text-sm text-gray-500">{record.description}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {new Date(record.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className={`text-lg font-black ${record.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {record.change > 0 ? '+' : ''}{record.change}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
