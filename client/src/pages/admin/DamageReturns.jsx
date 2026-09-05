import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { AlertTriangle, Plus, RefreshCw, Recycle, XCircle, Trash2, PackageX, Search } from 'lucide-react';

const STAGES = ['PVC_CUT', 'FOIL_PASTING', 'EMBOSS', 'DOOR_MAKING', 'PACKING', 'DELIVERY', 'OTHER'];
const STAGE_LABEL = { PVC_CUT: 'PVC Cut', FOIL_PASTING: 'Foil Pasting', EMBOSS: 'Emboss', DOOR_MAKING: 'Door Making', PACKING: 'Packing', DELIVERY: 'Delivery', OTHER: 'Other' };
const STATUS_STYLE = {
    LOGGED: 'bg-amber-100 text-amber-700',
    REPLACED: 'bg-emerald-100 text-emerald-700',
    WRITTEN_OFF: 'bg-gray-200 text-gray-600',
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '';

export default function DamageReturns() {
    const [reports, setReports] = useState([]);
    const [summary, setSummary] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const load = async () => {
        try {
            const [r, s] = await Promise.all([api.get('/damage'), api.get('/damage/summary')]);
            setReports(r.data); setSummary(s.data);
        } catch (e) { toast.error('Failed to load damage reports'); }
    };
    useEffect(() => { load(); }, []);

    const replace = async (id) => {
        if (!confirm('Push replacement door(s) into the production queue for this damage?')) return;
        try { const res = await api.post(`/damage/${id}/replace`); toast.success(res.data.message); load(); }
        catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    };
    const writeOff = async (id) => {
        if (!confirm('Mark this as written off (scrapped, no replacement)?')) return;
        try { await api.put(`/damage/${id}`, { status: 'WRITTEN_OFF' }); toast.success('Marked written off'); load(); }
        catch (e) { toast.error('Failed'); }
    };
    const remove = async (id) => {
        if (!confirm('Delete this damage record?')) return;
        try { await api.delete(`/damage/${id}`); toast.success('Deleted'); load(); }
        catch (e) { toast.error('Failed'); }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Kpi label="Total Damaged" value={summary?.total ?? 0} tone="red" icon={PackageX} />
                <Kpi label="Pending" value={summary?.logged ?? 0} tone="amber" />
                <Kpi label="Replaced" value={summary?.replaced ?? 0} tone="emerald" />
                <Kpi label="Production Rejects" value={summary?.productionReject ?? 0} />
                <Kpi label="Delivery Returns" value={summary?.deliveryReturn ?? 0} />
            </div>

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-gray-900">Damage & Returns</h2>
                    <p className="text-xs text-gray-400 font-bold">Log rejected / returned doors and push replacements into production</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={load} className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
                    <button onClick={() => setShowForm(true)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-2 shadow-lg shadow-red-100"><Plus size={16} /> Log Damage</button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="text-left text-[10px] uppercase tracking-widest text-gray-400 border-b bg-gray-50/50">
                            <Th>Date</Th><Th>Order</Th><Th>Design / Color</Th><Th>Stage</Th><Th>Type</Th><Th>Reason</Th><Th right>Qty</Th><Th>Status</Th><Th>Action</Th>
                        </tr></thead>
                        <tbody>
                            {reports.map(r => (
                                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                                    <Td className="text-gray-500">{fmtDate(r.createdAt)}</Td>
                                    <Td className="font-bold">{r.orderId ? `#${r.orderId}` : '—'}</Td>
                                    <Td><span className="font-bold">{r.designName || '—'}</span>{r.colorName ? <span className="text-gray-400"> / {r.colorName}</span> : ''}</Td>
                                    <Td>{STAGE_LABEL[r.stage] || r.stage}</Td>
                                    <Td>{r.type === 'DELIVERY_RETURN' ? <span className="text-orange-600 font-bold">Return</span> : <span className="text-red-600 font-bold">Reject</span>}</Td>
                                    <Td className="text-gray-500 max-w-[180px] truncate" title={r.reason}>{r.reason || '—'}</Td>
                                    <Td right className="font-black">{r.quantity}</Td>
                                    <Td><span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${STATUS_STYLE[r.status]}`}>{r.status.replace('_', ' ')}</span></Td>
                                    <Td>
                                        {r.status === 'LOGGED' && (
                                            <div className="flex gap-1">
                                                {r.orderItemId && <button onClick={() => replace(r.id)} title="Push replacement into production" className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"><Recycle size={14} /></button>}
                                                <button onClick={() => writeOff(r.id)} title="Write off (scrap)" className="p-2 bg-gray-50 text-gray-500 hover:bg-gray-600 hover:text-white rounded-lg transition-all"><XCircle size={14} /></button>
                                                <button onClick={() => remove(r.id)} title="Delete" className="p-2 bg-gray-50 text-gray-400 hover:bg-red-600 hover:text-white rounded-lg transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        )}
                                    </Td>
                                </tr>
                            ))}
                            {reports.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-gray-300 italic">No damage or returns logged yet 🎉</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && <LogForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
        </div>
    );
}

function LogForm({ onClose, onSaved }) {
    const [form, setForm] = useState({ orderId: '', orderItemId: '', stage: 'FOIL_PASTING', type: 'PRODUCTION_REJECT', reason: '', quantity: 1, designName: '', colorName: '' });
    const [items, setItems] = useState([]);
    const [loadingOrder, setLoadingOrder] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadOrder = async () => {
        if (!form.orderId) return;
        setLoadingOrder(true);
        try {
            const res = await api.get('/orders?search=' + form.orderId);
            const order = Array.isArray(res.data) ? res.data.find(o => String(o.id) === String(form.orderId)) : null;
            if (!order) { toast.error('Order not found'); setItems([]); }
            else {
                const its = (order.OrderItems || []).map(it => ({
                    id: it.id,
                    label: `${it.designNameSnapshot || it.Design?.designNumber || 'Design'} / ${it.colorNameSnapshot || it.Color?.name || 'Color'} (${it.width}×${it.height})`,
                    designName: it.designNameSnapshot || it.Design?.designNumber,
                    colorName: it.colorNameSnapshot || it.Color?.name,
                }));
                setItems(its);
                if (its.length === 0) toast('Order has no items', { icon: 'ℹ️' });
            }
        } catch (e) { toast.error('Failed to load order'); }
        finally { setLoadingOrder(false); }
    };

    const pickItem = (id) => {
        const it = items.find(x => String(x.id) === String(id));
        setForm(f => ({ ...f, orderItemId: id, designName: it?.designName || '', colorName: it?.colorName || '' }));
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/damage', {
                orderId: form.orderId || null,
                orderItemId: form.orderItemId || null,
                stage: form.stage, type: form.type, reason: form.reason,
                quantity: parseInt(form.quantity) || 1,
                designName: form.designName, colorName: form.colorName,
            });
            toast.success('Damage logged');
            onSaved();
        } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-5"><AlertTriangle className="text-red-600" /><h3 className="text-lg font-black text-gray-900">Log Damage / Return</h3></div>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Lbl>Type</Lbl>
                        <div className="flex gap-2">
                            {[{ id: 'PRODUCTION_REJECT', l: 'Production Reject' }, { id: 'DELIVERY_RETURN', l: 'Delivery Return' }].map(o => (
                                <button type="button" key={o.id} onClick={() => setForm({ ...form, type: o.id })} className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${form.type === o.id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{o.l}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Lbl>Order # (optional — needed to auto-create replacements)</Lbl>
                        <div className="flex gap-2">
                            <input className="flex-1 bg-gray-50 rounded-xl p-3 text-sm font-bold" value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value, orderItemId: '' })} placeholder="e.g. 1422" />
                            <button type="button" onClick={loadOrder} disabled={loadingOrder} className="bg-gray-900 text-white px-4 rounded-xl text-xs font-bold flex items-center gap-1"><Search size={14} /> {loadingOrder ? '...' : 'Load'}</button>
                        </div>
                    </div>

                    {items.length > 0 && (
                        <div>
                            <Lbl>Which item (design / color)?</Lbl>
                            <select className="w-full bg-gray-50 rounded-xl p-3 text-sm font-bold" value={form.orderItemId} onChange={e => pickItem(e.target.value)}>
                                <option value="">— select item —</option>
                                {items.map(it => <option key={it.id} value={it.id}>{it.label}</option>)}
                            </select>
                        </div>
                    )}

                    {items.length === 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            <div><Lbl>Design</Lbl><input className="w-full bg-gray-50 rounded-xl p-3 text-sm font-bold" value={form.designName} onChange={e => setForm({ ...form, designName: e.target.value })} placeholder="e.g. ZN-12" /></div>
                            <div><Lbl>Color / Foil</Lbl><input className="w-full bg-gray-50 rounded-xl p-3 text-sm font-bold" value={form.colorName} onChange={e => setForm({ ...form, colorName: e.target.value })} placeholder="e.g. 8" /></div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Lbl>Stage</Lbl>
                            <select className="w-full bg-gray-50 rounded-xl p-3 text-sm font-bold" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
                                {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                            </select>
                        </div>
                        <div><Lbl>Quantity</Lbl><input type="number" min="1" className="w-full bg-gray-50 rounded-xl p-3 text-sm font-bold" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                    </div>

                    <div><Lbl>Reason</Lbl><textarea className="w-full bg-gray-50 rounded-xl p-3 text-sm font-bold" rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="e.g. foil bubble, crack, wrong size, dealer complaint" /></div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50">{saving ? 'Saving…' : 'Log Damage'}</button>
                        <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-black text-xs uppercase tracking-widest">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const Th = ({ children, right }) => <th className={`py-3 px-3 font-black ${right ? 'text-right' : ''}`}>{children}</th>;
const Td = ({ children, right, className = '', title }) => <td title={title} className={`py-3 px-3 ${right ? 'text-right' : ''} ${className}`}>{children}</td>;
const Lbl = ({ children }) => <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">{children}</label>;
function Kpi({ label, value, tone, icon: Icon }) {
    const tones = { red: 'text-red-600', amber: 'text-amber-600', emerald: 'text-emerald-600' };
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">{Icon && <Icon size={12} />} {label}</div>
            <div className={`text-2xl font-black ${tones[tone] || 'text-gray-900'}`}>{value}</div>
        </div>
    );
}
