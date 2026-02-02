import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Calculator, Download, RefreshCw, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function MaterialAnalysis() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const res = await api.get('/orders/analytics/materials');
            setData(res.data);
            setLoading(false);
            setError(null);
        } catch (e) {
            console.error(e);
            setError(e.response?.data?.error || 'Failed to load analysis');
            setLoading(false);
        }
    };

    // Calculate Total Sheets
    const totalSheets = data?.breakdown?.reduce((acc, mat) => {
        return acc + mat.sizes.reduce((sum, s) => sum + s.count, 0);
    }, 0) || 0;

    const handleExport = () => {
        if (!data) return;
        const wb = XLSX.utils.book_new();
        const wsData = [
            { A: 'TOTAL SHEETS REQUIRED', B: totalSheets },
            {},
            { A: 'Material Type', B: 'Sheet Size', C: 'Quantity' }, // Header
        ];

        data.breakdown.forEach(mat => {
            wsData.push({ A: mat.material }); // Section Header
            mat.sizes.forEach(s => {
                wsData.push({
                    A: '', // Indent
                    B: s.size,
                    C: s.count
                });
            });
            wsData.push({}); // Spacer
        });

        const ws = XLSX.utils.json_to_sheet(wsData, { skipHeader: true });
        XLSX.utils.book_append_sheet(wb, ws, "Sheet Usage");
        XLSX.writeFile(wb, `Sheet_Requirement_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    if (loading) return (
        <div className="p-10 text-center animate-pulse">
            <div className="font-bold text-slate-400">Calculating Sheet Requirements...</div>
        </div>
    );

    if (error) return (
        <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 text-red-500 rounded-full mb-4">
                <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Analysis Failed</h3>
            <p className="text-slate-500 mb-6">{error}</p>
            <button onClick={fetchMaterials} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Try Again</button>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto p-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Calculator size={24} />
                        </div>
                        Material Analysis
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium ml-12">
                        Calculate raw material needs (Sheet Count) based on pending orders.
                    </p>
                </div>
                <button onClick={fetchMaterials} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors bg-white rounded-lg border border-slate-200 shadow-sm">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* KPI CARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10">
                        <div className="text-indigo-100 font-bold uppercase tracking-widest text-xs mb-2">Total Sheets Required</div>
                        <div className="text-6xl font-black tracking-tight mb-2">
                            {totalSheets}
                            <span className="text-2xl opacity-60 font-bold ml-2">sheets</span>
                        </div>
                        <div className="inline-flex items-center gap-2 bg-indigo-500/30 backdrop-blur-md px-3 py-1.5 rounded-lg border border-indigo-400/30">
                            <span className="font-bold">{data?.pendingItemCount}</span>
                            <span className="text-sm opacity-90">Pending Order Items</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <h3 className="text-lg font-black text-slate-800 mb-4">Stock Purchase Advisory</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                        This calculation groups items by <strong>Optimal Blank Size</strong> tailored to your master sheet inventory.
                    </p>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600 font-medium">
                        ℹ️ Ensure your Master Sheet Sizes are updated in the <strong>Masters Tab</strong> for accurate results.
                    </div>
                </div>
            </div>

            {/* BREAKDOWN TABLE */}
            <div className="space-y-6">
                {data?.breakdown.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-slate-400 font-medium italic">No pending orders requiring materials.</div>
                    </div>
                ) : (
                    data?.breakdown.map((mat, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-black text-slate-800">{mat.material}</h3>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {mat.sizes.reduce((s, x) => s + x.count, 0)} Total
                                </div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {mat.sizes.map((s, j) => (
                                    <div key={j} className="px-6 py-4 flex justify-between items-center group hover:bg-indigo-50/30 transition-colors">
                                        <div className="font-bold text-slate-600 font-mono text-sm">{s.size}</div>
                                        <div className="flex items-center gap-4">
                                            {/* Bar Visualization */}
                                            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                <div
                                                    className="h-full bg-indigo-500 rounded-full"
                                                    style={{ width: `${Math.min(100, (s.count / totalSheets) * 100 * 5)}%` }} // Scale up for visibility
                                                ></div>
                                            </div>
                                            <div className="font-black text-slate-800 text-lg w-12 text-right">{s.count}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="flex justify-end mt-8">
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-95 shadow-lg"
                >
                    <Download size={20} /> Export Complete List
                </button>
            </div>
        </div>
    );
}
