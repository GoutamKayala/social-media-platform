import React, { useState, useEffect } from "react";
import { User, Post, DEFAULT_AVATAR } from "../types";
import { api } from "../utils/api";
import { Search, UserCheck, Check, Clock, Trash2, SlidersHorizontal, Hash, ArrowUpRight } from "lucide-react";
import { PostCard } from "./PostCard";

interface SearchViewProps {
  currentUser: User;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onUserClick: (userId: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  likedPostIds: string[];
  onPostLiked: (postId: string, liked: boolean, count: number) => void;
}

export function SearchView({
  currentUser,
  searchQuery,
  setSearchQuery,
  onUserClick,
  showToast,
  likedPostIds,
  onPostLiked,
}: SearchViewProps) {
  const [filterType, setFilterType] = useState<"all" | "users" | "posts" | "hashtags">("all");
  const [results, setResults] = useState<{ users: User[]; posts: (Post & { author: any })[] }>({ users: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const historical = localStorage.getItem("connecthub_recent_searches");
    if (historical) {
      try {
        setRecentSearches(JSON.parse(historical));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  // Save recent searches list
  function saveRecentSearch(q: string) {
    if (!q || !q.trim()) return;
    const term = q.trim();
    let updated = [term, ...recentSearches.filter((item) => item.toLowerCase() !== term.toLowerCase())];
    updated = updated.slice(0, 5); // Max 5 items
    setRecentSearches(updated);
    localStorage.setItem("connecthub_recent_searches", JSON.stringify(updated));
  }

  function clearRecentSearch(term: string) {
    const updated = recentSearches.filter((item) => item !== term);
    setRecentSearches(updated);
    localStorage.setItem("connecthub_recent_searches", JSON.stringify(updated));
  }

  function clearAllRecents() {
    setRecentSearches([]);
    localStorage.removeItem("connecthub_recent_searches");
  }

  async function performSearch(queryText: string) {
    if (!queryText || !queryText.trim()) return;
    setLoading(true);
    try {
      const res = await api.search(queryText, filterType);
      setResults(res);
      saveRecentSearch(queryText);
    } catch {
      showToast("Searching faulted, please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Trigger search on query text change
  useEffect(() => {
    if (searchQuery.trim()) {
      const delayDebounceFn = setTimeout(() => {
        performSearch(searchQuery);
      }, 400); // Debounce
      return () => clearTimeout(delayDebounceFn);
    } else {
      setResults({ users: [], posts: [] });
    }
  }, [searchQuery, filterType]);

  return (
    <div className="space-y-6">

      {/* Search Input block */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl shadow-sm space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            performSearch(searchQuery);
          }}
          className="relative flex items-center bg-gray-50/50 dark:bg-gray-950/60 rounded-xl px-3 border border-gray-100 dark:border-gray-800 focus-within:border-indigo-500/20"
        >
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search matching names, bio, posts, or #hashtags..."
            value={searchQuery}
            aria-label="Search string query"
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs py-3 px-2 dark:text-white focus:outline-none"
            id="search-view-input"
          />
        </form>

        {/* Filter categories tabs options */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-50 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider flex-wrap">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            <span>Filter categories:</span>
          </div>

          <div className="flex bg-gray-50 dark:bg-gray-950 p-1 rounded-xl flex-wrap">
            {(["all", "users", "posts", "hashtags"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`text-[11px] font-bold py-1 px-3 rounded-lg capitalize transition-colors cursor-pointer ${filterType === type
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-450 hover:text-gray-700"
                  }`}
                id={`btn-search-filter-${type}`}
              >
                {type === "all" ? "Everywhere" : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Searches Panel */}
      {recentSearches.length > 0 && !searchQuery && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl shadow-sm text-left">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>Recent Queries</span>
            </span>
            <button
              type="button"
              onClick={clearAllRecents}
              className="text-[10px] text-rose-500 font-bold hover:underline flex items-center gap-1 cursor-pointer uppercase tracking-wider"
              id="btn-clear-recent-all"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>

          <div className="flex flex-col gap-1">
            {recentSearches.map((term) => (
              <div
                key={term}
                className="flex justify-between items-center py-2 px-2.5 rounded-xl hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setSearchQuery(term)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-indigo-505 dark:hover:text-indigo-400 text-left cursor-pointer flex-grow"
                >
                  <Hash className="w-3.5 h-3.5 text-gray-400" />
                  <span>{term}</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 font-bold" />
                </button>
                <button
                  type="button"
                  onClick={() => clearRecentSearch(term)}
                  className="text-gray-450 hover:text-rose-500 p-1 cursor-pointer"
                  title="Remove query log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Workspace content */}
      <div className="space-y-4 text-left">
        {loading ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center space-y-2">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Gathering connected results...</p>
          </div>
        ) : searchQuery && results.users.length === 0 && results.posts.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center text-gray-500">
            <p className="text-xs font-bold mb-1">No matching nodes discovered</p>
            <p className="text-[11px] text-gray-400">Try checking spelling patterns or adjust filter parameters.</p>
          </div>
        ) : (
          <>
            {/* 1. Matches for Designers / Accounts */}
            {results.users.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl shadow-sm text-left space-y-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block border-b border-gray-50 dark:border-slate-800 pb-2">Matching Members ({results.users.length})</span>
                <div className="divide-y divide-gray-50 dark:divide-slate-800">
                  {results.users.map((u) => (
                    <div
                      key={u.id}
                      className="py-3 flex justify-between items-center gap-3 flex-wrap sm:flex-nowrap"
                    >
                      <button
                        type="button"
                        onClick={() => onUserClick(u.id)}
                        className="flex gap-3 text-left hover:opacity-90 cursor-pointer"
                      >
                        <img
                          src={u.profileImage || DEFAULT_AVATAR}
                          alt={u.displayName}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-bold text-xs text-gray-900 dark:text-white">{u.displayName}</p>
                          <p className="text-[10px] text-gray-400">@{u.username}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5 max-w-sm">{u.bio}</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onUserClick(u.id)}
                        className="text-[11px] font-bold text-indigo-500 hover:underline py-1 px-3 rounded bg-indigo-50/50 dark:bg-indigo-950/20 cursor-pointer"
                      >
                        Visit Profile
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Matches for Posts / Hashtags list */}
            {results.posts.length > 0 && (
              <div className="space-y-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-xl">Matching Posts ({results.posts.length})</span>
                {results.posts.map((post) => (
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
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
