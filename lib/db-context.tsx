"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializeDB } from './db'; // initializeDB の実装はそのまま

interface DbContextType {
  isDbInitialized: boolean;
  dbError: Error | null;
}

const DbContext = createContext<DbContextType>({ isDbInitialized: false, dbError: null });

export const useDb = () => useContext(DbContext);

export const DbProvider = ({ children }: { children: ReactNode }) => {
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<Error | null>(null);

  useEffect(() => {
    initializeDB()
      .then(() => {
        console.log("DB Context: Initialized");
        setIsDbInitialized(true);
      })
      .catch((error) => {
        console.error("DB Context: Initialization failed", error);
        setDbError(error);
      });
  }, []); // 初回マウント時のみ実行

  return (
    <DbContext.Provider value={{ isDbInitialized, dbError }}>
      {children}
    </DbContext.Provider>
  );
};
