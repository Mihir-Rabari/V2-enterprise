'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface InitialLoadContextType {
    isInitialLoad: boolean;
    setIsInitialLoad: (val: boolean) => void;
}

const InitialLoadContext = createContext<InitialLoadContextType | undefined>(undefined);

export const InitialLoadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // We start with true to show the splash screen
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    return (
        <InitialLoadContext.Provider value={{ isInitialLoad, setIsInitialLoad }}>
            {children}
        </InitialLoadContext.Provider>
    );
};

export const useInitialLoad = () => {
    const context = useContext(InitialLoadContext);
    if (!context) {
        throw new Error('useInitialLoad must be used within an InitialLoadProvider');
    }
    return context;
};
