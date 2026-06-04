import React, { useState } from "react";
import { Post, Comment, User, DEFAULT_AVATAR } from "../types";
import { MessageSquare, Heart, Share2, CornerDownRight, ThumbsUp, Send, UserCheck, Calendar, Trash2, MoreVertical, X, AlertTriangle } from "lucide-react";
import { api } from "../utils/api";
import { motion, AnimatePresence } from "motion/react";

interface PostCardProps {
  post: Post & { author: any };
  currentUser: User;
  onPostLiked?: (postId: string, liked: boolean, count: number) => void;
  onPostDeleted?: (postId: string) => void;
  onUserClick: (userId: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  likedPostIds: string[];
}

export function PostCard({ post, currentUser, onPostLiked, onPostDeleted, onUserClick, showToast, likedPostIds }: PostCardProps) {
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [liked, setLiked] = useState(likedPostIds.includes(post.id));
  const [likeLoading, setLikeLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<(Comment & { author: any })[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Comment typing state
  const [newComment, setNewComment] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToUser, setReplyToUser] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Simple comment reactions state
  const [commentReactions, setCommentReactions] = useState<{ [commentId: string]: boolean }>({});

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  async function handleLike() {
    if (likeLoading) return;
    setLikeLoading(true);
    // Optimistic Update
    const prevLiked = liked;
    const prevCount = likesCount;

    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);

    try {
      const res = await api.likePost(post.id);
      setLiked(res.liked);
      setLikesCount(res.likesCount);
      if (onPostLiked) {
        onPostLiked(post.id, res.liked, res.likesCount);
      }
    } catch {
      setLiked(prevLiked);
      setLikesCount(prevCount);
      showToast("Could not register like", "error");
    } finally {
      setLikeLoading(false);
    }
  }

  async function loadComments() {
    setCommentsLoading(true);
    try {
      const res = await api.getPostDetails(post.id);
      setCommentsList(res.comments);
    } catch (err) {
      showToast("Failed to fetch comment string details.", "error");
    } finally {
      setCommentsLoading(false);
    }
  }

  function handleCommentIconToggle() {
    const nextState = !showComments;
    setShowComments(nextState);
    if (nextState) {
      loadComments();
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitLoading(true);
    try {
      const freshComment = await api.addComment(post.id, newComment, replyToId || undefined);
      setCommentsList((prev) => [...prev, freshComment]);
      setNewComment("");
      setReplyToId(null);
      setReplyToUser(null);
      showToast("Comment successfully attached!", "success");
    } catch (err: any) {
      showToast(err.message || "Could not publish comment", "error");
    } finally {
      setSubmitLoading(false);
    }
  }

  function handleReplyTrigger(commentId: string, commenterName: string) {
    setReplyToId(commentId);
    setReplyToUser(commenterName);
    // Focus typing box
    const el = document.getElementById(`reply-input-${post.id}`);
    if (el) {
      el.focus();
    }
  }

  function handleShare() {
    // Simulated system clipboard link share
    const link = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(link).then(
      () => showToast("Dispatched copyable direct link to your clipboard! 🔗", "success"),
      () => showToast("Failed to write to clipboard, share URL is: " + link, "info")
    );
  }

  function toggleCommentReaction(id: string) {
    setCommentReactions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  // Organize comments hierarchy
  // Base parent level comments
  const parents = commentsList.filter((c) => !c.parentCommentId);
  // Get children replies by parent ID
  const getReplies = (parentId: string) => commentsList.filter((c) => c.parentCommentId === parentId);

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await api.deletePost(post.id);
      showToast("Post removed permanently.", "success");
      setShowDeleteModal(false);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err: any) {
      showToast(err.message || "Failed to delete post", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">

        {/* Header Info */}
        <div className="flex justify-between items-start">
          <button
            onClick={() => onUserClick(post.userId)}
            className="flex gap-3 text-left hover:opacity-90 cursor-pointer"
          >
            <img
              src={post.author?.profileImage || DEFAULT_AVATAR}
              alt={post.author?.displayName || "Profile avatar"}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/10"
            />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-sans font-bold text-sm text-slate-900 dark:text-white hover:underline">
                  {post.author?.displayName || "ConnectHub Member"}
                </span>
                <span className="text-xs text-slate-400">@{post.author?.username || "anonymous"}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium max-w-[280px] sm:max-w-md truncate leading-snug mt-0.5">
                {post.author?.bio || "ConnectHub member."}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {post.userId === currentUser.id && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                title="Delete post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-md self-center flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span>{formatDistance(post.createdAt)}</span>
            </span>
          </div>
        </div>

        {/* Main Content Text */}
        <div className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line select-text">
          {post.content}
        </div>

        {/* Image attachments */}
        {post.imageUrl && (
          <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <img
              src={post.imageUrl}
              alt="Asset attachment"
              referrerPolicy="no-referrer"
              className="w-full object-cover max-h-96 hover:scale-[1.01] transition-transform duration-300"
              onError={(e) => {
                // Hide image layout container if load errors
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Video Attachments Embedded */}
        {post.videoUrl && (
          <div className="rounded-xl overflow-hidden aspect-video border border-slate-200 dark:border-slate-800 bg-black">
            <iframe
              src={post.videoUrl}
              title="Embedded video source"
              frameBorder="0"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Action panel metrics */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
          {/* Likes Count */}
          <span>{likesCount} {likesCount === 1 ? "Like" : "Likes"}</span>

          {/* Comments Count */}
          <button
            type="button"
            onClick={handleCommentIconToggle}
            className="hover:text-indigo-500 hover:underline cursor-pointer"
          >
            {commentsList.length > 0 ? commentsList.length : post.commentsCount} {(commentsList.length > 0 ? commentsList.length : post.commentsCount) === 1 ? "Comment" : "Comments"}
          </button>
        </div>

        {/* Action triggers */}
        <div className="border-t border-b border-slate-100 dark:border-slate-800 py-1 flex items-center justify-between">
          {/* Like trigger */}
          <button
            type="button"
            onClick={handleLike}
            className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${liked
              ? "text-rose-500 bg-rose-50/40 dark:bg-rose-950/20"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-700"
              }`}
            id={`btn-post-like-${post.id}`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
            <span>{liked ? "Liked" : "Like"}</span>
          </button>

          {/* Comment trigger */}
          <button
            type="button"
            onClick={handleCommentIconToggle}
            className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${showComments
              ? "text-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700"
              }`}
            id={`btn-post-comment-toggle-${post.id}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Comment</span>
          </button>

          {/* Share trigger */}
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-700 transition-colors cursor-pointer"
            id={`btn-post-share-${post.id}`}
          >
            <Share2 className="w-4 h-4" />
            <span>Share link</span>
          </button>
        </div>

        {/* Comments Drawer panel */}
        {showComments && (
          <div className="space-y-4 pt-1 transition-all">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Discussions</h3>

            {/* Loader status */}
            {commentsLoading && commentsList.length === 0 ? (
              <div className="flex gap-3 py-2 items-center text-xs text-gray-400">
                <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span>Fetching discussions...</span>
              </div>
            ) : commentsList.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-2">No comment logs. Be the first to add!</div>
            ) : (
              <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto pr-1">
                {parents.map((com) => {
                  const replies = getReplies(com.id);
                  return (
                    <div key={com.id} className="space-y-3 pb-3 pt-2">
                      {/* Parent Comment */}
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => onUserClick(com.userId)}
                          className="flex-shrink-0 cursor-pointer"
                        >
                          <img
                            src={com.author?.profileImage || DEFAULT_AVATAR}
                            alt={com.author?.displayName}
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                        </button>
                        <div className="flex-grow bg-gray-50/55 dark:bg-slate-800 p-3 rounded-2xl text-xs space-y-1 hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors">
                          <div className="flex justify-between items-center">
                            <button
                              onClick={() => onUserClick(com.userId)}
                              className="font-bold text-gray-800 dark:text-gray-150 hover:underline text-left cursor-pointer"
                            >
                              {com.author?.displayName}
                            </button>
                            <span className="text-[10px] text-gray-400">{formatDistance(com.createdAt)}</span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-200 leading-relaxed font-medium select-text">{com.content}</p>

                          {/* Reaction controls */}
                          <div className="flex items-center gap-3 pt-1.5 justify-start text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            <button
                              type="button"
                              onClick={() => toggleCommentReaction(com.id)}
                              className={`flex items-center gap-1 hover:text-indigo-500 cursor-pointer ${commentReactions[com.id] ? "text-indigo-500" : ""
                                }`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>{commentReactions[com.id] ? "1 Reaction" : "React"}</span>
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

                      {/* Recursive Nested Replies Indented */}
                      {replies.length > 0 && (
                        <div className="pl-6 space-y-3 border-l border-indigo-100 dark:border-indigo-950 ml-3.5 pt-1">
                          {replies.map((rep) => (
                            <div key={rep.id} className="flex items-start gap-2.5">
                              <button
                                type="button"
                                onClick={() => onUserClick(rep.userId)}
                                className="flex-shrink-0 cursor-pointer"
                              >
                                <img
                                  src={rep.author?.profileImage || DEFAULT_AVATAR}
                                  alt={rep.author?.displayName}
                                  className="w-6 h-6 rounded-md object-cover"
                                />
                              </button>
                              <div className="flex-grow bg-indigo-50/10 dark:bg-slate-800 p-2.5 rounded-xl text-xs space-y-1">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => onUserClick(rep.userId)}
                                      className="font-bold text-gray-800 dark:text-gray-150 hover:underline text-left cursor-pointer"
                                    >
                                      {rep.author?.displayName}
                                    </button>
                                    <span className="text-[10px] text-gray-400">replying</span>
                                  </div>
                                  <span className="text-[10px] text-gray-400">{formatDistance(rep.createdAt)}</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-200 leading-relaxed font-semibold flex items-center gap-1 select-text">
                                  <CornerDownRight className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                                  <span>{rep.content}</span>
                                </p>

                                {/* Nested replies reactions */}
                                <div className="flex items-center gap-3 pt-1 justify-start text-[9px] text-gray-400 font-bold uppercase">
                                  <button
                                    type="button"
                                    onClick={() => toggleCommentReaction(rep.id)}
                                    className={`flex items-center gap-1 hover:text-indigo-500 cursor-pointer ${commentReactions[rep.id] ? "text-indigo-500" : ""
                                      }`}
                                  >
                                    <ThumbsUp className="w-3 h-3" />
                                    <span>{commentReactions[rep.id] ? "1 Reacted" : "Like"}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Form write input comments */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2.5 pt-2 border-t border-slate-100 shadow-none dark:border-slate-800">
              <img
                src={currentUser.profileImage}
                alt="Current commenter"
                className="w-7 h-7 rounded-lg object-cover flex-shrink-0 self-center"
              />
              <div className="flex-grow relative flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 border border-transparent dark:border-slate-800">
                <input
                  type="text"
                  id={`reply-input-${post.id}`}
                  placeholder={replyToUser ? `Replying to ${replyToUser}...` : "Write a comment..."}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full bg-transparent text-xs py-2 dark:text-white focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
                />

                {replyToUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyToId(null);
                      setReplyToUser(null);
                    }}
                    className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold hover:underline absolute right-10 flex-shrink-0 px-2"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  disabled={submitLoading || !newComment.trim()}
                  className="text-indigo-500 hover:text-indigo-600 disabled:opacity-30 flex-shrink-0 ml-1 cursor-pointer"
                >
                  {submitLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Custom Deletion Confirmation Card Link style Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl space-y-5"
            >
              <button
                onClick={() => setShowDeleteModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center">
                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-bold text-slate-900 dark:text-white text-lg">Modify Post (Confirm Delete)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Are you sure you want to permanently remove this {post.videoUrl ? "clip" : "post"}? This action cannot be undone.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {deleteLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
