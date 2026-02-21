import React, { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { IconCheck, IconX, IconAlertTriangle } from './Icons';

export type ToastType = 'success' | 'error' | 'info' | 'pending';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);
let _id = 0;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++_id;

    setToasts(prev => {
      // When a result toast arrives, clear all pending toasts
      const filtered = (type === 'success' || type === 'error')
        ? prev.filter(t => t.type !== 'pending')
        : prev;
      return [...filtered, { id, type, message }];
    });

    // Auto-dismiss non-pending toasts; pending toasts also auto-dismiss after 60s as a safety net
    const timeout = type === 'pending' ? 60_000 : 5_000;
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), timeout);
  }, []);

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' && <IconCheck style={{ width: 16, height: 16, flexShrink: 0 }} />}
            {t.type === 'error' && <IconX style={{ width: 16, height: 16, flexShrink: 0 }} />}
            {t.type === 'info' && <IconAlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />}
            {t.type === 'pending' && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={() => remove(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
