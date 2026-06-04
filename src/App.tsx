import { useState, useEffect } from "react";
import { User, Post, Notification, Message, SearchFilters, DEFAULT_AVATAR } from "./types";
import { api } from "./utils/api";
import { Auth } from "./components/Auth";
import { Navbar } from "./components/Navbar";
import { Toast, ToastItem, ToastType } from "./components/Toast";
import { CreatePost } from "./components/CreatePost";
import { PostCard } from "./components/PostCard";
import { ProfileView } from "./components/ProfileView";
import { MessagingView } from "./components/MessagingView";
import { NotificationCenter } from "./components/NotificationCenter";
import { PostDetailsView } from "./components/PostDetailsView";
import { SearchView } from "./components/SearchView";

import { TrendingUp, UserPlus, HelpCircle, Check, Loader2, RefreshCw, Layers2, ShieldCheck, Plus, Image as ImageIcon, Video, Sparkles, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";



const TRENDING_TOPICS = [
  { tag: "photography", posts: "4.2K shares" },
  { tag: "traveling", posts: "1.8K shares" },
  { tag: "cooking", posts: "980 shares" },
  { tag: "fitness", posts: "2.5K shares" },
  { tag: "music", posts: "1.1K shares" },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Layout navigation states
  const [activeTab, setActiveTab] = useState<string>("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [chatContactId, setChatContactId] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // Creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<"post" | "clip">("post");
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createMediaFile, setCreateMediaFile] = useState<File | null>(null);
  const [createMediaPreview, setCreateMediaPreview] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Workspace lists states
  const [posts, setPosts] = useState<(Post & { author: any })[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<(Notification & { sender: any })[]>([]);
  const [suggestedFollows, setSuggestedFollows] = useState<User[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Notifications toasts helper list
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function showToast(message: string, type: ToastType = "info") {
    const freshId = "t_" + Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id: freshId, message, type }]);

    // Auto trigger remove toast after 4.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== freshId));
    }, 4500);
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // Load theme from localStorage on startup
  useEffect(() => {
    const historicalTheme = localStorage.getItem("connecthub_theme");
    const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const finalTheme = historicalTheme === "dark" || (!historicalTheme && sysDark) ? "dark" : "light";

    setTheme(finalTheme as "light" | "dark");
    if (finalTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("connecthub_theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    showToast(`Switched to ${nextTheme} theme mode`, "info");
  }

  // Startup: Recover sessions details
  async function restoreSession() {
    setLoading(true);
    try {
      const user = await api.me();
      if (user) {
        setCurrentUser(user);
        // Load initial values helper lists
        await Promise.all([
          fetchFeed(),
          fetchNotifications(),
          fetchSuggestions()
        ]);
      }
    } catch {
      showToast("Session expired, please register or sign in again.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    restoreSession();
  }, []);

  // Prevent parent overflow scrolling during active messaging view to allow local selection drag scrolling
  useEffect(() => {
    if (activeTab === "messages") {
      document.body.style.overflow = "hidden";
      document.body.style.height = "100vh";
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.height = "100vh";
    } else {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
    };
  }, [activeTab]);

  // Handle click-away and scroll to close creation menu
  useEffect(() => {
    if (!showCreateMenu) return;

    const handleInteraction = () => setShowCreateMenu(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowCreateMenu(false);
    };

    // Delay adding the click listener slightly to avoid immediate trigger from the button click
    const timer = setTimeout(() => {
      window.addEventListener("click", handleInteraction);
    }, 0);

    window.addEventListener("scroll", handleInteraction, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCreateMenu]);

  // Poll for notifications in the background every 15 seconds to simulate real-time notification updates
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
      try {
        const rawNotifications = await api.getNotifications();
        // Check if there are newly generated notifications to trigger a toast
        const previousUnreadsCount = notifications.filter((n) => !n.read).length;
        const currentUnreadsCount = rawNotifications.filter((n) => !n.read).length;

        if (currentUnreadsCount > previousUnreadsCount) {
          const newest = rawNotifications[0];
          if (newest && !newest.read && newest.senderId !== currentUser.id) {
            showToast(`New alert from ${newest.sender?.displayName || "Member"}!`, "info");
          }
        }
        setNotifications(rawNotifications);
      } catch {
        // Silent error to prevent disruptive popup warning loops in intervals
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [currentUser, notifications]);

  async function fetchFeed() {
    setFeedLoading(true);
    try {
      const loadedPosts = await api.getPosts();
      setPosts(loadedPosts);
      const likes = await api.getMyLikes();
      setLikedPostIds(likes);
    } catch {
      showToast("Feed synchronization faulted.", "error");
    } finally {
      setFeedLoading(false);
    }
  }

  async function fetchNotifications() {
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch {
      // Quiet fail
    }
  }

  async function fetchSuggestions() {
    try {
      const suggestions = await api.getSuggestions();
      setSuggestedFollows(suggestions);
    } catch {
      // Quiet fail
    }
  }

  function handleAuthSuccess(user: User) {
    setCurrentUser(user);
    // Fetch feed and suggestions
    fetchFeed();
    fetchNotifications();
    fetchSuggestions();
  }

  function handleLogout() {
    api.logout();
    setCurrentUser(null);
    setPosts([]);
    setNotifications([]);
    setSuggestedFollows([]);
    setSuggestedFollows([]);
    showToast("Logged out successfully.", "success");
  }

  // Hook triggered when liking toggled on subcomponents to update global arrays
  function handlePostLiked(postId: string, liked: boolean, count: number) {
    // Sync post lists liked metrics
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, likesCount: count } : p
      )
    );
    setLikedPostIds((prev) =>
      liked ? [...prev, postId] : prev.filter((id) => id !== postId)
    );
  }

  // Connection sidebar following toggler
  async function handleSidebarFollow(targetUser: User) {
    try {
      const res = await api.toggleFollow(targetUser.id);
      showToast(
        res.following ? `Now following ${targetUser.displayName}` : `Unfollowed ${targetUser.displayName}`,
        "success"
      );
      // Remove or mark from suggestions
      setSuggestedFollows((prev) => prev.filter((s) => s.id !== targetUser.id));
      if (currentUser) {
        setCurrentUser({ ...currentUser, followingCount: res.myFollowingCount });
      }
    } catch {
      showToast("Follow toggling failed.", "error");
    }
  }

  function handleUserClick(userId: string) {
    setProfileUserId(userId);
    setActiveTab("profile");
  }

  function handlePostClick(postId: string) {
    setSelectedPostId(postId);
    setActiveTab("post_details");
  }

  function handlePostCreated(newPost: Post & { author: any }) {
    setPosts((prev) => [newPost, ...prev]);
  }

  function handlePostDeleted(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  function openCreateModal(type: "post" | "clip") {
    setCreateType(type);
    setCreateTitle("");
    setCreateDescription("");
    setCreateMediaFile(null);
    setCreateMediaPreview(null);
    setShowCreateMenu(false);
    setShowCreateModal(true);
  }

  function handleMediaSelect(file: File) {
    setCreateMediaFile(file);
    const reader = new FileReader();
    reader.onload = () => setCreateMediaPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCreateSubmit() {
    if (!createMediaFile) {
      showToast("Please select a file to upload.", "error");
      return;
    }
    setCreateLoading(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(createMediaFile);
      });

      const content = createTitle.trim()
        ? `${createTitle.trim()}${createDescription.trim() ? '\n\n' + createDescription.trim() : ''}`
        : createDescription.trim() || (createType === "post" ? "Shared a photo" : "Shared a clip");

      const newPost = createType === "post"
        ? await api.createPost(content, dataUrl, undefined)
        : await api.createPost(content, undefined, dataUrl);

      handlePostCreated(newPost);
      showToast(`${createType === "post" ? "Post" : "Clip"} created successfully!`, "success");
      setShowCreateModal(false);
    } catch (err: any) {
      showToast(err.message || "Failed to create", "error");
    } finally {
      setCreateLoading(false);
    }
  }

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  // Poll in-memory unread private messages
  const unreadMessagesCount = 0; // Simulated messenger indicator count

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-250 font-sans ${activeTab === "messages" ? "h-screen overflow-hidden md:h-auto md:overflow-visible" : ""
      }`}>

      {/* 1. Global Toast Alerts Manager container */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* 2. Startup authentication restoration spinner overlay */}
      {loading ? (
        <div className="flex-grow flex flex-col items-center justify-center min-h-screen gap-3.5 bg-slate-50 dark:bg-slate-950">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <span className="absolute inset-0 m-auto bg-indigo-600 dark:bg-indigo-400 w-1.5 h-1.5 rounded-full" />
          </div>
          <div className="text-center font-sans">
            <h2 className="text-sm font-extrabold tracking-widest text-indigo-700 dark:text-indigo-200 uppercase">ConnectHub</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-1">Populating workspace secure environments...</p>
          </div>
        </div>
      ) : !currentUser ? (
        // 3. User Credentials Authenticator View
        <Auth onAuthSuccess={handleAuthSuccess} showToast={showToast} />
      ) : (
        // 4. Authenticated Workspace Shell Layout
        <div className="flex-grow flex flex-col">

          {/* Top Header Brand Bar */}
          <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-sm transition-colors duration-250 py-3 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <button onClick={() => { setProfileUserId(null); setActiveTab("feed"); }} className="flex items-center gap-2 group cursor-pointer" id="header-logo">
                <div className="bg-indigo-600 text-white w-7 h-7 rounded-lg flex items-center justify-center font-extrabold shadow-sm text-sm transition-transform group-hover:scale-105 active:scale-95">C</div>
                <span className="text-sm font-bold tracking-wide uppercase dark:text-white">ConnectHub</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hidden sm:block">
                  Social Network
                </div>

                {/* Global Creation Menu Trigger */}
                <div className="relative ml-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateMenu(!showCreateMenu)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-indigo-500/20 cursor-pointer"
                  >
                    <Plus className={`w-5 h-5 transition-transform ${showCreateMenu ? 'rotate-45' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showCreateMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => openCreateModal("post")}
                          className="w-full text-left px-4 py-2.5 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors group"
                        >
                          <ImageIcon className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                          <span>Post</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openCreateModal("clip")}
                          className="w-full text-left px-4 py-2.5 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors group"
                        >
                          <Video className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                          <span>Clip</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </header>

          {/* Creation Modal */}
          <AnimatePresence>
            {showCreateModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden"
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {createType === "post" ? (
                        <ImageIcon className="w-5 h-5 text-indigo-500" />
                      ) : (
                        <Video className="w-5 h-5 text-rose-500" />
                      )}
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Create {createType === "post" ? "Post" : "Clip"}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-5 h-5 rotate-45" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-5 space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Title</label>
                      <input
                        type="text"
                        placeholder={createType === "post" ? "Give your post a title..." : "Name your clip..."}
                        value={createTitle}
                        onChange={(e) => setCreateTitle(e.target.value)}
                        className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                        id="create-modal-title"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                      <textarea
                        placeholder="Add a description, thoughts, or hashtags..."
                        value={createDescription}
                        onChange={(e) => setCreateDescription(e.target.value)}
                        rows={3}
                        className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                        id="create-modal-description"
                      />
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        {createType === "post" ? "Image" : "Video"}
                      </label>
                      {!createMediaPreview ? (
                        <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-slate-400">
                          {createType === "post" ? (
                            <ImageIcon className="w-5 h-5 text-indigo-500" />
                          ) : (
                            <Video className="w-5 h-5 text-rose-500" />
                          )}
                          <span className="text-sm font-medium">
                            Click to select {createType === "post" ? "an image" : "a video"}
                          </span>
                          <input
                            type="file"
                            accept={createType === "post" ? "image/*" : "video/*"}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleMediaSelect(file);
                            }}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                          {createType === "post" ? (
                            <img src={createMediaPreview} alt="Preview" className="w-full max-h-48 object-cover" />
                          ) : (
                            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 text-sm text-slate-500">
                              <Video className="w-4 h-4 text-rose-500" />
                              <span>{createMediaFile?.name || "Video ready"}</span>
                            </div>
                          )}
                          <button
                            onClick={() => { setCreateMediaFile(null); setCreateMediaPreview(null); }}
                            className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 rotate-45" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-2 px-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateSubmit}
                      disabled={createLoading || !createMediaFile}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      id="create-modal-submit"
                    >
                      {createLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Publish {createType === "post" ? "Post" : "Clip"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>



          {/* Core Content Bento Grid */}
          <main className={`max-w-7xl w-full mx-auto flex-grow transition-all duration-200 ${activeTab === "messages"
            ? "px-[4px] py-0 pb-0 sm:px-6 lg:px-8 sm:py-6 sm:pb-24"
            : "px-4 sm:px-6 lg:px-8 py-6 pb-24"
            }`}>
            <div className={`grid grid-cols-1 md:grid-cols-12 items-start ${activeTab === "messages" ? "gap-0 md:gap-6 h-full md:h-auto" : "gap-6"
              }`}>

              {/* LEFT SIDEBAR COLUMN: Compact Own Profile Dashboard card (Visible on tablets + desktop) */}
              <div className="hidden md:block md:col-span-4 lg:col-span-3 space-y-4 text-left">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors text-center pb-5">
                  {/* Banner image mockup */}
                  <div className="h-16 w-full relative bg-indigo-900">
                    <img
                      src={currentUser.coverImage || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400"}
                      alt="Banner background"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Profile avatar frame */}
                  <div className="relative -mt-9 inline-block z-10">
                    <button
                      onClick={() => handleUserClick(currentUser.id)}
                      className="cursor-pointer hover:opacity-90 block"
                    >
                      <img
                        src={currentUser.profileImage || DEFAULT_AVATAR}
                        alt={currentUser.displayName}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover border-2 border-white dark:border-gray-900 bg-white"
                      />
                    </button>
                  </div>

                  {/* Identification text */}
                  <div className="px-4 mt-2">
                    <button
                      onClick={() => handleUserClick(currentUser.id)}
                      className="font-sans font-extrabold text-xs text-slate-950 dark:text-white hover:underline block mx-auto cursor-pointer"
                    >
                      {currentUser.displayName}
                    </button>
                    <p className="text-[10px] text-slate-400 font-semibold font-sans">@{currentUser.username}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 italic leading-normal border-t border-slate-100 dark:border-slate-800 pt-2 line-clamp-2 px-1">
                      {currentUser.bio || "No professional overview bio attached."}
                    </p>
                  </div>

                  {/* Connections Counts */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 px-4 text-xs font-semibold text-slate-500">
                    <button
                      onClick={() => handleUserClick(currentUser.id)}
                      className="text-center group cursor-pointer"
                    >
                      <p className="text-gray-905 dark:text-white font-extrabold text-sm group-hover:underline">
                        {currentUser.followersCount}
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">Followers</p>
                    </button>
                    <button
                      onClick={() => handleUserClick(currentUser.id)}
                      className="text-center group cursor-pointer"
                    >
                      <p className="text-gray-905 dark:text-white font-extrabold text-sm group-hover:underline">
                        {currentUser.followingCount}
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">Following</p>
                    </button>
                  </div>
                </div>

                {/* Left Drawer mini-links overview list */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-[11px] font-semibold text-slate-400 space-y-2 uppercase tracking-wide">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Layers2 className="w-3.5 h-3.5" />
                    <span>Workspace Nodes</span>
                  </div>
                  <button
                    onClick={() => setActiveTab("feed")}
                    className={`block w-full text-left py-1 hover:text-indigo-500 cursor-pointer ${activeTab === "feed" ? "text-indigo-600 font-extrabold pl-1.5 border-l-2 border-indigo-500" : ""
                      }`}
                  >
                    Home Feed Hub
                  </button>
                  <button
                    onClick={() => handleUserClick(currentUser.id)}
                    className={`block w-full text-left py-1 hover:text-indigo-500 cursor-pointer ${activeTab === "profile" && profileUserId === currentUser.id ? "text-indigo-600 font-extrabold pl-1.5 border-l-2 border-indigo-500" : ""
                      }`}
                  >
                    Your Profile Space
                  </button>
                  <button
                    onClick={() => {
                      setChatContactId(null);
                      setActiveTab("messages");
                    }}
                    className={`block w-full text-left py-1 hover:text-indigo-500 cursor-pointer ${activeTab === "messages" ? "text-indigo-600 font-extrabold pl-1.5 border-l-2 border-indigo-500" : ""
                      }`}
                  >
                    Workspace Chat
                  </button>
                </div>
              </div>

              {/* CENTER COLUMN: Central viewport routing node */}
              <div className={`col-span-1 md:col-span-8 lg:col-span-6 ${activeTab === "messages" ? "space-y-0 h-full md:space-y-5" : "space-y-5"
                }`}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab + (profileUserId || "") + (selectedPostId || "")}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.15 }}
                    className={activeTab === "messages" ? "h-full md:h-auto" : ""}
                  >
                    {/* FEED TAB */}
                    {activeTab === "feed" && (
                      <div className="space-y-5">
                        <CreatePost
                          currentUser={currentUser}
                          onPostCreated={handlePostCreated}
                          showToast={showToast}
                          createPostApi={api.createPost}
                        />

                        <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-3 px-4.5 rounded-xl text-left">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Connected Feed Board</span>
                          </span>

                          <button
                            type="button"
                            onClick={fetchFeed}
                            className="p-1 text-gray-400 hover:text-indigo-500 transition-colors cursor-pointer"
                            title="Reload feed logs"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${feedLoading ? "animate-spin" : ""}`} />
                          </button>
                        </div>

                        {feedLoading && posts.length === 0 ? (
                          <div className="space-y-4">
                            {[1, 2].map((i) => (
                              <div
                                key={i}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl animate-pulse space-y-3"
                              >
                                <div className="flex gap-2">
                                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                                  <div className="space-y-1.5 flex-grow">
                                    <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                                    <div className="h-3 w-4/12 bg-slate-200 dark:bg-slate-800 rounded" />
                                  </div>
                                </div>
                                <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl mt-2" />
                              </div>
                            ))}
                          </div>
                        ) : posts.length === 0 ? (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl text-center text-slate-400 italic text-xs">
                            Feed is empty. Join discussions or publish your thoughts to populate items!
                          </div>
                        ) : (
                          <div className="space-y-5">
                            {posts.map((post) => (
                              <div
                                key={post.id}
                                onClick={(e) => {
                                  // Click card redirects to Details View unless clicking interactive buttons/avatars inside
                                  const target = e.target as HTMLElement;
                                  if (!target.closest("button") && !target.closest("a") && !target.closest("input")) {
                                    handlePostClick(post.id);
                                  }
                                }}
                                className="cursor-pointer transition-transform hover:scale-[1.002]"
                              >
                                <PostCard
                                  post={post}
                                  currentUser={currentUser}
                                  onPostLiked={handlePostLiked}
                                  onPostDeleted={handlePostDeleted}
                                  onUserClick={handleUserClick}
                                  showToast={showToast}
                                  likedPostIds={likedPostIds}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* PROFILE TAB LAYOUT */}
                    {activeTab === "profile" && profileUserId && (
                      <ProfileView
                        userId={profileUserId}
                        currentUser={currentUser}
                        setCurrentUser={setCurrentUser}
                        showToast={showToast}
                        onPostLiked={handlePostLiked}
                        likedPostIds={likedPostIds}
                        setActiveTab={setActiveTab}
                        setChatContactId={setChatContactId}
                        onUserClick={handleUserClick}
                        theme={theme}
                        toggleTheme={toggleTheme}
                        onLogout={handleLogout}
                      />
                    )}

                    {/* DIRECT MESSAGING WORKSPACE */}
                    {activeTab === "messages" && (
                      <MessagingView
                        currentUser={currentUser}
                        chatContactId={chatContactId}
                        setChatContactId={setChatContactId}
                        showToast={showToast}
                      />
                    )}

                    {/* NOTIFICATION HUB */}
                    {activeTab === "notifications" && (
                      <NotificationCenter
                        notifications={notifications}
                        setNotifications={setNotifications}
                        currentUser={currentUser}
                        onUserClick={handleUserClick}
                        onPostClick={handlePostClick}
                        showToast={showToast}
                        setChatContactId={setChatContactId}
                        setActiveTab={setActiveTab}
                      />
                    )}

                    {/* DEEPER INSTAGRAM/X SINGLE POST DETAILS PAGE */}
                    {activeTab === "post_details" && selectedPostId && (
                      <PostDetailsView
                        postId={selectedPostId}
                        currentUser={currentUser}
                        onBackClick={() => setActiveTab("feed")}
                        onUserClick={handleUserClick}
                        showToast={showToast}
                        likedPostIds={likedPostIds}
                        onPostLiked={handlePostLiked}
                      />
                    )}

                    {/* INSTANT DEBOUNCED SEARCH VIEWER */}
                    {activeTab === "search" && (
                      <SearchView
                        currentUser={currentUser}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        onUserClick={handleUserClick}
                        showToast={showToast}
                        likedPostIds={likedPostIds}
                        onPostLiked={handlePostLiked}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* RIGHT SIDEBAR COLUMN: Trending Topics and Suggestions Sidebar (Visible on Desktop only) */}
              <div className="hidden lg:block lg:col-span-3 space-y-5 text-left">
                {/* 1. Discover suggested follow leads */}
                {suggestedFollows.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-indigo-500 animate-pulse" />
                      <span>Suggested Leads</span>
                    </h3>

                    <div className="space-y-3.5">
                      {suggestedFollows.map((user) => (
                        <div key={user.id} className="flex justify-between items-center gap-2">
                          <button
                            onClick={() => handleUserClick(user.id)}
                            className="flex gap-2 text-left hover:opacity-90 cursor-pointer flex-grow min-w-0"
                          >
                            <img
                              src={user.profileImage || DEFAULT_AVATAR}
                              alt={user.displayName}
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-0.5">
                                <span>{user.displayName}</span>
                                {user.followersCount > 1000 && <ShieldCheck className="w-3 h-3 text-indigo-500" />}
                              </p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate leading-tight">{user.bio || `@${user.username}`}</p>
                            </div>
                          </button>

                          <button
                            onClick={() => handleSidebarFollow(user)}
                            className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 hover:scale-101 py-1 px-2.5 rounded-lg transition-transform cursor-pointer flex-shrink-0"
                            id={`btn-sidebar-follow-${user.username}`}
                          >
                            Follow
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Trending hashtags and topics dashboard */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>Popular Topics</span>
                  </h3>

                  <div className="space-y-3.5">
                    {TRENDING_TOPICS.map((topic) => (
                      <button
                        key={topic.tag}
                        onClick={() => {
                          setSearchQuery(topic.tag);
                          setActiveTab("search");
                        }}
                        className="w-full text-left group cursor-pointer space-y-0.5 block"
                        id={`btn-topic-${topic.tag}`}
                      >
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 hover:underline">
                          #{topic.tag}
                        </p>
                        <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">{topic.posts}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Left Drawer Mini Platform Guidelines Help panel */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-2 text-left">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-500 block">Community Info</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    ConnectHub is a social space for sharing your life, thoughts, and moments with a global community. Be respectful and have fun!
                  </p>
                </div>
              </div>

            </div>
          </main>

          <Navbar
            currentUser={currentUser!}
            activeTab={profileUserId ? "profile" : activeTab}
            setActiveTab={(tab) => {
              setProfileUserId(null);
              setActiveTab(tab);
            }}
            setSearchQuery={() => { }}
            searchQuery=""
            unreadNotificationsCount={unreadNotificationsCount}
            unreadMessagesCount={unreadMessagesCount}
            onProfileClick={() => {
              setProfileUserId(currentUser!.id);
              setActiveTab("profile");
            }}
          />
        </div >
      )}
    </div >
  );
}
