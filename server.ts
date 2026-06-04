import express from "express";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "connecthub_secret_key_12345!";
// In-memory fallback for Vercel to ensure state exists even if files fail
let memoryDB: DBState | null = null;

// Determine the root of the project to find db.json
const dirname = path.dirname(new URL(import.meta.url).pathname);
const rootPath = process.platform === "win32" ? dirname.substring(1) : dirname;

const IS_VERCEL = !!process.env.VERCEL;
const BASE_DB_FILE = path.join(rootPath, "db.json");
const DB_FILE = IS_VERCEL ? path.join("/tmp", "db.json") : BASE_DB_FILE;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Type interfaces for local state
interface DBState {
  users: any[];
  posts: any[];
  comments: any[];
  followers: any[];
  likes: any[];
  notifications: any[];
  messages: any[];
}

// Store for pending OTP verifications
const pendingVerifications: Record<string, { code: string; expires: number }> = {};

// Initial DB state with rich mock profiles & posts to make it instantly alive
const initialDB: DBState = {
  users: [
    {
      id: "1",
      username: "admin",
      displayName: "ConnectHub Admin",
      email: "admin@connecthub.com",
      password: bcrypt.hashSync("admin123", 10),
      bio: "Founding member of ConnectHub. Here to help you connect!",
      location: "San Francisco, CA",
      website: "connecthub.com",
      profileImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      coverImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
      followersCount: 0,
      followingCount: 0,
      createdAt: new Date().toISOString()
    }
  ],
  posts: [],
  comments: [],
  followers: [],
  likes: [],
  notifications: [],
  messages: []
};

// Database Read/Write helpers
function readDB(): DBState {
  try {
    // 1. Try memory first if it's already initialized
    if (memoryDB) return memoryDB;

    // 2. Try filesystem
    if (!fs.existsSync(DB_FILE)) {
      console.log(`[DB] DB file not found at ${DB_FILE}, attempting initialization...`);
      // On Vercel, seed from root to /tmp if possible
      if (IS_VERCEL && fs.existsSync(BASE_DB_FILE)) {
        try {
          console.log(`[DB] Seeding /tmp/db.json from ${BASE_DB_FILE}`);
          const content = fs.readFileSync(BASE_DB_FILE);
          fs.writeFileSync(DB_FILE, content);
        } catch (seedError) {
          console.error("[DB] Failed to seed database to /tmp", seedError);
        }
      } else if (!IS_VERCEL) {
        console.log("[DB] Initializing new local database");
        fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf8");
        memoryDB = initialDB;
        return initialDB;
      }
    }

    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf8");
      memoryDB = JSON.parse(data);
      console.log(`[DB] Successfully loaded DB with ${memoryDB?.users.length} users`);
      return memoryDB!;
    }
  } catch (error) {
    console.error("[DB] Critical error reading database:", error);
  }

  // 3. Absolute fallback to initial mock state (prevents 500 crash)
  console.log("[DB] Fallback to initial memory state");
  memoryDB = initialDB;
  return initialDB;
}

function writeDB(data: DBState) {
  memoryDB = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    console.log(`[DB] Successfully saved DB to ${DB_FILE}`);
  } catch (err) {
    console.error("[DB] Error writing to database file (non-critical if in-memory works)", err);
  }
}

// Database initialization is handled lazily by the first API request

// Authentication middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
}

// API Routes

// 1. Auth Endpoint: Send OTP
app.post("/api/auth/send-otp", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pendingVerifications[email.toLowerCase()] = {
    code,
    expires: Date.now() + 10 * 60 * 1000 // 10 minutes
  };

  console.log(`[AUTH] OTP for ${email}: ${code}`);
  res.json({ success: true, message: "Verification code sent to your email" });
});

// 0. Diagnostic Endpoint
app.get("/api/status", (req, res) => {
  const db = readDB();
  res.json({
    status: "healthy",
    environment: IS_VERCEL ? "vercel" : "local",
    db_path: DB_FILE,
    users_count: db.users.length,
    timestamp: new Date().toISOString()
  });
});

