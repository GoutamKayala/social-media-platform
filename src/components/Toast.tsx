import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

export function Toast({ toasts, removeToast }: ToastProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgColor = "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700";
          let textColor = "text-gray-800 dark:text-gray-100";
          let icon = <Info className="w-5 h-5 text-blue-500" />;

          if (toast.type === "success") {
            bgColor = "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60";
            textColor = "text-emerald-800 dark:text-emerald-200";
            icon = <CheckCircle className="w-5 h-5 text-emerald-500" />;
          } else if (toast.type === "error") {
            bgColor = "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60";
            textColor = "text-rose-800 dark:text-rose-200";
            icon = <AlertTriangle className="w-5 h-5 text-rose-500" />;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md ${bgColor} ${textColor}`}
              layout
            >
              <div className="flex-shrink-0 mt-0.5">{icon}</div>
              <div className="flex-grow text-sm font-medium pr-2 whitespace-pre-line leading-relaxed">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                id={`toast-close-${toast.id}`}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
