import React from 'react';
import { Menu, X, LogOut, ChevronLeft, ChevronRight, User } from 'lucide-react';
import Logo from './Logo';

/**
 * Shared Sidebar Component
 * supports:
 * - Desktop: Rail (Collapsed) vs Sidebar (Expanded)
 * - Mobile: Drawer (Overlay)
 */
export default function Sidebar({
    isOpen, // Controls Expansion on Desktop, Visibility on Mobile
    toggle,
    isMobile,
    user,
    roleLabel, // e.g. "Admin", "Dealer"
    menuItems, // Array of { id, label, icon: IconComponent }
    activeTab,
    setActiveTab,
    logout
}) {
    // DESKTOP: isOpen = Expanded, !isOpen = Rail (Collapsed)
    // MOBILE: isOpen = Visible (Drawer), !isOpen = Hidden

    const containerClass = isMobile
        ? `fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
        : `sticky top-0 h-screen bg-white shadow-xl border-r border-gray-100 transition-all duration-300 ease-in-out flex flex-col ${isOpen ? 'w-64' : 'w-20'}`;

    return (
        <>
            {/* MOBILE OVERLAY */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in"
                    onClick={toggle}
                />
            )}

            <aside className={containerClass}>
                {/* HEADER */}
                <div className={`flex items-center justify-between p-4 border-b border-gray-100 ${!isOpen && !isMobile ? 'flex-col gap-4' : ''}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Logo iconOnly size={40} className="shrink-0" />
                        {(isOpen || isMobile) && (
                            <div className="animate-in fade-in duration-300">
                                <h1 className="font-black text-lg leading-none tracking-tight">
                                    <span style={{ color: '#E0312A' }}>Z-ON</span>{' '}
                                    <span style={{ color: '#2B2B2B' }}>DOOR</span>
                                </h1>
                                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{roleLabel} Panel</span>
                            </div>
                        )}
                    </div>

                    {/* TOGGLE BUTTON (Desktop Only) */}
                    {!isMobile && (
                        <button
                            onClick={toggle}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
                        >
                            {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </button>
                    )}

                    {/* CLOSE BUTTON (Mobile Only) */}
                    {isMobile && (
                        <button onClick={toggle} className="p-2 hover:bg-gray-100 rounded-full">
                            <X size={20} className="text-gray-500" />
                        </button>
                    )}
                </div>

                {/* NAVIGATION */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                    {menuItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    if (isMobile) toggle();
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative
                                    ${isActive
                                        ? 'bg-red-50 text-red-600 shadow-sm'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                    ${!isOpen && !isMobile ? 'justify-center' : ''}
                                `}
                                title={!isOpen ? item.label : ''} // Tooltip for rail
                            >
                                <item.icon
                                    size={22}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={`shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                                />

                                {(isOpen || isMobile) && (
                                    <span className={`text-sm font-bold tracking-wide truncate animate-in fade-in slide-in-from-left-2 duration-200 flex-1`}>
                                        {item.label}
                                    </span>
                                )}

                                {/* RAIL TOOLTIP (Desktop only) */}
                                {!isOpen && !isMobile && (
                                    <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap flex items-center gap-2">
                                        {item.label}
                                        {item.badge && (
                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${item.badgeColor || 'bg-red-500 text-white'}`}>
                                                {item.badge}
                                            </span>
                                        )}
                                        {/* Arrow */}
                                        <div className="absolute top-1/2 -left-1 -mt-1 border-4 border-transparent border-r-gray-900"></div>
                                    </div>
                                )}

                                {(isOpen || isMobile) && item.badge && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.badgeColor || 'bg-red-500 text-white'} animate-in zoom-in`}>
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                </nav>

                {/* USER & LOGOUT */}
                <div className="p-4 border-t border-gray-100">
                    <div className={`flex items-center gap-3 ${!isOpen && !isMobile ? 'flex-col' : ''}`}>
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                            <User size={20} className="text-gray-500" />
                        </div>

                        {(isOpen || isMobile) && (
                            <div className="flex-1 min-w-0 animate-in fade-in">
                                <div className="text-sm font-bold text-gray-900 truncate">{user?.name || 'User'}</div>
                                <div className="text-[10px] text-gray-400 font-bold truncate">{user?.email || roleLabel}</div>
                            </div>
                        )}

                        <button
                            onClick={logout}
                            className={`p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ${!isOpen && !isMobile ? '' : ''}`}
                            title="Sign Out"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