// Auth Endpoint: Register (Simplified)
app.post("/api/auth/register", (req, res) => {
  const { username, displayName, email, password } = req.body;
  console.log(`[Auth] Register attempt for: ${email} (${username})`);

  if (!username || !displayName || !email || !password) {
    console.error("[Auth] Missing required fields for registration");
    return res.status(400).json({ error: "All fields are required" });
  }

  const emailLower = email.toLowerCase();
  const db = readDB();
  const emailExists = db.users.some(u => u.email.toLowerCase() === emailLower);
  const usernameExists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());

  if (emailExists) {
    console.error(`[Auth] Email already registered: ${emailLower}`);
    return res.status(400).json({ error: "Email is already registered" });
  }
  if (usernameExists) {
    console.error(`[Auth] Username already taken: ${username}`);
    return res.status(400).json({ error: "Username is already taken" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: String(db.users.length + 1),
    username: username.toLowerCase().replace(/\s+/g, ""),
    displayName,
    email,
    password: hashedPassword,
    bio: `Content creator sharing thoughts on ConnectHub! Joined in ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`,
    location: "",
    website: "",
    profileImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    coverImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
    followersCount: 0,
    followingCount: 0,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  delete pendingVerifications[emailLower];

  const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: "7d" });
  const { password: _, ...userWithoutPassword } = newUser;

  res.status(201).json({ token, user: userWithoutPassword });
});



// Auth Endpoint: Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  console.log(`[Auth] Login attempt for: ${email}`);

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.error(`[Auth] User not found: ${email}`);
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    console.error(`[Auth] Password mismatch for: ${email}`);
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
  const { password: _, ...userWithoutPassword } = user;

  res.json({ token, user: userWithoutPassword });
});

// Auth Endpoint: Get currently authenticated user
app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// 2. Feed: Get posts (optionally filtered by feed type or hashtag)
app.get("/api/posts", (req, res) => {
  const { hashtag, search } = req.query;
  const db = readDB();
  let filteredPosts = [...db.posts];

  if (hashtag) {
    const term = String(hashtag).toLowerCase();
    filteredPosts = filteredPosts.filter(p => p.content.toLowerCase().includes(`#${term}`));
  } else if (search) {
    const term = String(search).toLowerCase();
    filteredPosts = filteredPosts.filter(p => p.content.toLowerCase().includes(term));
  }

  // Stagger posts newest first
  filteredPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Attach user profile information for each post author
  const completedPosts = filteredPosts.map(p => {
    const author = db.users.find(u => u.id === p.userId);
    const authorInfo = author ? {
      id: author.id,
      username: author.username,
      displayName: author.displayName,
      profileImage: author.profileImage,
      bio: author.bio
    } : null;

    return {
      ...p,
      author: authorInfo
    };
  });

  res.json(completedPosts);
});

// Post creation endpoint
app.post("/api/posts", authenticateToken, (req: any, res) => {
  const { content, imageUrl, videoUrl } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Post content cannot be empty" });
  }

  const db = readDB();
  const newPost = {
    id: "p_" + Date.now(),
    userId: req.user.id,
    content: content.trim(),
    imageUrl: imageUrl || undefined,
    videoUrl: videoUrl || undefined,
    likesCount: 0,
    commentsCount: 0,
    createdAt: new Date().toISOString()
  };

  db.posts.push(newPost);
  writeDB(db);

  // Return completed post object with author details
  const author = db.users.find(u => u.id === req.user.id);
  const authorInfo = author ? {
    id: author.id,
    username: author.username,
    displayName: author.displayName,
    profileImage: author.profileImage,
    bio: author.bio
  } : null;

  res.status(201).json({
    ...newPost,
    author: authorInfo
  });
});

// Delete post endpoint
app.delete("/api/posts/:id", authenticateToken, (req: any, res) => {
  const db = readDB();
  const postIndex = db.posts.findIndex(p => p.id === req.params.id);

  if (postIndex === -1) {
    return res.status(404).json({ error: "Post not found" });
  }

  if (db.posts[postIndex].userId !== req.user.id) {
    return res.status(403).json({ error: "You can only delete your own posts" });
  }

  db.posts.splice(postIndex, 1);
  // Also remove associated likes and comments
  db.likes = db.likes.filter(l => l.postId !== req.params.id);
  db.comments = db.comments.filter(c => c.postId !== req.params.id);

  writeDB(db);
  res.json({ success: true, message: "Post deleted successfully" });
});

// Single Post details with Comments (including nested replies)
app.get("/api/posts/:id", (req, res) => {
  const db = readDB();
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  const author = db.users.find(u => u.id === post.userId);
  const authorInfo = author ? {
    id: author.id,
    username: author.username,
    displayName: author.displayName,
    profileImage: author.profileImage,
    bio: author.bio
  } : null;

  // Retrieve comments for this post
  const commentsForPost = db.comments.filter(c => c.postId === post.id);

  // Map commenters profiles onto comments
  const enrichedComments = commentsForPost.map(c => {
    const commenter = db.users.find(u => u.id === c.userId);
    return {
      ...c,
      author: commenter ? {
        id: commenter.id,
        username: commenter.username,
        displayName: commenter.displayName,
        profileImage: commenter.profileImage
      } : null
    };
  });

  res.json({
    post: { ...post, author: authorInfo },
    comments: enrichedComments
  });
});

