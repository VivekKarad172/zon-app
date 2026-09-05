import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LineChart, Line
} from 'recharts';
import {
    TrendingUp, TrendingDown, Users, Package, Palette, Download, RefreshCw,
    AlertTriangle, Phone, Calendar, Layers, Hammer, ShoppingCart, HardDrive
} from 'lucide-react';

const RED = '#E0312A';

const STATUS_STYLE = {
    active:  { label: 'Active',  cls: 'bg-emerald-100 text-emerald-700' },
    cooling: { label: 'Cooling', cls: 'bg-amber-100 text-amber-700' },
    cold:    { label: 'Cold',    cls: 'bg-orange-100 text-orange-700' },
    dormant: { label: 'Dormant', cls: 'bg-red-100 text-red-700' },
    never:   { label: 'No Orders', cls: 'bg-gray-100 text-gray-500' },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function exportXlsx(rows, sheetName, fileName) {
    if (!rows || rows.length === 0) { toast.error('Nothing to export'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    XLSX.writeFile(wb, fileName);
    toast.success('Exported ' + fileName);
}

export default function ReportsDashboard() {
    const [view, setView] = useState('sales'); // sales | parties | mix | stock

    const tabs = [
        { id: 'sales', label: 'Sales Trend', icon: TrendingUp },
        { id: 'parties', label: 'Party Revival', icon: Users },
        { id: 'mix', label: 'Product Mix', icon: Palette },
        { id: 'stock', label: 'Stock', icon: Package },
        { id: 'workers', label: 'Worker Output', icon: Hammer },
        { id: 'material', label: 'Material Needs', icon: ShoppingCart },
    ];

    const [backingUp, setBackingUp] = useState(false);
    const downloadBackup = async () => {
        setBackingUp(true);
        try {
            const res = await api.get('/reports/backup', { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url; a.download = `zon-door-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
            toast.success('Backup downloaded');
        } catch (e) { toast.error('Backup failed'); }
        finally { setBackingUp(false); }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center gap-3 border-b pb-3">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setView(t.id)}
                            className={`whitespace-nowrap px-5 py-2.5 rounded-t-xl font-bold text-sm transition-all flex items-center gap-2 ${view === t.id ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            <t.icon size={16} /> {t.label}
                        </button>
                    ))}
                </div>
                <button onClick={downloadBackup} disabled={backingUp} title="Download a full backup of all data (JSON)"
                    className="shrink-0 bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-2 disabled:opacity-50">
                    <HardDrive size={14} /> {backingUp ? 'Backing up…' : 'Backup'}
                </button>
            </div>

            {view === 'sales' && <SalesReport />}
            {view === 'parties' && <PartyReport />}
            {view === 'mix' && <ProductMixReport />}
            {view === 'stock' && <StockReport />}
            {view === 'workers' && <WorkerReport />}
            {view === 'material' && <MaterialReport />}
        </div>
    );
}

// ─── WORKER PRODUCTIVITY ─────────────────────────────────────────────────────
const STAGE_LABEL = { PVC_CUT: 'PVC Cut', FOIL_PASTING: 'Foil', EMBOSS: 'Emboss', DOOR_MAKING: 'Door Making', PACKING: 'Packing' };
function WorkerReport() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            try { const r = await api.get('/reports/worker-productivity'); setData(r.data); }
            catch (e) { toast.error('Failed to load'); }
            finally { setLoading(false); }
        })();
    }, []);
    if (loading) return <Loader />;
    if (!data || data.totalActions === 0) return <Empty msg="No worker activity in the last 30 days" />;

    const stages = Object.keys(STAGE_LABEL);
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex gap-3">
                    <KPI label="Total Doors Processed" value={data.totalActions.toLocaleString()} />
                    <KPI label="Active Workers" value={data.activeWorkers} />
                    <KPI label="Period" value="Last 30 days" />
                </div>
                <ExportBtn onClick={() => exportXlsx(data.leaderboard.map(w => ({
                    Worker: w.name, Role: w.role, 'Total Done': w.total,
                    ...Object.fromEntries(stages.map(s => [STAGE_LABEL[s], w.stages[s] || 0]))
                })), 'Worker Output', 'worker_productivity.xlsx')} />
            </div>

            <Card title="Output by Stage" subtitle="How many doors passed through each process (last 30 days)">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {stages.map(s => (
                        <div key={s} className="bg-gray-50 rounded-2xl p-4 text-center">
                            <div className="text-2xl font-black text-gray-900">{data.stageTotals[s] || 0}</div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{STAGE_LABEL[s]}</div>
                        </div>
                    ))}
                </div>
            </Card>

            <Card title="🏆 Worker Leaderboard" subtitle="Most doors completed — see your fastest hands and where work is concentrated">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="text-left text-[10px] uppercase tracking-widest text-gray-400 border-b">
                            <Th>#</Th><Th>Worker</Th><Th>Role</Th>{stages.map(s => <Th key={s} right>{STAGE_LABEL[s]}</Th>)}<Th right>Total</Th>
                        </tr></thead>
                        <tbody>
                            {data.leaderboard.map((w, i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                    <Td className="text-gray-400 font-bold">{i + 1}</Td>
                                    <Td className="font-bold">{w.name}</Td>
                                    <Td className="text-gray-500">{STAGE_LABEL[w.role] || w.role}</Td>
                                    {stages.map(s => <Td key={s} right className={w.stages[s] ? '' : 'text-gray-300'}>{w.stages[s] || 0}</Td>)}
                                    <Td right className="font-black text-red-600">{w.total}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

// ─── MATERIAL REQUIREMENT / REORDER ──────────────────────────────────────────
function MaterialReport() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            try { const r = await api.get('/reports/material-requirement'); setData(r.data); }
            catch (e) { toast.error('Failed to load'); }
            finally { setLoading(false); }
        })();
    }, []);
    if (loading) return <Loader />;
    if (!data) return <Empty msg="No data" />;

    const buyList = data.rows.filter(r => r.toBuy > 0);
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex gap-3">
                    <KPI label="Pending Orders" value={data.pendingOrders} />
                    <KPI label="Pending Doors" value={data.pendingDoors} />
                    <KPI label="Sheets Needed" value={data.totalSheetsNeeded} />
                    <KPI label="Sheets to Buy" value={data.totalToBuy} />
                </div>
                <ExportBtn onClick={() => exportXlsx(data.rows.map(r => ({ Material: r.material, Size: r.size, Doors: r.doors, 'Sheets Needed': r.sheetsNeeded, 'In Stock': r.inStock, 'To Buy': r.toBuy })), 'Material', 'material_requirement.xlsx')} />
            </div>

            {buyList.length > 0 ? (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2 text-red-700 font-black mb-3"><ShoppingCart size={18} /> Purchase Order Needed ({buyList.length} sizes)</div>
                    <div className="flex flex-wrap gap-2">
                        {buyList.map((r, i) => (
                            <span key={i} className="bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-xl text-xs font-bold">
                                {r.material} {r.size} → buy {r.toBuy} sheets
                            </span>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-emerald-700 font-bold text-sm flex items-center gap-2">
                    ✅ Current stock covers all pending orders — no purchase needed right now.
                </div>
            )}

            <Card title="Material Requirement (pending orders)" subtitle="Sheets needed per size vs what's in stock. 2 sheets per door (front + back).">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="text-left text-[10px] uppercase tracking-widest text-gray-400 border-b">
                            <Th>Material</Th><Th>Sheet Size</Th><Th right>Doors</Th><Th right>Sheets Needed</Th><Th right>In Stock</Th><Th right>To Buy</Th>
                        </tr></thead>
                        <tbody>
                            {data.rows.map((r, i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                    <Td className="font-bold">{r.material}</Td>
                                    <Td>{r.size}</Td>
                                    <Td right>{r.doors}</Td>
                                    <Td right className="font-black">{r.sheetsNeeded}</Td>
                                    <Td right className={r.inStock < r.sheetsNeeded ? 'text-red-600 font-bold' : 'text-gray-500'}>{r.inStock}</Td>
                                    <Td right>{r.toBuy > 0 ? <span className="font-black text-red-600">{r.toBuy}</span> : <span className="text-emerald-600">✓</span>}</Td>
                                </tr>
                            ))}
                            {data.rows.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-300 italic">No pending orders</td></tr>}
                        </tbody>
                    </table>
                </div>
                {data.unmatchedDoors > 0 && <p className="text-[11px] text-amber-600 font-bold mt-3">⚠ {data.unmatchedDoors} door(s) couldn't be matched to a sheet size (check sheet master for those dimensions).</p>}
            </Card>
        </div>
    );
}

// ─── SALES TREND ─────────────────────────────────────────────────────────────
function SalesReport() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [metric, setMetric] = useState('doors'); // doors | orders

    const load = async () => {
        setLoading(true);
        try { const res = await api.get('/reports/sales-monthly'); setData(res.data); }
        catch (e) { toast.error('Failed to load sales report'); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    if (loading) return <Loader />;
    if (!data || !data.series.length) return <Empty msg="No sales data yet" />;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex gap-3">
                    <KPI label="Total Doors" value={data.totals.doors.toLocaleString()} />
                    <KPI label="Total Orders" value={data.totals.orders.toLocaleString()} />
                    <KPI label="Months" value={data.totals.months} />
                </div>
                <div className="flex gap-2">
                    <ToggleBtns value={metric} onChange={setMetric} options={[{ id: 'doors', label: 'Doors' }, { id: 'orders', label: 'Orders' }]} />
                    <ExportBtn onClick={() => exportXlsx(
                        data.series.map(s => ({ Month: s.label, Orders: s.orders, Doors: s.doors, 'Change %': s.doorChangePct ?? '' })),
                        'Monthly Sales', 'sales_monthly.xlsx')} />
                </div>
            </div>

            {(data.best || data.worst) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.best && <Insight icon={TrendingUp} tone="emerald" title="Best Month" body={`${data.best.label} — ${data.best.doors} doors`} />}
                    {data.worst && <Insight icon={TrendingDown} tone="red" title="Slowest Month" body={`${data.worst.label} — ${data.worst.doors} doors`} />}
                </div>
            )}

            <Card title="Monthly Sales">
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={data.series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700 }} angle={-25} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey={metric} radius={[6, 6, 0, 0]}>
                            {data.series.map((e, i) => (
                                <Cell key={i} fill={data.worst && e.month === data.worst.month ? '#fca5a5' : RED} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            <Card title="Month Detail">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="text-left text-[10px] uppercase tracking-widest text-gray-400 border-b">
                            <Th>Month</Th><Th right>Orders</Th><Th right>Doors</Th><Th right>vs Prev</Th>
                        </tr></thead>
                        <tbody>
                            {data.series.map((s, i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                    <Td className="font-bold">{s.label}</Td>
                                    <Td right>{s.orders}</Td>
                                    <Td right className="font-black">{s.doors}</Td>
                                    <Td right>
                                        {s.doorChangePct == null ? <span className="text-gray-300">—</span> :
                                            <span className={`font-bold ${s.doorChangePct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {s.doorChangePct >= 0 ? '▲' : '▼'} {Math.abs(s.doorChangePct)}%
                                            </span>}
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

// ─── PARTY REVIVAL ───────────────────────────────────────────────────────────
function PartyReport() {
    const [role, setRole] = useState('DEALER');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all | cold | dormant | active...

    const load = async (r) => {
        setLoading(true);
        try { const res = await api.get('/reports/party-activity?role=' + r); setData(res.data); }
        catch (e) { toast.error('Failed to load'); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(role); }, [role]);

    const rows = data?.rows || [];
    const filtered = filter === 'all' ? rows
        : filter === 'revival' ? rows.filter(r => ['cold', 'dormant'].includes(r.status))
        : rows.filter(r => r.status === filter);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <ToggleBtns value={role} onChange={setRole} options={[{ id: 'DEALER', label: 'Dealers (Shops)' }, { id: 'DISTRIBUTOR', label: 'Distributors' }]} />
                <div className="flex gap-2">
                    <button onClick={() => load(role)} className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
                    <ExportBtn onClick={() => exportXlsx(filtered.map(r => ({
                        Name: r.name, Shop: r.shopName || '', Distributor: r.distributor || '', City: r.city || '',
                        WhatsApp: r.phone || '', Status: r.status, 'Total Orders': r.totalOrders, 'Total Doors': r.totalDoors,
                        'First Order': fmtDate(r.firstOrder), 'Last Order': fmtDate(r.lastOrder), 'Days Since Last': r.daysSinceLast ?? ''
                    })), 'Parties', `${role.toLowerCase()}_activity.xlsx`)} />
                </div>
            </div>

            {/* status chips */}
            <div className="flex flex-wrap gap-2">
                <Chip active={filter === 'all'} onClick={() => setFilter('all')} label={`All (${rows.length})`} />
                <Chip active={filter === 'revival'} onClick={() => setFilter('revival')} label={`⚠ Needs Revival (${(data?.counts?.cold || 0) + (data?.counts?.dormant || 0)})`} tone="red" />
                {['active', 'cooling', 'cold', 'dormant'].map(s => (
                    <Chip key={s} active={filter === s} onClick={() => setFilter(s)} label={`${STATUS_STYLE[s].label} (${data?.counts?.[s] || 0})`} />
                ))}
            </div>

            {loading ? <Loader /> : (
                <Card title={`${filtered.length} ${role === 'DEALER' ? 'Dealers' : 'Distributors'}`}
                    subtitle="Sorted by most days since last order — top of the list needs attention">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="text-left text-[10px] uppercase tracking-widest text-gray-400 border-b">
                                <Th>Name / Shop</Th>
                                {role === 'DEALER' && <Th>Distributor</Th>}
                                <Th>WhatsApp</Th><Th right>Orders</Th><Th right>Doors</Th>
                                <Th>Last Order</Th><Th right>Idle</Th><Th>Status</Th>
                            </tr></thead>
                            <tbody>
                                {filtered.map(r => (
                                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <Td>
                                            <div className="font-bold text-gray-900">{r.name}</div>
                                            {r.shopName && r.shopName !== r.name && <div className="text-[11px] text-gray-400">{r.shopName}</div>}
                                        </Td>
                                        {role === 'DEALER' && <Td className="text-gray-500">{r.distributor || '—'}</Td>}
                                        <Td>
                                            {r.phone
                                                ? <a href={`https://wa.me/${r.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold flex items-center gap-1 hover:underline"><Phone size={12} /> {r.phone}</a>
                                                : <span className="text-gray-300">—</span>}
                                        </Td>
                                        <Td right className="font-bold">{r.totalOrders}</Td>
                                        <Td right>{r.totalDoors}</Td>
                                        <Td className="text-gray-500">{fmtDate(r.lastOrder)}</Td>
                                        <Td right>{r.daysSinceLast == null ? '—' : <span className="font-bold">{r.daysSinceLast}d</span>}</Td>
                                        <Td><span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${STATUS_STYLE[r.status].cls}`}>{STATUS_STYLE[r.status].label}</span></Td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-gray-400 italic">None in this category</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}

// ─── PRODUCT MIX ─────────────────────────────────────────────────────────────
function ProductMixReport() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            try { const res = await api.get('/reports/product-mix'); setData(res.data); }
            catch (e) { toast.error('Failed to load'); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <Loader />;
    if (!data || !data.totalDoors) return <Empty msg="No product data yet" />;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex gap-3">
                    <KPI label="Total Doors" value={data.totalDoors.toLocaleString()} />
                    <KPI label="Designs Used" value={data.uniqueDesigns} />
                    <KPI label="Colors Used" value={data.uniqueColors} />
                </div>
            </div>

            <Card title="🏆 Top Design + Color Combinations" subtitle="What sells most together — plan new designs & purchase orders around these">
                <div className="flex justify-end mb-3">
                    <ExportBtn onClick={() => exportXlsx(data.topCombos.map((c, i) => ({ Rank: i + 1, Combination: c.name, Doors: c.doors, 'Share %': c.pct })), 'Combos', 'product_combos.xlsx')} />
                </div>
                <RankTable rows={data.topCombos} labelHead="Design + Color" />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Top Designs">
                    <BarList rows={data.topDesigns.slice(0, 12)} />
                </Card>
                <Card title="Top Colors / Foils">
                    <BarList rows={data.topColors.slice(0, 12)} />
                </Card>
            </div>
        </div>
    );
}

// ─── STOCK ───────────────────────────────────────────────────────────────────
function StockReport() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            try { const res = await api.get('/reports/stock'); setData(res.data); }
            catch (e) { toast.error('Failed to load'); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <Loader />;
    if (!data) return <Empty msg="No stock data" />;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex gap-3">
                    <KPI label="Sheet Types" value={data.totals.sheets} />
                    <KPI label="Total In Stock" value={data.totals.totalStock.toLocaleString()} />
                    <KPI label="Total Consumed" value={data.totals.totalConsumed.toLocaleString()} />
                </div>
                <ExportBtn onClick={() => exportXlsx(data.rows.map(r => ({ Size: r.size, Material: r.materialType, 'Current Stock': r.currentStock, Consumed: r.consumed, Enabled: r.isEnabled ? 'Yes' : 'No' })), 'Stock', 'stock_report.xlsx')} />
            </div>

            {data.lowStock.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2 text-red-700 font-black mb-3"><AlertTriangle size={18} /> Low Stock — Purchase Needed ({data.lowStock.length})</div>
                    <div className="flex flex-wrap gap-2">
                        {data.lowStock.map(r => (
                            <span key={r.id} className="bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-xl text-xs font-bold">
                                {r.size} ({r.materialType}) · {r.currentStock} left
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <Card title="Stock Levels">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="text-left text-[10px] uppercase tracking-widest text-gray-400 border-b">
                            <Th>Size</Th><Th>Material</Th><Th right>Current Stock</Th><Th right>Consumed</Th><Th>Status</Th>
                        </tr></thead>
                        <tbody>
                            {data.rows.map(r => (
                                <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50 ${!r.isEnabled ? 'opacity-40' : ''}`}>
                                    <Td className="font-bold">{r.size}</Td>
                                    <Td>{r.materialType}</Td>
                                    <Td right className={`font-black ${r.low ? 'text-red-600' : 'text-gray-900'}`}>{r.currentStock}</Td>
                                    <Td right className="text-gray-500">{r.consumed}</Td>
                                    <Td>{r.low ? <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-red-100 text-red-700">Low</span> : <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">OK</span>}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

// ─── shared UI bits ──────────────────────────────────────────────────────────
const Loader = () => <div className="py-20 text-center text-gray-400 animate-pulse">Loading report…</div>;
const Empty = ({ msg }) => <div className="py-20 text-center text-gray-300 italic">{msg}</div>;
const Th = ({ children, right }) => <th className={`pb-3 px-3 font-black ${right ? 'text-right' : ''}`}>{children}</th>;
const Td = ({ children, right, className = '' }) => <td className={`py-3 px-3 ${right ? 'text-right' : ''} ${className}`}>{children}</td>;

function Card({ title, subtitle, children }) {
    return (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/40 border border-gray-100 p-6">
            {title && <div className="mb-4"><h3 className="font-black text-gray-900 text-lg">{title}</h3>{subtitle && <p className="text-xs text-gray-400 font-medium mt-0.5">{subtitle}</p>}</div>}
            {children}
        </div>
    );
}
const KPI = ({ label, value }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</div>
        <div className="text-2xl font-black text-gray-900">{value}</div>
    </div>
);
const Insight = ({ icon: Icon, tone, title, body }) => (
    <div className={`rounded-2xl p-4 border flex items-center gap-3 ${tone === 'emerald' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
        <Icon size={22} className={tone === 'emerald' ? 'text-emerald-600' : 'text-red-600'} />
        <div>
            <div className={`text-[10px] font-black uppercase tracking-widest ${tone === 'emerald' ? 'text-emerald-700' : 'text-red-700'}`}>{title}</div>
            <div className="font-bold text-gray-800 text-sm">{body}</div>
        </div>
    </div>
);
const ExportBtn = ({ onClick }) => (
    <button onClick={onClick} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95"><Download size={14} /> Excel</button>
);
const ToggleBtns = ({ value, onChange, options }) => (
    <div className="flex bg-gray-100 p-1 rounded-xl">
        {options.map(o => (
            <button key={o.id} onClick={() => onChange(o.id)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${value === o.id ? 'bg-white shadow text-red-700' : 'text-gray-500'}`}>{o.label}</button>
        ))}
    </div>
);
const Chip = ({ active, onClick, label, tone }) => (
    <button onClick={onClick} className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${active ? (tone === 'red' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white') : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{label}</button>
);
function RankTable({ rows, labelHead }) {
    const max = rows[0]?.doors || 1;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead><tr className="text-left text-[10px] uppercase tracking-widest text-gray-400 border-b"><Th>#</Th><Th>{labelHead}</Th><Th right>Doors</Th><Th right>Share</Th><Th>Volume</Th></tr></thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <Td className="text-gray-400 font-bold">{i + 1}</Td>
                            <Td className="font-bold">{r.name}</Td>
                            <Td right className="font-black">{r.doors}</Td>
                            <Td right className="text-gray-500">{r.pct}%</Td>
                            <Td><div className="h-2 bg-gray-100 rounded-full w-32"><div className="h-2 rounded-full" style={{ width: `${(r.doors / max) * 100}%`, background: RED }} /></div></Td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
function BarList({ rows }) {
    const max = rows[0]?.doors || 1;
    return (
        <div className="space-y-2.5">
            {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="w-28 truncate text-sm font-bold text-gray-700" title={r.name}>{r.name}</div>
                    <div className="flex-1 h-6 bg-gray-50 rounded-lg overflow-hidden"><div className="h-6 rounded-lg flex items-center justify-end pr-2 text-[10px] font-black text-white" style={{ width: `${Math.max((r.doors / max) * 100, 8)}%`, background: RED }}>{r.doors}</div></div>
                    <div className="w-10 text-right text-xs text-gray-400 font-bold">{r.pct}%</div>
                </div>
            ))}
        </div>
    );
}
