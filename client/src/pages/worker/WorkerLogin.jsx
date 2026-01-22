import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { User, Delete, ArrowLeft, Loader } from 'lucide-react';

export default function WorkerLogin() {
    const navigate = useNavigate();
    const [workers, setWorkers] = useState([]);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWorkers = async () => {
            try {
                const res = await api.get('/workers/public');
                setWorkers(res.data);
            } catch (error) {
                toast.error('Failed to load worker list');
            } finally {
                setLoading(false);
            }
        };
        fetchWorkers();
    }, []);

    const handleNumClick = (num) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                handleLogin(newPin);
            }
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handleLogin = async (completePin) => {
        try {
            const res = await api.post('/workers/login', {
                workerId: selectedWorker.id,
                pinCode: completePin
            });

            // Save worker session
            localStorage.setItem('workerToken', JSON.stringify(res.data.worker));
            toast.success(`Welcome, ${res.data.worker.name}`);
            navigate('/worker/dashboard');
        } catch (error) {
            toast.error('Invalid PIN');
            setPin('');
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader className="animate-spin text-indigo-600" size={48} /></div>;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <div className="bg-white p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                        <User size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">Z-ON PRODUCTION</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Floor Access System</p>
                    </div>
                </div>
                {selectedWorker && (
                    <button
                        onClick={() => { setSelectedWorker(null); setPin(''); }}
                        className="flex items-center gap-2 text-gray-400 font-bold hover:text-gray-600"
                    >
                        <ArrowLeft size={20} /> Change User
                    </button>
                )}
            </div>

            <div className="flex-1 flex items-center justify-center p-6">

                {/* STEP 1: SELECT WORKER */}
                {!selectedWorker ? (
                    <div className="w-full max-w-4xl">
                        <h2 className="text-2xl font-black text-gray-800 mb-8 text-center uppercase tracking-widest">Select Your Profile</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {workers.map(worker => (
                                <button
                                    key={worker.id}
                                    onClick={() => setSelectedWorker(worker)}
                                    className="bg-white p-8 rounded-3xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100 flex flex-col items-center gap-4 group"
                                >
                                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner">
                                        <span className="text-2xl font-black">{worker.name.charAt(0)}</span>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-black text-lg text-gray-800 group-hover:text-indigo-600 transition-colors">{worker.name}</div>
                                        <div className="text-xs font-bold text-gray-400 uppercase mt-1 bg-gray-100 px-2 py-1 rounded-lg inline-block">
                                            {worker.role.replace('_', ' ')}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* STEP 2: ENTER PIN */
                    <div className="w-full max-w-sm">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-indigo-600 rounded-full mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-200 mb-4">
                                <span className="text-2xl font-black">{selectedWorker.name.charAt(0)}</span>
                            </div>
                            <h2 className="text-2xl font-black text-gray-900">{selectedWorker.name}</h2>
                            <p className="text-gray-400 font-bold text-sm mt-1">Enter your 4-digit PIN</p>
                        </div>

                        {/* PIN DOTS */}
                        <div className="flex justify-center gap-4 mb-8">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-indigo-600 scale-125' : 'bg-gray-200'
                                    }`} />
                            ))}
                        </div>

                        {/* KEYPAD */}
                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button
                                    key={num}
                                    onClick={() => handleNumClick(num)}
                                    className="bg-white hover:bg-indigo-50 active:bg-indigo-100 h-20 rounded-2xl shadow-sm border border-gray-100 text-3xl font-black text-gray-700 transition-all active:scale-95"
                                >
                                    {num}
                                </button>
                            ))}
                            <div className="col-span-1"></div>
                            <button
                                onClick={() => handleNumClick(0)}
                                className="bg-white hover:bg-indigo-50 active:bg-indigo-100 h-20 rounded-2xl shadow-sm border border-gray-100 text-3xl font-black text-gray-700 transition-all active:scale-95"
                            >
                                0
                            </button>
                            <button
                                onClick={handleBackspace}
                                className="bg-white hover:bg-red-50 active:bg-red-100 h-20 rounded-2xl shadow-sm border border-gray-100 text-red-500 flex items-center justify-center transition-all active:scale-95"
                            >
                                <Delete size={28} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