// Like / unlike post toggler
app.post("/api/posts/:id/like", authenticateToken, (req: any, res) => {
  const db = readDB();
  const postIndex = db.posts.findIndex(p => p.id === req.params.id);
  if (postIndex === -1) {
    return res.status(404).json({ error: "Post not found" });
  }

  const post = db.posts[postIndex];
  const existingLikeIndex = db.likes.findIndex(l => l.userId === req.user.id && l.postId === post.id);

  let liked = false;
  if (existingLikeIndex > -1) {
    db.likes.splice(existingLikeIndex, 1);
    post.likesCount = Math.max(0, post.likesCount - 1);
  } else {
    db.likes.push({
      id: "l_" + Date.now(),
      userId: req.user.id,
      postId: post.id,
      createdAt: new Date().toISOString()
    });
    post.likesCount += 1;
    liked = true;

    // Create follow / like notification if liked other user's post
    if (post.userId !== req.user.id) {
      db.notifications.push({
        id: "n_" + Date.now(),
        userId: post.userId,
        type: "like",
        senderId: req.user.id,
        resourceId: post.id,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  writeDB(db);
  res.json({ liked, likesCount: post.likesCount });
});

// Delete a post
app.delete("/api/posts/:id", authenticateToken, (req: any, res) => {
  const db = readDB();
  const { id } = req.params;
  const postIndex = db.posts.findIndex((p: any) => p.id === id);

  if (postIndex === -1) {
    return res.status(404).json({ error: "Post not found" });
  }

  const post = db.posts[postIndex];

  // Only the author can delete the post
  if (post.userId !== req.user.id) {
    return res.status(403).json({ error: "Forbidden: You are not the author of this post" });
  }

  // Remove the post
  db.posts.splice(postIndex, 1);

  // Also remove related comments, likes, notifications
  db.comments = db.comments.filter((c: any) => c.postId !== id);
  db.likes = db.likes.filter((l: any) => l.postId !== id);
  db.notifications = db.notifications.filter((n: any) => n.resourceId !== id);

  writeDB(db);
  res.json({ success: true });
});

// Comment or reply on a post
app.post("/api/posts/:id/comments", authenticateToken, (req: any, res) => {
  const { content, parentCommentId } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Comment content is required" });
  }

  const db = readDB();
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  const newComment = {
    id: "c_" + Date.now(),
    postId: post.id,
    userId: req.user.id,
    content: content.trim(),
    parentCommentId: parentCommentId || undefined,
    createdAt: new Date().toISOString()
  };

  db.comments.push(newComment);
  post.commentsCount += 1;

  // Notification for original poster on new comment / reply
  if (post.userId !== req.user.id && !parentCommentId) {
    db.notifications.push({
      id: "n_" + Date.now(),
      userId: post.userId,
      type: "comment",
      senderId: req.user.id,
      resourceId: post.id,
      extraContent: content.trim().substring(0, 50),
      read: false,
      createdAt: new Date().toISOString()
    });
  } else if (parentCommentId) {
    // If it's a reply, notify the parent commenter
    const parentComment = db.comments.find(c => c.id === parentCommentId);
    if (parentComment && parentComment.userId !== req.user.id) {
      db.notifications.push({
        id: "n_" + Date.now(),
        userId: parentComment.userId,
        type: "reply",
        senderId: req.user.id,
        resourceId: post.id,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  writeDB(db);

  // Attach creator's profile
  const commenter = db.users.find(u => u.id === req.user.id);
  const fullComment = {
    ...newComment,
    author: commenter ? {
      id: commenter.id,
      username: commenter.username,
      displayName: commenter.displayName,
      profileImage: commenter.profileImage
    } : null
  };

  res.status(201).json(fullComment);
});

// 3. Profiles and Connections: Get raw user details
app.get("/api/users/suggestions", authenticateToken, (req: any, res) => {
  const db = readDB();
  // Filter out current user and the ones already followed
  const myFollowingIds = db.followers
    .filter(f => f.followerId === req.user.id)
    .map(f => f.followingId);

  const suggestions = db.users
    .filter(u => u.id !== req.user.id && !myFollowingIds.includes(u.id))
    .slice(0, 5)
    .map(({ password: _, ...rest }) => rest);

  res.json(suggestions);
});

// Search users & topics
app.get("/api/users/search", (req, res) => {
  const { query, type } = req.query;
  if (!query) {
    return res.json({ users: [], posts: [] });
  }

  const q = String(query).toLowerCase();
  const db = readDB();

  let matchedUsers: any[] = [];
  let matchedPosts: any[] = [];

  if (!type || type === "all" || type === "users") {
    matchedUsers = db.users
      .filter(u => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q) || (u.bio && u.bio.toLowerCase().includes(q)))
      .map(({ password: _, ...rest }) => rest);
  }

  if (!type || type === "all" || type === "posts" || type === "hashtags") {
    matchedPosts = db.posts
      .filter(p => p.content.toLowerCase().includes(q))
      .map(p => {
        const author = db.users.find(u => u.id === p.userId);
        return {
          ...p,
          author: author ? {
            id: author.id,
            username: author.username,
            displayName: author.displayName,
            profileImage: author.profileImage
          } : null
        };
      });
  }

  res.json({ users: matchedUsers, posts: matchedPosts });
});

// Get profiles
app.get("/api/users/:id", (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.params.id || u.username.toLowerCase() === req.params.id.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { password: _, ...userWithoutPassword } = user;

  // Get user's posts
  const userPosts = db.posts
    .filter(p => p.userId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(p => ({
      ...p,
      author: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        profileImage: user.profileImage
      }
    }));

  res.json({
    user: userWithoutPassword,
    posts: userPosts
  });
});

// Update Profile
app.put("/api/users/profile", authenticateToken, (req: any, res) => {
  const { displayName, bio, location, website, profileImage, coverImage } = req.body;
  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ error: "Display name cannot be empty" });
  }

  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  const updatedUser = {
    ...db.users[userIndex],
    displayName: displayName.trim(),
    bio: bio !== undefined ? bio.trim() : db.users[userIndex].bio,
    location: location !== undefined ? location.trim() : db.users[userIndex].location,
    website: website !== undefined ? website.trim() : db.users[userIndex].website,
    profileImage: profileImage !== undefined ? profileImage : db.users[userIndex].profileImage,
    coverImage: coverImage !== undefined ? coverImage : db.users[userIndex].coverImage,
  };

  db.users[userIndex] = updatedUser;
  writeDB(db);

  const { password: _, ...userWithoutPassword } = updatedUser;
  res.json(userWithoutPassword);
});

// Follow / Unfollow User Toggle
app.post("/api/users/:id/follow", authenticateToken, (req: any, res) => {
  if (req.user.id === req.params.id) {
    return res.status(400).json({ error: "You cannot follow yourself" });
  }

  const db = readDB();
  const me = db.users.find(u => u.id === req.user.id);
  const targetUser = db.users.find(u => u.id === req.params.id);

  if (!me || !targetUser) {
    return res.status(404).json({ error: "User not found" });
  }

  const existingFollowIndex = db.followers.findIndex(f => f.followerId === me.id && f.followingId === targetUser.id);
  let following = false;

  if (existingFollowIndex > -1) {
    db.followers.splice(existingFollowIndex, 1);
    me.followingCount = Math.max(0, me.followingCount - 1);
    targetUser.followersCount = Math.max(0, targetUser.followersCount - 1);
  } else {
    db.followers.push({
      id: "f_" + Date.now(),
      followerId: me.id,
      followingId: targetUser.id,
      createdAt: new Date().toISOString()
    });
    me.followingCount += 1;
    targetUser.followersCount += 1;
    following = true;

    // Create follow notification
    db.notifications.push({
      id: "n_" + Date.now(),
      userId: targetUser.id,
      type: "follow",
      senderId: me.id,
      read: false,
      createdAt: new Date().toISOString()
    });
  }

  writeDB(db);
  res.json({ following, targetUserFollowersCount: targetUser.followersCount, myFollowingCount: me.followingCount });
});

// Check if following target user
app.get("/api/users/:id/is-following", authenticateToken, (req: any, res) => {
  const db = readDB();
  const isFollowing = db.followers.some(f => f.followerId === req.user.id && f.followingId === req.params.id);
  res.json({ isFollowing });
});

// Likes validation: list of post IDs liked by current user
app.get("/api/likes/me", authenticateToken, (req: any, res) => {
  const db = readDB();
  const likedPostIds = db.likes.filter(l => l.userId === req.user.id).map(l => l.postId);
  res.json(likedPostIds);
});

// 4. Notifications route
app.get("/api/notifications", authenticateToken, (req: any, res) => {
  const db = readDB();
  const rawNotifications = db.notifications
    .filter(n => n.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Attach sender details to notifications
  const enrichedNotifications = rawNotifications.map(n => {
    const sender = db.users.find(u => u.id === n.senderId);
    return {
      ...n,
      sender: sender ? {
        id: sender.id,
        username: sender.username,
        displayName: sender.displayName,
        profileImage: sender.profileImage
      } : null
    };
  });

  res.json(enrichedNotifications);
});

// Mark items as read
app.post("/api/notifications/read", authenticateToken, (req: any, res) => {
  const db = readDB();
  db.notifications.forEach(n => {
    if (n.userId === req.user.id) {
      n.read = true;
    }
  });
  writeDB(db);
  res.json({ success: true });
});

// 5. Messaging routes (Real-time and direct interactions)
app.get("/api/messages/contacts", authenticateToken, (req: any, res) => {
  const db = readDB();
  // Find all users the current user has sent messages to or received messages from
  const messageUserIds = new Set<string>();
  db.messages.forEach(m => {
    if (m.senderId === req.user.id) {
      messageUserIds.add(m.receiverId);
    } else if (m.receiverId === req.user.id) {
      messageUserIds.add(m.senderId);
    }
  });

  // Make sure suggested follows / following exist
  const connectedUserIds = db.followers
    .filter(f => f.followerId === req.user.id || f.followingId === req.user.id)
    .map(f => f.followerId === req.user.id ? f.followingId : f.followerId);

  connectedUserIds.forEach(id => messageUserIds.add(id));

  const contacts = db.users
    .filter(u => u.id !== req.user.id && messageUserIds.has(u.id))
    .map(u => {
      // Find the last private message
      const lastMsg = db.messages
        .filter(m => (m.senderId === req.user.id && m.receiverId === u.id) || (m.senderId === u.id && m.receiverId === req.user.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        profileImage: u.profileImage,
        bio: u.bio,
        lastMessage: lastMsg ? {
          content: lastMsg.content,
          createdAt: lastMsg.createdAt,
          senderId: lastMsg.senderId,
          read: lastMsg.read
        } : null
      };
    });

  // Sort contacts by latest message timestamp
  contacts.sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  res.json(contacts);
});

// Get discussion messages
app.get("/api/messages/:userId", authenticateToken, (req: any, res) => {
  const db = readDB();
  const contactId = req.params.userId;
  const matchMessages = db.messages
    .filter(m => (m.senderId === req.user.id && m.receiverId === contactId) || (m.senderId === contactId && m.receiverId === req.user.id))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Mark caller's received messages as read
  let updated = false;
  db.messages.forEach(m => {
    if (m.senderId === contactId && m.receiverId === req.user.id && !m.read) {
      m.read = true;
      updated = true;
    }
  });

  if (updated) {
    writeDB(db);
  }

  res.json(matchMessages);
});

// Send private message
app.post("/api/messages", authenticateToken, (req: any, res) => {
  const { receiverId, content } = req.body;
  if (!receiverId || !content || !content.trim()) {
    return res.status(400).json({ error: "Receiver ID and message content are required" });
  }

  const db = readDB();
  const targetUserExists = db.users.some(u => u.id === receiverId);
  if (!targetUserExists) {
    return res.status(404).json({ error: "Receiver user not found" });
  }

  const newMessage = {
    id: "m_" + Date.now(),
    senderId: req.user.id,
    receiverId,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    read: false
  };

  db.messages.push(newMessage);

  // Send an alert of message type
  db.notifications.push({
    id: "n_msg_" + Date.now(),
    userId: receiverId,
    type: "message",
    senderId: req.user.id,
    resourceId: newMessage.id,
    read: false,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.status(201).json(newMessage);
});

// Export the app for Vercel serverless environment
export default app;

// Integrate custom Vite middleware for full stack application development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if not being imported as a module (e.g. by Vercel)
  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      const url = process.env.NODE_ENV === "production" ? "https://social-media-platform-1-i768.onrender.com" : `http://localhost:${PORT}`;
      console.log(`ConnectHub fullstack server running at ${url}`);
    });
  }
}

// Only start the server if we're not running on Vercel (which uses the export)
if (!process.env.VERCEL) {
  startServer();
}
