import React, { useState, useEffect } from "react";
import { User, Post, DEFAULT_AVATAR } from "../types";
import { MapPin, Link as LinkIcon, Calendar, Edit2, Check, MessageSquare, Video, Grid, ThumbsUp, Camera, HelpCircle, X, ShieldCheck, Sun, Moon, LogOut, Sparkles } from "lucide-react";
import { api } from "../utils/api";
import { PostCard } from "./PostCard";
import { motion, AnimatePresence } from "motion/react";

interface ProfileViewProps {
  userId: string;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  onPostLiked: (postId: string, liked: boolean, count: number) => void;
  likedPostIds: string[];
  setActiveTab: (tab: string) => void;
  setChatContactId: (id: string | null) => void;
  onUserClick: (userId: string) => void;
  theme?: "light" | "dark";
  toggleTheme?: () => void;
  onLogout?: () => void;
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
];

const PRESET_COVERS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
  "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=800",
  "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800",
  "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800",
];

export function ProfileView({
  userId,
  currentUser,
  setCurrentUser,
  showToast,
  onPostLiked,
  likedPostIds,
  setActiveTab,
  setChatContactId,
  onUserClick,
  theme,
  toggleTheme,
  onLogout,
}: ProfileViewProps) {
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<(Post & { author: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"posts" | "clips">("posts");

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editProfileImage, setEditProfileImage] = useState("");
  const [editCoverImage, setEditCoverImage] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const coverFileInputRef = React.useRef<HTMLInputElement>(null);
  const photoFileInputRef = React.useRef<HTMLInputElement>(null);

  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const handleCoverUploadClick = () => {
    coverFileInputRef.current?.click();
  };

  const handlePhotoUploadClick = () => {
    photoFileInputRef.current?.click();
  };

  const processFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to parse file as string"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast("Uploading selected cover banner from device...", "info");
      const base64 = await processFile(file);
      const updatedUser = await api.updateProfile({
        displayName: profileUser!.displayName,
        coverImage: base64,
      });
      setCurrentUser(updatedUser);
      setProfileUser(updatedUser);
      setShowCoverModal(false);
      showToast("Cover banner synchronized successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to process cover file upload.", "error");
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast("Uploading selected profile image from device...", "info");
      const base64 = await processFile(file);
      const updatedUser = await api.updateProfile({
        displayName: profileUser!.displayName,
        profileImage: base64,
      });
      setCurrentUser(updatedUser);
      setProfileUser(updatedUser);
      setShowPhotoModal(false);
      showToast("Profile picture synchronized successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to process profile file upload.", "error");
    }
  };

  const handleDeleteCover = async () => {
    try {
      showToast("Deleting cover banner...", "info");
      const updatedUser = await api.updateProfile({
        displayName: profileUser!.displayName,
        coverImage: "",
      });
      setCurrentUser(updatedUser);
      setProfileUser(updatedUser);
      setShowCoverModal(false);
      showToast("Cover banner deleted successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to delete cover banner.", "error");
    }
  };

  const handleDeletePhoto = async () => {
    try {
      showToast("Deleting profile image...", "info");
      const updatedUser = await api.updateProfile({
        displayName: profileUser!.displayName,
        profileImage: "",
      });
      setCurrentUser(updatedUser);
      setProfileUser(updatedUser);
      setShowPhotoModal(false);
      showToast("Profile image deleted successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to delete profile photo.", "error");
    }
  };

  const isOwnProfile = currentUser.id === userId || (profileUser && currentUser.id === profileUser.id);

  async function fetchProfileData() {
    setLoading(true);
    try {
      const res = await api.getProfile(userId);
      setProfileUser(res.user);
      setPosts(res.posts);

      // Preset edit form values from fetched data
      setEditDisplayName(res.user.displayName);
      setEditBio(res.user.bio || "");
      setEditLocation(res.user.location || "");
      setEditWebsite(res.user.website || "");
      setEditProfileImage(res.user.profileImage || "");
      setEditCoverImage(res.user.coverImage || "");

      if (currentUser.id !== res.user.id) {
        const followState = await api.checkFollowing(res.user.id);
        setIsFollowing(followState.isFollowing);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to retrieve profile data.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  async function handleFollowToggle() {
    if (!profileUser || followLoading) return;
    setFollowLoading(true);
    try {
      const res = await api.toggleFollow(profileUser.id);
      setIsFollowing(res.following);
      setProfileUser({
        ...profileUser,
        followersCount: res.targetUserFollowersCount,
      });
      showToast(
        res.following ? `Now following ${profileUser.displayName}` : `Unfollowed ${profileUser.displayName}`,
        "success"
      );
    } catch {
      showToast("Follow toggle action could not resolve.", "error");
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editDisplayName.trim()) {
      showToast("Name value cannot be blank.", "error");
      return;
    }

    setEditLoading(true);
    try {
      const updatedUser = await api.updateProfile({
        displayName: editDisplayName.trim(),
        bio: editBio.trim(),
        location: editLocation.trim(),
        website: editWebsite.trim(),
        profileImage: editProfileImage,
        coverImage: editCoverImage,
      });
      setCurrentUser(updatedUser);
      setProfileUser(updatedUser);
      setIsEditing(false);
      showToast("Profile information synchronized successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Error syncing profile fields.", "error");
    } finally {
      setEditLoading(false);
    }
  }

  function handleMessageClick() {
    if (!profileUser) return;
    setChatContactId(profileUser.id);
    setActiveTab("messages");
  }

  function formatJoinDate(isoString: string) {
    try {
      return new Date(isoString).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch {
      return "Joined recently";
    }
  }

  // Filter posts by categories choice
  const displayedPosts = posts.filter((p) => {
    if (activeSubTab === "posts") return !p.videoUrl;
    if (activeSubTab === "clips") return !!p.videoUrl;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Cover Skeleton */}
        <div className="h-44 sm:h-52 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full" />
        <div className="px-6 flex justify-between">
          <div className="-mt-14 w-24 h-24 rounded-2xl bg-gray-300 dark:bg-gray-700 border-4 border-white dark:border-gray-900" />
          <div className="w-24 h-8 bg-gray-200 dark:bg-gray-800 rounded-lg mt-3" />
        </div>
        <div className="space-y-3 px-6">
          <div className="h-5 w-44 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-12 w-full bg-gray-200 dark:bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl text-center border border-slate-200 dark:border-slate-800 max-w-sm mx-auto">
        <X className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-900 dark:text-white mb-1">User not found</h3>
        <p className="text-gray-500 text-xs mb-4">The profile key requested does not reside in the current namespace.</p>
        <button
          type="button"
          onClick={() => setActiveTab("feed")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1.5 px-4 rounded-xl cursor-pointer"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Profile Card Shell */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
        {/* Cover Photo */}
        <div className="h-44 sm:h-52 w-full relative bg-indigo-900">
          <img
            src={profileUser.coverImage || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800"}
            alt="Profile cover banner background"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => setShowCoverModal(true)}
              className="absolute top-4 right-4 bg-black/50 text-white rounded-lg p-1.5 hover:bg-black/70 transition-colors cursor-pointer text-xs flex items-center gap-1.5 font-bold"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Modify</span>
            </button>
          )}
        </div>

        {/* Avatar & Relationship Actions Row */}
        <div className="px-6 flex flex-col sm:flex-row sm:justify-between items-start gap-4 pb-4">
          <div className="relative -mt-16 group">
            <img
              src={profileUser.profileImage || DEFAULT_AVATAR}
              alt={profileUser.displayName}
              referrerPolicy="no-referrer"
              className="w-28 h-28 rounded-2xl object-cover border-4 border-white dark:border-slate-950 shadow-md bg-slate-50 dark:bg-slate-800"
            />
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setShowPhotoModal(true)}
                className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] font-bold text-center py-1 rounded-b-xl hover:bg-black/85 transition-colors cursor-pointer"
              >
                Change Photo
              </button>
            )}
          </div>

          <div className="pt-3 flex gap-2 w-full sm:w-auto ml-auto">
            {isOwnProfile ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-1.5 py-1.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                id="btn-edit-profile-trigger"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <>
                {/* Follow toggler */}
                <button
                  type="button"
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`flex-grow sm:flex-grow-0 py-1.5 px-4 min-w-[100px] text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${isFollowing
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                  id="btn-follow-toggle"
                >
                  {isFollowing ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <span>Follow</span>
                  )}
                </button>

                {/* Direct message button */}
                <button
                  type="button"
                  onClick={handleMessageClick}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-slate-600 dark:text-slate-300"
                  id="btn-profile-message"
                  title="Direct Message"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Metadata Details */}
        <div className="px-6 pb-6 space-y-4">
          <div>
            <h1 className="text-xl font-sans font-extrabold text-gray-950 dark:text-white flex items-center gap-1.5">
              <span>{profileUser.displayName}</span>
              {profileUser.followersCount > 1000 && (
                <ShieldCheck className="w-5 h-5 text-indigo-500" title="ConnectHub Industry Expert" />
              )}
            </h1>
            <p className="text-sm font-semibold text-gray-400">@{profileUser.username}</p>
          </div>

          {profileUser.bio && (
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-semibold max-w-2xl select-text">
              {profileUser.bio}
            </p>
          )}

          {/* Location & Website details badges */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
            {profileUser.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{profileUser.location}</span>
              </span>
            )}
            {profileUser.website && (
              <span className="flex items-center gap-1 truncate max-w-sm">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-505" />
                <a
                  href={profileUser.website.startsWith("http") ? profileUser.website : `https://${profileUser.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline text-indigo-500 dark:text-indigo-400 normal-case"
                >
                  {profileUser.website}
                </a>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined {formatJoinDate(profileUser.createdAt)}</span>
            </span>
          </div>

          {/* Followers Metrix Count & Own settings section if own profile */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <div className="flex gap-6">
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white">{profileUser.followersCount} </span>
                <span className="text-slate-400">Followers</span>
              </div>
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white">{profileUser.followingCount} </span>
                <span className="text-slate-400">Following</span>
              </div>
            </div>

            {/* Profile Preferences & Workspace controls */}
            {isOwnProfile && (
              <div className="flex items-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                {/* Dark Mode toggle */}
                {toggleTheme && (
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/25 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="Switch Workspace Theme"
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-500 animate-[spin_3s_linear_infinite]" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>
                )}

                {/* Log Out button */}
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-950/30 bg-rose-50/50 dark:bg-rose-950/10 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="Sign Out of Session"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Posts tabs selection */}
      <div className="border-b border-slate-100 dark:border-slate-800 flex gap-4">
        <button
          type="button"
          onClick={() => setActiveSubTab("posts")}
          className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === "posts"
            ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold"
            : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          id="profile-tab-posts"
        >
          <Grid className="w-4 h-4" />
          <span>Posts ({posts.filter(p => !p.videoUrl).length})</span>
        </button>


        <button
          type="button"
          onClick={() => setActiveSubTab("clips")}
          className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === "clips"
            ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold"
            : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          id="profile-tab-clips"
        >
          <Video className="w-4 h-4" />
          <span>Clips ({posts.filter((p) => p.videoUrl).length})</span>
        </button>

      </div>

      {/* Main Post Cards */}
      <div className="space-y-4">
        {displayedPosts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs italic">
            There are no logs matching this tab selection.
          </div>
        ) : (
          displayedPosts.map((post) => (
            <div key={post.id}>
              <PostCard
                post={post}
                currentUser={currentUser}
                onPostLiked={onPostLiked}
                onUserClick={onUserClick}
                showToast={showToast}
                likedPostIds={likedPostIds}
              />
            </div>
          ))
        )}
      </div>

      {/* Edit Profile Modal Dialog */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl my-8">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              id="btn-close-edit-modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">Modify Profile Properties</h2>
            <p className="text-xs text-gray-400 mb-6 font-medium">Synchronize your display details across the ConnectHub workspace.</p>

            <form onSubmit={handleProfileSave} className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Display name *
                </label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  aria-label="Display Name"
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 bg-transparent rounded-xl text-sm dark:text-white focus:outline-none"
                  id="edit-display-name"
                />
              </div>

              {/* Biography */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Biography / Credentials
                </label>
                <textarea
                  value={editBio}
                  aria-label="Bio"
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell us what you do..."
                  rows={2}
                  className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 bg-transparent rounded-xl text-sm dark:text-white focus:outline-none resize-none leading-relaxed"
                  id="edit-bio"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Location */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    aria-label="Location"
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="London, UK"
                    className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 bg-transparent rounded-xl text-sm dark:text-white focus:outline-none"
                    id="edit-location"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Company / Portfolio URL
                  </label>
                  <input
                    type="text"
                    value={editWebsite}
                    aria-label="Website"
                    onChange={(e) => setEditWebsite(e.target.value)}
                    placeholder="stripe.com"
                    className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 bg-transparent rounded-xl text-sm dark:text-white focus:outline-none"
                    id="edit-website"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="font-bold text-xs py-2 px-4 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs py-2 px-5 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                  id="btn-save-profile"
                >
                  {editLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Save attributes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden Device File Inputs */}
      <input
        type="file"
        ref={coverFileInputRef}
        onChange={handleCoverFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={photoFileInputRef}
        onChange={handlePhotoFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* 1. Cover Photo Modifying Modal (Update or Delete only) */}
      <AnimatePresence>
        {showCoverModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl space-y-4"
            >
              <button
                onClick={() => setShowCoverModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center">
                <Camera className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                <h3 className="font-sans font-bold text-slate-900 dark:text-white text-lg">Modify Cover Picture</h3>
                <p className="text-xs text-slate-400 mt-1">Choose between uploading a banner from your device or removing the current cover.</p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCoverUploadClick}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Update Cover Pic</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteCover}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-450 border border-transparent font-bold text-sm rounded-xl transition-all cursor-pointer"
                >
                  <span>Delete Cover Pic</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCoverModal(false)}
                  className="w-full py-2.5 bg-transparent text-slate-400 text-xs font-semibold hover:text-slate-600 dark:hover:text-slate-250 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Profile Photo Modifying Modal (Update or Delete only) */}
      <AnimatePresence>
        {showPhotoModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl space-y-4"
            >
              <button
                onClick={() => setShowPhotoModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center">
                <Camera className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                <h3 className="font-sans font-bold text-slate-900 dark:text-white text-lg">Modify Profile Picture</h3>
                <p className="text-xs text-slate-400 mt-1">Choose between selecting a picture from your device or removing the current picture.</p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handlePhotoUploadClick}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Update Profile Pic</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeletePhoto}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-450 border border-transparent font-bold text-sm rounded-xl transition-all cursor-pointer"
                >
                  <span>Delete Profile Pic</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="w-full py-2.5 bg-transparent text-slate-400 text-xs font-semibold hover:text-slate-600 dark:hover:text-slate-250 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
