import React from 'react';
import { Edit, Trash2, Copy } from 'lucide-react';

// --- STATUS BADGE ---
export const StatusBadge = ({ status }: { status: string }) => {
    const normalized = (status || '').toUpperCase();
    const styles: Record<string, string> = {
        ACTIVE: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        INACTIVE: 'bg-gray-50 text-gray-400 border-gray-100',
        DRAFT: 'bg-amber-50 text-amber-600 border-amber-100',
        PUBLISHED: 'bg-blue-50 text-blue-600 border-blue-100',
        PENDING: 'bg-yellow-50 text-yellow-600 border-yellow-100',
        CONFIRMED: 'bg-blue-50 text-blue-600 border-blue-100',
        PROCESSING: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        SHIPPED: 'bg-cyan-50 text-cyan-600 border-cyan-100',
        DELIVERED: 'bg-green-50 text-green-600 border-green-100',
        CANCELLED: 'bg-red-50 text-red-500 border-red-100',
        REFUNDED: 'bg-purple-50 text-purple-500 border-purple-100',
        READ: 'bg-green-50 text-green-600 border-green-100',
        UNREAD: 'bg-red-50 text-red-500 border-red-100',
    };
    return (
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${styles[normalized] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
            {normalized}
        </span>
    );
};

// --- ACTION BUTTONS ---
export const ActionButtons = ({ onClickEdit, onClickDelete, onClickDuplicate }: { onClickEdit?: () => void, onClickDelete?: () => void, onClickDuplicate?: () => void }) => (
    <div className="flex gap-2 justify-end">
        {onClickDuplicate && (
            <button onClick={onClickDuplicate} className="p-1.5 text-violet-600 hover:bg-violet-50 rounded transition-colors" title="Duplicate">
                <Copy size={16} />
            </button>
        )}
        {onClickEdit && (
            <button onClick={onClickEdit} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                <Edit size={16} />
            </button>
        )}
        {onClickDelete && (
            <button onClick={onClickDelete} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                <Trash2 size={16} />
            </button>
        )}
    </div>
);
