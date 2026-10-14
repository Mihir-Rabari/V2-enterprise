'use client';

import React, { createContext, useContext, useState } from 'react';

interface QuickViewContextType {
    selectedProductId: string | number | null;
    openQuickView: (id: string | number) => void;
    closeQuickView: () => void;
}

const QuickViewContext = createContext<QuickViewContextType | undefined>(undefined);

export const QuickViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedProductId, setSelectedProductId] = useState<string | number | null>(null);

    const openQuickView = (id: string | number) => setSelectedProductId(id);
    const closeQuickView = () => setSelectedProductId(null);

    return (
        <QuickViewContext.Provider value={{ selectedProductId, openQuickView, closeQuickView }}>
            {children}
        </QuickViewContext.Provider>
    );
};

export const useQuickView = () => {
    const context = useContext(QuickViewContext);
    if (!context) throw new Error('useQuickView must be used within QuickViewProvider');
    return context;
};
