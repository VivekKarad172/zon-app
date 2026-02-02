import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { TrendingUp, Package, Palette, BarChart3, Calendar, Download, RefreshCw, Trophy, Flame, Wind, Snowflake } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsDashboard() {
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState('30');
    const [popularSizes, setPopularSizes] = useState([]);
    const [designTrends, setDesignTrends] = useState([]);
    const [colorTrends, setColorTrends] = useState([]);
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            console.log('[ANALYTICS] Fetching data for date range:', dateRange);

            const [sizesRes, designsRes, colorsRes, summaryRes] = await Promise.all([
                api.get(`/analytics/popular-sizes?days=${dateRange}&limit=10`),
                api.get(`/analytics/design-trends?days=${dateRange}&limit=10`),
                api.get(`/analytics/color-trends?days=${dateRange}&limit=10`),
                api.get(`/analytics/sales-summary?days=${dateRange}`)
            ]);

            console.log('[ANALYTICS] Sizes response:', sizesRes.data);
            console.log('[ANALYTICS] Designs response:', designsRes.data);
            console.log('[ANALYTICS] Colors response:', colorsRes.data);
            console.log('[ANALYTICS] Summary response:', summaryRes.data);

            setPopularSizes(sizesRes.data.data || []);
            setDesignTrends(designsRes.data.data || []);
            setColorTrends(colorsRes.data.data || []);
            setSummary(summaryRes.data.summary || {});

            console.log('[ANALYTICS] Data loaded successfully');
        } catch (error) {
            console.error('[ANALYTICS] Full error:', error);
            console.error('[ANALYTICS] Error response:', error.response?.data);
            console.error('[ANALYTICS] Error status:', error.response?.status);
            toast.error(`Failed to load analytics: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        // Popular Sizes Sheet
        const sizesSheet = XLSX.utils.json_to_sheet(popularSizes.map(item => ({
            'Rank': item.rank,
            'Size': item.size,
            'Total Ordered': item.totalOrdered,
            'Orders': item.orderCount,
            'Popularity': item.popularity.toUpperCase()
        })));
        XLSX.utils.book_append_sheet(wb, sizesSheet, 'Popular Sizes');

        // Design Trends Sheet
        const designsSheet = XLSX.utils.json_to_sheet(designTrends.map(item => ({
            'Rank': item.rank,
            'Design Number': item.designNumber,
            'Category': item.category,
            'Total Ordered': item.totalOrdered,
            'Orders': item.orderCount
        })));
        XLSX.utils.book_append_sheet(wb, designsSheet, 'Design Trends');

        // Color Trends Sheet
        const colorsSheet = XLSX.utils.json_to_sheet(colorTrends.map(item => ({
            'Rank': item.rank,
            'Color Name': item.colorName,
            'Total Ordered': item.totalOrdered,
            'Orders': item.orderCount
        })));
        XLSX.utils.book_append_sheet(wb, colorsSheet, 'Color Trends');

        XLSX.writeFile(wb, `Analytics_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success('Report exported successfully!');
    };

    const getPopularityIcon = (popularity) => {
        switch (popularity) {
            case 'hot': return <Flame size={16} className="text-red-500" />;
            case 'warm': return <Wind size={16} className="text-orange-500" />;
            case 'cool': return <Snowflake size={16} className="text-blue-500" />;
            default: return null;
        }
    };

    const getPopularityBadge = (popularity) => {
        const styles = {
            hot: 'bg-red-50 text-red-700 border border-red-200',
            warm: 'bg-orange-50 text-orange-700 border border-orange-200',
            cool: 'bg-blue-50 text-blue-700 border border-blue-200'
        };
        return styles[popularity] || 'bg-gray-50 text-gray-700';
    };

    const CHART_COLORS = ['#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff', '#eef2ff'];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 rounded-[2.5rem] shadow-xl text-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2">📊 Sales Analytics</h2>
                        <p className="text-indigo-100 font-bold text-sm">Track trends, popular sizes, and stock insights</p>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                        {/* Date Range Filter */}
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-white/30 cursor-pointer"
                        >
                            <option value="7" className="text-gray-900">Last 7 days</option>
                            <option value="30" className="text-gray-900">Last 30 days</option>
                            <option value="90" className="text-gray-900">Last 90 days</option>
                            <option value="all" className="text-gray-900">All Time</option>
                        </select>

                        <button
                            onClick={fetchAnalytics}
                            disabled={loading}
                            className="bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold rounded-xl px-4 py-2.5 hover:bg-white/20 transition-all disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>

                        <button
                            onClick={exportToExcel}
                            className="bg-white text-indigo-600 font-bold rounded-xl px-4 py-2.5 hover:bg-indigo-50 transition-all shadow-lg flex items-center gap-2"
                        >
                            <Download size={18} />
                            <span className="text-sm">Export</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <Package className="text-indigo-600" size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-gray-900">{summary.totalOrders || 0}</div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Orders</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                                <Trophy className="text-purple-600" size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-gray-900">{summary.totalUnits || 0}</div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Doors Ordered</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 md:col-span-2">
                        {summary.topDealer ? (
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                                    <TrendingUp className="text-green-600" size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Top Dealer</div>
                                    <div className="font-black text-gray-900">{summary.topDealer.name}</div>
                                    <div className="text-xs text-gray-500">{summary.topDealer.shopName} • {summary.topDealer.totalOrdered} doors</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 py-2">No dealer data</div>
                        )}
                    </div>
                </div>
            )}

            {/* Popular Sizes Chart */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <BarChart3 className="text-indigo-600" />
                            Most Popular Door Sizes
                        </h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Ordered by total quantity</p>
                    </div>
                </div>

                {popularSizes.length > 0 ? (
                    <>
                        <div className="h-80 mb-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={popularSizes}>
                                    <defs>
                                        <linearGradient id="sizeBar" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="size" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                                    <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="totalOrdered" fill="url(#sizeBar)" radius={[10, 10, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Size Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Rank</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Size</th>
                                        <th className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Total Ordered</th>
                                        <th className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Orders</th>
                                        <th className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Trend</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {popularSizes.map((item) => (
                                        <tr key={item.rank} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-black text-sm">
                                                    {item.rank}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-black text-gray-900">{item.size}</td>
                                            <td className="px-6 py-4 text-center font-bold text-gray-700">{item.totalOrdered}</td>
                                            <td className="px-6 py-4 text-center font-bold text-gray-500">{item.orderCount}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getPopularityBadge(item.popularity)}`}>
                                                    {getPopularityIcon(item.popularity)}
                                                    {item.popularity.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-gray-400">No size data available</div>
                )}
            </div>

            {/* Design & Color Trends Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Design Trends */}
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8">
                    <h3 className="text-xl font-black text-gray-900 mb-1 flex items-center gap-2">
                        <Palette className="text-purple-600" />
                        Top Designs
                    </h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-6">Most ordered patterns</p>

                    {designTrends.length > 0 ? (
                        <div className="space-y-3">
                            {designTrends.map((item) => (
                                <div key={item.rank} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50/50 transition-colors">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-black text-sm flex items-center justify-center">
                                        {item.rank}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-gray-900">{item.designNumber}</div>
                                        <div className="text-xs text-gray-500 font-bold">{item.category}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-gray-900">{item.totalOrdered}</div>
                                        <div className="text-xs text-gray-400">doors</div>
                                    </div>
                                    <div>
                                        {getPopularityIcon(item.popularity)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">No design data</div>
                    )}
                </div>

                {/* Color Trends */}
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8">
                    <h3 className="text-xl font-black text-gray-900 mb-1 flex items-center gap-2">
                        <Palette className="text-pink-600" />
                        Top Colors
                    </h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-6">Most ordered foils</p>

                    {colorTrends.length > 0 ? (
                        <div className="space-y-3">
                            {colorTrends.map((item) => (
                                <div key={item.rank} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-pink-50/50 transition-colors">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-100 text-pink-600 font-black text-sm flex items-center justify-center">
                                        {item.rank}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-gray-900 truncate">{item.colorName}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-gray-900">{item.totalOrdered}</div>
                                        <div className="text-xs text-gray-400">doors</div>
                                    </div>
                                    <div>
                                        {getPopularityIcon(item.popularity)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">No color data</div>
                    )}
                </div>
            </div>
        </div>
    );
}
