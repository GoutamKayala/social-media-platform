import React from "react";
import { Notification, User, DEFAULT_AVATAR } from "../types";
import { Bell, Heart, MessageSquare, CornerDownRight, UserPlus, Mail, AlertCircle, Sparkles, Check } from "lucide-react";
import { api } from "../utils/api";

interface NotificationCenterProps {
  notifications: (Notification & { sender: any })[];
  setNotifications: React.Dispatch<React.SetStateAction<(Notification & { sender: any })[]>>;
  currentUser: User;
  onUserClick: (userId: string) => void;
  onPostClick: (postId: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  setChatContactId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
}

export function NotificationCenter({
  notifications,
  setNotifications,
  currentUser,
  onUserClick,
  onPostClick,
  showToast,
  setChatContactId,
  setActiveTab,
}: NotificationCenterProps) {
  async function handleMarkAllRead() {
    try {
      await api.markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast("All notifications marked as read.", "success");
    } catch {
      showToast("Failed to refresh read attributes.", "error");
    }
  }

  const formatDistance = (isoString: string) => {
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diff / (1000 * 60));
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  function handleNotificationClick(n: Notification & { sender: any }) {
    // If we click follow, visit their profile
    if (n.type === "follow") {
      onUserClick(n.senderId);
    }
    // If liked or commented or replied, visit the postdetails page
    else if ((n.type === "like" || n.type === "comment" || n.type === "reply") && n.resourceId) {
      onPostClick(n.resourceId);
    }
    // If message notification, select contact and change active tab to messaging
    else if (n.type === "message") {
      setChatContactId(n.senderId);
      setActiveTab("messages");
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 transition-colors">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Notification Center</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
            {unreadCount} pending alert{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            id="btn-notifications-mark-read"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {notifications.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Sparkles className="w-8 h-8 text-indigo-300 mx-auto" />
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">All cleared up!</p>
            <p className="text-[10px] text-gray-400 max-w-xs mx-auto">When other members interact with your posts, details will load dynamically right here.</p>
          </div>
        ) : (
          notifications.map((n) => {
            let Icon = Bell;
            let iconColor = "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20";
            let textSnippet = "";

            if (n.type === "like") {
              Icon = Heart;
              iconColor = "text-rose-500 bg-rose-50 dark:bg-rose-950/20";
              textSnippet = "liked your post";
            } else if (n.type === "comment") {
              Icon = MessageSquare;
              iconColor = "text-sky-500 bg-sky-50 dark:bg-sky-950/20";
              textSnippet = "commented on your post";
            } else if (n.type === "reply") {
              Icon = CornerDownRight;
              iconColor = "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20";
              textSnippet = "replied to your comment";
            } else if (n.type === "follow") {
              Icon = UserPlus;
              iconColor = "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20";
              textSnippet = "started following you";
            } else if (n.type === "message") {
              Icon = Mail;
              iconColor = "text-amber-500 bg-amber-50 dark:bg-amber-950/20";
              textSnippet = "sent you a secure message";
            }

            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`py-3.5 px-3 flex items-start gap-3 rounded-xl transition-all cursor-pointer border border-transparent hover:bg-gray-50/70 dark:hover:bg-slate-800/50 hover:border-gray-100 dark:hover:border-gray-800 ${!n.read ? "bg-indigo-50/10 border-indigo-100/10 dark:bg-indigo-950/5" : ""
                  }`}
                id={`notification-item-${n.id}`}
              >
                {/* Visual Icon Badge */}
                <div className={`p-2 rounded-xl flex-shrink-0 ${iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Senders Avatar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUserClick(n.senderId);
                  }}
                  className="flex-shrink-0 self-center hover:opacity-90"
                >
                  <img
                    src={n.sender?.profileImage || DEFAULT_AVATAR}
                    alt={n.sender?.displayName}
                    className="w-8 h-8 rounded-lg object-cover ring-2 ring-indigo-500/10"
                  />
                </button>

                {/* Notification core info statement */}
                <div className="flex-grow text-left">
                  <p className="text-xs text-gray-800 dark:text-gray-200 leading-snug">
                    <strong className="font-bold text-gray-900 dark:text-white mr-1">
                      {n.sender?.displayName || "Someone"}
                    </strong>
                    <span>{textSnippet}</span>
                    {n.extraContent && (
                      <div className="mt-1.5 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] italic text-slate-500 dark:text-slate-400 line-clamp-2">
                        "{n.extraContent}{n.extraContent.length >= 50 ? "..." : ""}"
                      </div>
                    )}
                  </p>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block mt-1">
                    {formatDistance(n.createdAt)}
                  </span>
                </div>

                {/* Unread indicator bulb */}
                {!n.read && (
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full flex-shrink-0 self-center animate-pulse mr-1" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
