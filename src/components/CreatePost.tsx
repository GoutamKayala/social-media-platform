import React, { useState } from "react";
import { User, Post, DEFAULT_AVATAR } from "../types";
import { Image as ImageIcon, Video, Send, Smile, Info, Link2, X } from "lucide-react";

interface CreatePostProps {
  currentUser: User;
  onPostCreated: (post: Post & { author: any }) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  createPostApi: (content: string, imageUrl?: string, videoUrl?: string) => Promise<Post & { author: any }>;
}

const PRESET_IMAGES = [
  { name: "Scenery", url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
  { name: "Cafe", url: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=800" },
  { name: "Art", url: "https://images.unsplash.com/photo-1541462608141-275d72e44051?w=800" },
  { name: "Nature", url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800" },
];

export function CreatePost({ currentUser, onPostCreated, showToast, createPostApi }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);

  const emojiButtons = ["💡", "🚀", "🔥", "🎨", "💻", "🧠", "✨", "📊"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      showToast("Please enter some text before posting.", "error");
      return;
    }

    setLoading(true);
    try {
      const newPost = await createPostApi(content, imageUrl || undefined, videoUrl || undefined);
      setContent("");
      setImageUrl("");
      setVideoUrl("");
      setShowImageInput(false);
      setShowVideoInput(false);
      onPostCreated(newPost);
      showToast("Post shared successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Could not publish post", "error");
    } finally {
      setLoading(false);
    }
  }

  function insertEmoji(emoji: string) {
    setContent((prev) => prev + " " + emoji);
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4 transition-colors">
      <div className="flex gap-4">
        {/* User avatar indicator */}
        <img
          src={currentUser.profileImage || DEFAULT_AVATAR}
          alt={currentUser.displayName}
          referrerPolicy="no-referrer"
          className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/10 flex-shrink-0"
        />

        {/* Input Textarea */}
        <div className="flex-grow">
          <textarea
            placeholder="What's on your mind? Share a thought, photo, or video..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full text-sm placeholder-gray-400 dark:placeholder-gray-500 bg-transparent text-gray-800 dark:text-gray-100 focus:outline-none resize-none leading-relaxed py-1"
          />
        </div>
      </div>

      {/* Attachment Inputs */}
      {showImageInput && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Upload Image from Device</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setImageUrl("");
                setShowImageInput(false);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <label className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-slate-500 dark:text-slate-400">
              <ImageIcon className="w-5 h-5 text-indigo-500" />
              <span className="text-sm">Click to select an image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setImageUrl(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          {imageUrl && (
            <div className="mt-2 relative rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 max-h-52 group">
              <img src={imageUrl} alt="Attaching preview" className="w-full object-cover max-h-52" />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {showVideoInput && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Video className="w-3.5 h-3.5 text-rose-500" />
              <span>Upload Video from Device</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setVideoUrl("");
                setShowVideoInput(false);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <label className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-slate-500 dark:text-slate-400">
            <Video className="w-5 h-5 text-rose-500" />
            <span className="text-sm">Click to select a video</span>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => setVideoUrl(reader.result as string);
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
            />
          </label>

          {videoUrl && (
            <div className="mt-2 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <Video className="w-3.5 h-3.5 text-rose-500" />
                <span>Video file ready to upload.</span>
              </div>
              <button type="button" onClick={() => setVideoUrl("")} className="text-rose-500 font-bold hover:underline">Remove</button>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-wrap justify-between items-center gap-3">
        {/* Buttons to attach stuff + Emojis */}
        <div className="flex gap-2 items-center flex-wrap">
          {/* Photos */}
          <button
            type="button"
            onClick={() => {
              setShowImageInput(true);
              setShowVideoInput(false);
            }}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${showImageInput
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
          >
            <ImageIcon className="w-4 h-4 text-sky-500" />
            <span>Post</span>
          </button>

          {/* Videos */}
          <button
            type="button"
            onClick={() => {
              setShowVideoInput(true);
              setShowImageInput(false);
            }}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${showVideoInput
              ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
          >
            <Video className="w-4 h-4 text-rose-500" />
            <span>Clip</span>
          </button>

          {/* Emojis list */}
          <div className="hidden sm:flex items-center gap-1 border-l border-slate-100 dark:border-slate-800 pl-2">
            {emojiButtons.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="hover:scale-125 transition-transform p-0.5 text-sm cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs py-1.5 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          id="btn-composer-submit"
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Post</span>
              <Send className="w-3 h-3" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
