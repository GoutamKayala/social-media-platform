import React, { useState, useEffect, useRef } from "react";
import { User, DEFAULT_AVATAR } from "../types";
import { api } from "../utils/api";
import { Send, UserCheck, MessageSquare, ShieldCheck, MailOpen, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";

interface MessagingViewProps {
  currentUser: User;
  chatContactId: string | null;
  setChatContactId: (id: string | null) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function MessagingView({ currentUser, chatContactId, setChatContactId, showToast }: MessagingViewProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [typedMessage, setTypedMessage] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Contacts list on startup
  async function loadContacts() {
    try {
      const res = await api.getContacts();
      setContacts(res);

      // If a chatContactId was passed from another view (like clicking DM on profile)
      if (chatContactId) {
        const matchingContact = res.find((c) => c.id === chatContactId);
        if (matchingContact) {
          setSelectedContact(matchingContact);
        } else {
          // If not in standard contacts list, fetch public profile first
          try {
            const profileRes = await api.getProfile(chatContactId);
            const freshContact = {
              id: profileRes.user.id,
              username: profileRes.user.username,
              displayName: profileRes.user.displayName,
              profileImage: profileRes.user.profileImage,
              bio: profileRes.user.bio,
              lastMessage: null,
            };
            setContacts((prev) => [freshContact, ...prev]);
            setSelectedContact(freshContact);
          } catch {
            showToast("Could not prepare message workspace.", "error");
          }
        }
      }
    } catch {
      showToast("Could not load contacts.", "error");
    } finally {
      setLoadingContacts(false);
    }
  }

  // Fetch discussions for currently active contact
  async function loadMessages(contactId: string, quiet = false) {
    if (!quiet) setLoadingMessages(true);
    try {
      const res = await api.getChatMessages(contactId);
      setMessages(res);
    } catch {
      if (!quiet) showToast("Failed to retrieve chat transcript.", "error");
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  }

  useEffect(() => {
    loadContacts();
  }, [chatContactId]);

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
      // Clear parent contact propagation id
      if (chatContactId !== selectedContact.id) {
        setChatContactId(selectedContact.id);
      }
    }
  }, [selectedContact]);

  // Set interval loop to poll new chat messages every 3000ms
  useEffect(() => {
    if (!selectedContact) return;

    const interval = setInterval(() => {
      loadMessages(selectedContact.id, true);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedContact]);

  // Scroll to bottom drawer on new message appends
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!typedMessage.trim() || !selectedContact) return;

    setSubmitLoading(true);
    const contentToSend = typedMessage.trim();
    try {
      const sentMsg = await api.sendMessage(selectedContact.id, contentToSend);
      setMessages((prev) => [...prev, sentMsg]);
      setTypedMessage("");

      // Update local contacts last message snippet
      setContacts((prev) =>
        prev.map((c) =>
          c.id === selectedContact.id
            ? {
              ...c,
              lastMessage: {
                content: contentToSend,
                createdAt: new Date().toISOString(),
                senderId: currentUser.id,
                read: true,
              },
            }
            : c
        )
      );
    } catch {
      showToast("Could not send private message.", "error");
    } finally {
      setSubmitLoading(false);
    }
  }

  function formatTime(isoString: string) {
    try {
      return new Date(isoString).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {
      return "";
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border-x-0 md:border border-slate-200 dark:border-slate-800 rounded-none md:rounded-2xl shadow-none md:shadow-sm overflow-hidden h-[calc(100vh-7.25rem)] md:h-[600px] flex transition-all duration-200 w-full">

      {/* 1. Left Contact Panel */}
      <div className={`w-full md:w-80 flex flex-col border-r border-slate-100 dark:border-slate-800 ${selectedContact ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Active Discussions</h2>
          <button
            type="button"
            onClick={loadContacts}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="Refresh contacts"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Contacts list */}
        <div className="flex-grow overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-1">
          {loadingContacts ? (
            <div className="p-4 text-center text-xs text-slate-400">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 italic font-medium">No connections established yet to start a discussion. Follow users to connect!</div>
          ) : (
            contacts.map((contact) => {
              const isActive = selectedContact && selectedContact.id === contact.id;
              // Mock active state by rendering sarah & alex as online, others offline
              const isOnline = contact.username === "sarah_ai" || contact.username === "alex_design" || contact.id === "1" || contact.id === "2";
              const isUnread = contact.lastMessage && !contact.lastMessage.read && contact.lastMessage.senderId !== currentUser.id;

              return (
                <button
                  type="button"
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-colors cursor-pointer ${isActive
                      ? "bg-indigo-50/80 dark:bg-indigo-950/20"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  id={`btn-contact-${contact.username}`}
                >
                  {/* Profile Indicator */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={contact.profileImage || DEFAULT_AVATAR}
                      alt={contact.displayName}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Message Snippet details */}
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate pr-1">
                        {contact.displayName}
                      </p>
                      {contact.lastMessage && (
                        <span className="text-[9px] font-mono text-slate-400">
                          {formatTime(contact.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] truncate leading-normal pr-4 ${isUnread
                        ? "text-indigo-600 dark:text-indigo-400 font-extrabold"
                        : "text-slate-400 dark:text-slate-500"
                      }`}>
                      {contact.lastMessage ? contact.lastMessage.content : contact.bio || "Click to open chat panel"}
                    </p>
                  </div>

                  {isUnread && (
                    <span className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-2 animate-pulse" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Right Conversation Screen Pane */}
      <div className={`flex-grow flex flex-col h-full bg-slate-50/10 dark:bg-slate-950/5 ${!selectedContact ? "hidden md:flex" : "flex"}`}>
        {selectedContact ? (
          <>
            {/* Header profile details */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm"
                  title="Back to contacts list"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-650 dark:text-slate-300" />
                </button>
                <img
                  src={selectedContact.profileImage || DEFAULT_AVATAR}
                  alt={selectedContact.displayName}
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-indigo-500/10"
                />
                <div className="text-left">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <span>{selectedContact.displayName}</span>
                    {selectedContact.followersCount && selectedContact.followersCount > 1000 && (
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-400 max-w-[200px] sm:max-w-md truncate font-medium">
                    @{selectedContact.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat message bubbles scroll window */}
            <div className="flex-grow p-4 overflow-y-auto space-y-3.5 bg-slate-50/30 dark:bg-slate-950/20">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex justify-center items-center h-full text-xs text-slate-400">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2" />
                  <span>Loading direct messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full text-center max-w-xs mx-auto p-4 space-y-2">
                  <MailOpen className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Secure Workspace Chat</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">This connection is secure and private. Express your thoughts, ask questions, or exchange credentials instantly.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed whitespace-pre-line relative ${isMe
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-150 dark:border-slate-800/85"
                        }`}>
                        <p>{msg.content}</p>
                        <p className={`text-[8px] font-mono text-right mt-1.5 block opacity-60 ${isMe ? "text-indigo-150" : "text-slate-400"}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom active text composer */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2 w-full">
              <input
                type="text"
                placeholder={`Type a secure message to ${selectedContact.displayName}...`}
                value={typedMessage}
                aria-label="Direct message content"
                onChange={(e) => setTypedMessage(e.target.value)}
                className="flex-grow px-3.5 py-2 text-base sm:text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 focus:outline-none focus:border-indigo-500 dark:text-white transition-colors"
                id="input-send-message"
              />
              <button
                type="submit"
                disabled={submitLoading || !typedMessage.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition-all disabled:opacity-40 cursor-pointer self-center"
                id="btn-send-message-submit"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col justify-center items-center h-full p-8 text-center space-y-3">
            <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-full">
              <MessageSquare className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Workspace Messenger</h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-medium">
              Select or search for a verified connect on the left panel to engage in full-fidelity secure private messaging.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
