import React from "react";
import { User, DEFAULT_AVATAR } from "../types";
import { Search, Bell, Mail, Home, LogOut, Sun, Moon, User as UserIcon, Plus } from "lucide-react";
import { motion } from "motion/react";

interface NavbarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  searchQuery: string;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  onProfileClick: () => void;
  onPlusClick?: () => void;
}

export function Navbar({
  currentUser,
  activeTab,
  setActiveTab,
  setSearchQuery,
  searchQuery,
  unreadNotificationsCount,
  unreadMessagesCount,
  onProfileClick,
  onPlusClick,
}: NavbarProps) {
  // Navigation tabs with direct triggers
  const tabs = [
    { id: "feed", label: "Home", icon: Home, badge: 0, action: () => setActiveTab("feed") },
    { id: "search", label: "Search", icon: Search, badge: 0, action: () => setActiveTab("search") },
    { id: "messages", label: "Messages", icon: Mail, badge: unreadMessagesCount, action: () => setActiveTab("messages") },
    { id: "notifications", label: "Alerts", icon: Bell, badge: unreadNotificationsCount, action: () => setActiveTab("notifications") },
    { id: "profile", label: "Profile", icon: UserIcon, badge: 0, action: onProfileClick },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-colors duration-250 pb-safe">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-center gap-4">

          {/* Unified Icons Grid (Symmetric and comfortable for touch) */}
          <div className="flex-grow sm:flex-grow-0 flex items-center justify-around sm:justify-center gap-1 sm:gap-6 md:gap-7 mx-auto">
            {tabs.map((tab) => {
              const isProfile = tab.id === "profile";
              const isActive = isProfile
                ? activeTab === "profile"
                : activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={tab.action}
                  className="relative p-2.5 sm:px-3 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-xl focus:outline-none flex flex-col items-center group cursor-pointer"
                  id={`nav-item-${tab.id}`}
                  title={tab.label}
                >
                  <div className="relative">
                    {isProfile ? (
                      <img
                        src={currentUser.profileImage || DEFAULT_AVATAR}
                        alt={currentUser.displayName}
                        referrerPolicy="no-referrer"
                        className={`w-6 h-6 rounded-full object-cover transition-all ${isActive
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 scale-105"
                          : "opacity-80 group-hover:opacity-100"
                          }`}
                      />
                    ) : (
                      <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? "text-indigo-600 dark:text-indigo-400 scale-110 stroke-[2.2px]" : "group-hover:scale-105 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                        }`} />
                    )}

                    {/* Notification badges */}
                    {tab.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[8px] font-extrabold rounded-full min-w-[14px] h-[14px] px-0.5 flex items-center justify-center border border-white dark:border-slate-950 animate-pulse">
                        {tab.badge}
                      </span>
                    )}
                  </div>

                  {/* Micro transition active dot underneath */}
                  {isActive && (
                    <motion.span
                      layoutId="activeDot"
                      className="absolute bottom-0 w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </nav>
  );
}
