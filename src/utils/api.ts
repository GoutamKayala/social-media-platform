/// <reference types="vite/client" />
import { User, Post, Comment, Notification, Message, AuthResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

function getHeaders(): HeadersInit {
  const token = localStorage.getItem("connecthub_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  async register(params: any): Promise<AuthResponse> {
    console.log("[API] Registering user:", params.email);
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      console.error("[API] Registration failed:", data.error);
      throw new Error(data.error || "Failed to register");
    }
    localStorage.setItem("connecthub_token", data.token);
    return data;
  },

  async sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || "Failed to send verification code");
    }
    return data;
  },



  async login(params: any): Promise<AuthResponse> {
    console.log("[API] Logging in user:", params.email);
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      console.error("[API] Login failed:", data.error);
      throw new Error(data.error || "Failed to login");
    }
    localStorage.setItem("connecthub_token", data.token);
    return data;
  },

  async me(): Promise<User | null> {
    const token = localStorage.getItem("connecthub_token");
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        localStorage.removeItem("connecthub_token");
        return null;
      }
      return await safeJson(res);
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem("connecthub_token");
  },

  // Posts
  async getPosts(filters?: { hashtag?: string; search?: string }): Promise<(Post & { author: any })[]> {
    let url = `${API_BASE}/posts`;
    const params = new URLSearchParams();
    if (filters?.hashtag) params.append("hashtag", filters.hashtag);
    if (filters?.search) params.append("search", filters.search);
    const query = params.toString();
    if (query) url += `?${query}`;

    const res = await fetch(url, { headers: getHeaders() });
    return await safeJson(res);
  },

  async getPostDetails(id: string): Promise<{ post: Post & { author: any }; comments: (Comment & { author: any })[] }> {
    const res = await fetch(`${API_BASE}/posts/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Post not found");
    return await safeJson(res);
  },

  async createPost(content: string, imageUrl?: string, videoUrl?: string): Promise<Post & { author: any }> {
    const res = await fetch(`${API_BASE}/posts`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ content, imageUrl, videoUrl }),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || "Failed to create post");
    }
    return data;
  },

  async likePost(id: string): Promise<{ liked: boolean; likesCount: number }> {
    const res = await fetch(`${API_BASE}/posts/${id}/like`, {
      method: "POST",
      headers: getHeaders(),
    });
    return await safeJson(res);
  },

  async deletePost(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || "Failed to delete post");
    }
    return data;
  },

  async getMyLikes(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/likes/me`, { headers: getHeaders() });
    if (!res.ok) return [];
    return await safeJson(res);
  },

  async addComment(postId: string, content: string, parentCommentId?: string): Promise<Comment & { author: any }> {
    const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ content, parentCommentId }),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || "Failed to add comment");
    }
    return data;
  },

  // Users and Connections
  async getSuggestions(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users/suggestions`, { headers: getHeaders() });
    if (!res.ok) return [];
    return await safeJson(res);
  },

  async search(query: string, type: string = "all"): Promise<{ users: User[]; posts: (Post & { author: any })[] }> {
    const res = await fetch(`${API_BASE}/users/search?query=${encodeURIComponent(query)}&type=${type}`, {
      headers: getHeaders(),
    });
    return await safeJson(res);
  },

  async getProfile(id: string): Promise<{ user: User; posts: (Post & { author: any })[] }> {
    const res = await fetch(`${API_BASE}/users/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Profile not found");
    return await safeJson(res);
  },

  async updateProfile(profileData: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE}/users/profile`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(profileData),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || "Failed to update profile");
    }
    return data;
  },

  async toggleFollow(userId: string): Promise<{ following: boolean; targetUserFollowersCount: number; myFollowingCount: number }> {
    const res = await fetch(`${API_BASE}/users/${userId}/follow`, {
      method: "POST",
      headers: getHeaders(),
    });
    return await safeJson(res);
  },

  async checkFollowing(userId: string): Promise<{ isFollowing: boolean }> {
    const res = await fetch(`${API_BASE}/users/${userId}/is-following`, { headers: getHeaders() });
    return await safeJson(res);
  },

  // Notifications
  async getNotifications(): Promise<(Notification & { sender: any })[]> {
    const res = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
    if (!res.ok) return [];
    return await safeJson(res);
  },

  async markNotificationsRead(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/notifications/read`, {
      method: "POST",
      headers: getHeaders(),
    });
    return await safeJson(res);
  },

  // Messaging
  async getContacts(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/messages/contacts`, { headers: getHeaders() });
    if (!res.ok) return [];
    return await safeJson(res);
  },

  async getChatMessages(userId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/messages/${userId}`, { headers: getHeaders() });
    if (!res.ok) return [];
    return await safeJson(res);
  },

  async sendMessage(receiverId: string, content: string): Promise<any> {
    const res = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ receiverId, content }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return await safeJson(res);
  },
};
