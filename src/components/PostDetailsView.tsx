import React, { useState, useEffect } from "react";
import { Post, Comment, User, DEFAULT_AVATAR } from "../types";
import { ArrowLeft, MessageSquare, Heart, Share2, ThumbsUp, Send, CornerDownRight, Calendar, UserCheck } from "lucide-react";
import { api } from "../utils/api";

interface PostDetailsViewProps {
  postId: string;
  currentUser: User;
  onBackClick: () => void;
  onUserClick: (userId: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  likedPostIds: string[];
  onPostLiked: (postId: string, liked: boolean, count: number) => void;
}

export function PostDetailsView({
  postId,
  currentUser,
  onBackClick,
  onUserClick,
  showToast,
  likedPostIds,
  onPostLiked,
}: PostDetailsViewProps) {
  const [post, setPost] = useState<(Post & { author: any }) | null>(null);
  const [commentsList, setCommentsList] = useState<(Comment & { author: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(likedPostIds.includes(postId));
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  // Comments addition state
  const [newComment, setNewComment] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToUser, setReplyToUser] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Comment reactions local state
  const [commentReactions, setCommentReactions] = useState<{ [id: string]: boolean }>({});

  const formatDistance = (isoString: string) => {
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diff / (1000 * 60));
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "Recently";
    }
  };

  async function loadPostDetails() {
    setLoading(true);
    try {
      const res = await api.getPostDetails(postId);
      setPost(res.post);
      setCommentsList(res.comments);
      setLikesCount(res.post.likesCount);
      setLiked(likedPostIds.includes(res.post.id));
    } catch {
      showToast("Requested post Details failed to populate.", "error");
      onBackClick();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPostDetails();
  }, [postId]);

  async function handleLikeToggle() {
    if (!post || likeLoading) return;
    setLikeLoading(true);
    const prevLiked = liked;
    const prevCount = likesCount;

    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);

    try {
      const res = await api.likePost(post.id);
      setLiked(res.liked);
      setLikesCount(res.likesCount);
      onPostLiked(post.id, res.liked, res.likesCount);
    } catch {
      setLiked(prevLiked);
      setLikesCount(prevCount);
      showToast("Liking action faulted on the backend.", "error");
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !post) return;

    setSubmitLoading(true);
    try {
      const freshComment = await api.addComment(post.id, newComment, replyToId || undefined);
      setCommentsList((prev) => [...prev, freshComment]);
      setNewComment("");
      setReplyToId(null);
      setReplyToUser(null);
      showToast("Comment established!", "success");
    } catch {
      showToast("Could not submit comment details.", "error");
    } finally {
      setSubmitLoading(false);
    }
  }

  function handleReplyTrigger(comId: string, commenterName: string) {
    setReplyToId(comId);
    setReplyToUser(commenterName);
    const inputEl = document.getElementById("post-details-comment-input");
    if (inputEl) {
      inputEl.focus();
    }
  }

  function handleShareClick() {
    const shareUrl = `${window.location.origin}/posts/${postId}`;
    navigator.clipboard.writeText(shareUrl).then(
      () => showToast("Link saved to copyable clipboard!", "success"),
      () => showToast("Share URL: " + shareUrl, "info")
    );
  }

  function formatJoinDate(isoString: string) {
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diff / (1000 * 60));
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "Recently";
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex gap-2 items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 h-64 rounded-2xl p-6 space-y-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div className="space-y-2 flex-grow">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-3 w-4/12 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          </div>
          <div className="space-y-3 pt-4">
            <div className="h-4 w-full bg-gray-250 dark:bg-gray-800 rounded" />
            <div className="h-4 w-full bg-gray-250 dark:bg-gray-800 rounded" />
            <div className="h-4 w-8/12 bg-gray-250 dark:bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  const parents = commentsList.filter((c) => !c.parentCommentId);
  const getReplies = (parentId: string) => commentsList.filter((c) => c.parentCommentId === parentId);

  return (
    <div className="space-y-6">

      {/* Back button header navigation */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBackClick}
          className="p-2 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl cursor-pointer hover:shadow-sm transition-shadow flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300"
          id="btn-post-details-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>
        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Conversation Log</span>
      </div>

      {/* Main post layout Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">

        {/* Author Header details */}
        <div className="flex justify-between items-start flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onUserClick(post.userId)}
            className="flex gap-3 text-left hover:opacity-90 cursor-pointer"
          >
            <img
              src={post.author?.profileImage || DEFAULT_AVATAR}
              alt={post.author?.displayName}
              className="w-11 h-11 rounded-xl object-cover ring-2 ring-indigo-500/10"
            />
            <div>
              <div className="flex items-center gap-1">
                <span className="font-sans font-extrabold text-sm text-gray-900 dark:text-white">{post.author?.displayName}</span>
                <span className="text-xs text-gray-400 font-semibold font-sans">@{post.author?.username}</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-normal max-w-sm sm:max-w-md truncate font-medium">
                {post.author?.bio || "ConnectHub Member."}
              </p>
            </div>
          </button>

          <span className="text-[10px] font-mono text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-md self-center flex items-center gap-1 uppercase tracking-wider font-semibold">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>{formatJoinDate(post.createdAt)}</span>
          </span>
        </div>

        {/* Text paragraph */}
        <p className="text-sm sm:text-base text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-line select-text font-medium">
          {post.content}
        </p>

        {/* Custom Visual photo attachments */}
        {post.imageUrl && (
          <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800/80 bg-gray-50 dark:bg-gray-950/20 max-h-96">
            <img
              src={post.imageUrl}
              alt="Contribution visual context screenshot"
              className="w-full object-cover max-h-96"
            />
          </div>
        )}

        {/* Video direct embeds */}
        {post.videoUrl && (
          <div className="rounded-xl overflow-hidden aspect-video border border-gray-100 dark:border-gray-800 bg-black">
            <iframe
              src={post.videoUrl}
              title="Post video embed"
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        )}

        {/* Action Panel Metrix */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex items-center justify-between text-xs text-gray-400 font-bold uppercase">
          <span>{likesCount} {likesCount === 1 ? "Like" : "Likes"}</span>
          <span>{commentsList.length} {commentsList.length === 1 ? "Discussion" : "Discussions"}</span>
        </div>

        {/* Interactive Triggers */}
        <div className="border-t border-b border-gray-100 dark:border-gray-800 py-1 flex items-center justify-between">
          <button
            type="button"
            onClick={handleLikeToggle}
            className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${liked
                ? "text-rose-500 bg-rose-50/50 dark:bg-rose-950/20"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
            <span>{liked ? "Liked" : "Like"}</span>
          </button>

          <button
            type="button"
            onClick={handleShareClick}
            className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Link</span>
          </button>
        </div>

        {/* Comments Board Container */}
        <div className="space-y-4 pt-2 text-left">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Discussions Transcript</h3>

          {/* Comment Bubble Tree */}
          <div className="space-y-4 divide-y divide-gray-50 dark:divide-slate-800/30">
            {parents.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2 pl-1">No comments logged yet. Start the conversation below!</p>
            ) : (
              parents.map((com) => {
                const replies = getReplies(com.id);
                return (
                  <div key={com.id} className="pt-3 space-y-3.5">

                    {/* Primary Comment bubble */}
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => onUserClick(com.userId)}
                        className="flex-shrink-0 cursor-pointer hover:opacity-90"
                      >
                        <img
                          src={com.author?.profileImage || DEFAULT_AVATAR}
                          alt={com.author?.displayName}
                          className="w-7 h-7 rounded-lg object-cover"
                        />
                      </button>
                      <div className="flex-grow bg-gray-50/60 dark:bg-slate-800/50 p-3.5 rounded-2xl text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <button
                            type="button"
                            onClick={() => onUserClick(com.userId)}
                            className="font-bold text-gray-900 dark:text-gray-150 hover:underline text-left cursor-pointer"
                          >
                            {com.author?.displayName}
                          </button>
                          <span className="text-[10px] text-gray-400 font-semibold">{formatDistance(com.createdAt)}</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-200 leading-relaxed font-semibold pl-0.5 select-text">{com.content}</p>

                        <div className="flex items-center gap-3 pt-1.5 justify-start text-[9px] text-gray-400 font-bold uppercase">
                          <button
                            type="button"
                            onClick={() => {
                              setCommentReactions((prev) => ({ ...prev, [com.id]: !prev[com.id] }));
                            }}
                            className={`flex items-center gap-1 hover:text-indigo-500 cursor-pointer ${commentReactions[com.id] ? "text-indigo-500" : ""
                              }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>{commentReactions[com.id] ? "1 Reacted" : "React"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReplyTrigger(com.id, com.author?.displayName)}
                            className="hover:text-indigo-500 cursor-pointer"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Replies Indented list */}
                    {replies.length > 0 && (
                      <div className="pl-6 border-l border-indigo-100 dark:border-indigo-950 ml-3.5 space-y-3 pt-0.5">
                        {replies.map((rep) => (
                          <div key={rep.id} className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => onUserClick(rep.userId)}
                              className="flex-shrink-0 cursor-pointer hover:opacity-90"
                            >
                              <img
                                src={rep.author?.profileImage || DEFAULT_AVATAR}
                                alt={rep.author?.displayName}
                                className="w-6 h-6 rounded-md object-cover"
                              />
                            </button>
                            <div className="flex-grow bg-indigo-50/5 dark:bg-slate-800 p-2.5 rounded-xl text-xs space-y-1">
                              <div className="flex justify-between items-center">
                                <button
                                  type="button"
                                  onClick={() => onUserClick(rep.userId)}
                                  className="font-bold text-gray-900 dark:text-gray-200 hover:underline text-left cursor-pointer"
                                >
                                  {rep.author?.displayName}
                                </button>
                                <span className="text-[10px] text-gray-400">{formatDistance(rep.createdAt)}</span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-200 leading-normal flex items-start gap-1 select-text">
                                <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                                <span>{rep.content}</span>
                              </p>

                              <div className="flex items-center gap-3 pt-0.5 justify-start text-[9px] text-gray-400 font-bold uppercase">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCommentReactions((prev) => ({ ...prev, [rep.id]: !prev[rep.id] }));
                                  }}
                                  className={`flex items-center gap-1 hover:text-indigo-500 cursor-pointer ${commentReactions[rep.id] ? "text-indigo-500 animate-pulse" : ""
                                    }`}
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                  <span>{commentReactions[rep.id] ? "1 Reaction" : "React"}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Comment composer box */}
          <form onSubmit={handleCommentSubmit} className="flex gap-2.5 pt-4 border-t border-gray-100 dark:border-slate-800">
            <img
              src={currentUser.profileImage}
              alt={currentUser.displayName}
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0 self-center"
            />
            <div className="flex-grow relative flex items-center bg-gray-50 dark:bg-slate-800 rounded-xl px-3 border border-transparent focus-within:border-indigo-500/20">
              <input
                type="text"
                id="post-details-comment-input"
                placeholder={replyToId ? `Replying to ${replyToUser}...` : "Write a comment on this post..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full bg-transparent text-xs py-2.5 dark:text-white focus:outline-none placeholder-gray-400"
              />

              {replyToId && (
                <button
                  type="button"
                  onClick={() => {
                    setReplyToId(null);
                    setReplyToUser(null);
                  }}
                  className="text-[10px] text-gray-400 font-bold hover:underline absolute right-12 z-10 px-2"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={submitLoading || !newComment.trim()}
                className="text-indigo-500 hover:text-indigo-600 disabled:opacity-30 flex-shrink-0 ml-1 cursor-pointer"
                id="btn-post-details-comment-submit"
              >
                {submitLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
