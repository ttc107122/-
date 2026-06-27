import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Compass, 
  Settings, 
  Plus, 
  Phone, 
  UserPlus, 
  Users, 
  Heart, 
  Send, 
  Trash2, 
  Edit, 
  X, 
  ChevronLeft, 
  Image as ImageIcon, 
  Check, 
  PhoneOff, 
  Clock, 
  Bookmark, 
  AlertTriangle, 
  Eye, 
  Key, 
  Globe, 
  User, 
  Maximize2 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Contact, Group, ChatMessage, MomentPost, UserProfile, APIConfig } from "./types";
import { 
  DEFAULT_USER, 
  INITIAL_CONTACTS, 
  INITIAL_MESSAGES, 
  INITIAL_POSTS, 
  DEFAULT_API_CONFIG,
  AVATAR_ME 
} from "./data";
import { 
  fetchAIChatResponse, 
  fetchAIMomentUpdate, 
  fetchAIMomentsReactions 
} from "./utils/aiClient";

export default function App() {
  // --- Core States & Databases ---
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("wechat_user_profile");
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem("wechat_contacts");
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem("wechat_groups");
    return saved ? JSON.parse(saved) : [];
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("wechat_messages");
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

  const [posts, setPosts] = useState<MomentPost[]>(() => {
    const saved = localStorage.getItem("wechat_posts");
    return saved ? JSON.parse(saved) : INITIAL_POSTS;
  });

  const [apiConfig, setApiConfig] = useState<APIConfig>(() => {
    const saved = localStorage.getItem("wechat_api_config");
    return saved ? JSON.parse(saved) : DEFAULT_API_CONFIG;
  });

  // --- UI Navigation & View State ---
  const [activeTab, setActiveTab] = useState<"chat" | "moments" | "settings">("chat");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null); // Contact ID or Group ID
  const [isGroupChat, setIsGroupChat] = useState<boolean>(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null); // For Contact Detail profile view
  
  // --- Modal & Overlay States ---
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState<string | null>(null); // holds contactId being edited
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  
  // --- Active Call State ---
  const [activeCall, setActiveCall] = useState<{ contact: Contact; duration: number } | null>(null);
  const [callMessages, setCallMessages] = useState<{ sender: 'me' | 'ai'; text: string }[]>([]);
  const [callInput, setCallInput] = useState("");
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Context Menu State ---
  const [contextMenu, setContextMenu] = useState<{
    contactId: string;
    x: number;
    y: number;
  } | null>(null);

  // --- Sub-View Filters ---
  const [chatSubView, setChatSubView] = useState<"recent" | "friends">("recent");

  // --- Input text binders ---
  const [chatInputText, setChatInputText] = useState("");
  const [isAIResponding, setIsAIResponding] = useState(false);

  // --- Dynamic Delay & Typing Detection States ---
  const [pendingAIResponse, setPendingAIResponse] = useState<{
    chatId: string;
    isGroup: boolean;
    prompt: string;
    sentTime: number;
  } | null>(null);
  const [isUserTyping, setIsUserTyping] = useState<boolean>(false);
  const lastActiveTypingTimeRef = useRef<number>(0);
  const lastTypingEndTimeRef = useRef<number>(Date.now());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Form Temporary States ---
  // Add Contact Form
  const [newContactName, setNewContactName] = useState("");
  const [newContactSignature, setNewContactSignature] = useState("");
  const [newContactPersona, setNewContactPersona] = useState("");
  const [newContactAvatar, setNewContactAvatar] = useState(AVATAR_ME);
  const [newContactShape, setNewContactShape] = useState<'rounded' | 'circle'>('rounded');

  // Create Group Form
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // User Profile Form
  const [tempUserName, setTempUserName] = useState("");
  const [tempUserAvatar, setTempUserAvatar] = useState("");
  const [tempUserSig, setTempUserSig] = useState("");
  const [tempUserState, setTempUserState] = useState("");
  const [tempUserPersona, setTempUserPersona] = useState("");

  // Create Post Form
  const [newPostContent, setNewPostContent] = useState("");

  // Comment Form States (posts mapped by id)
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

  // Auto scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Synchronize Storage ---
  useEffect(() => {
    localStorage.setItem("wechat_user_profile", JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem("wechat_contacts", JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem("wechat_groups", JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem("wechat_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("wechat_posts", JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem("wechat_api_config", JSON.stringify(apiConfig));
  }, [apiConfig]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentChatId, isAIResponding]);

  // Voice call timer
  useEffect(() => {
    if (activeCall) {
      callTimerRef.current = setInterval(() => {
        setActiveCall(prev => prev ? { ...prev, duration: prev.duration + 1 } : null);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [activeCall]);

  // --- Dynamic Delay & User Typing Detection Engine ---
  const triggerAIReplySequence = async (pending: {
    chatId: string;
    isGroup: boolean;
    prompt: string;
    sentTime: number;
  }) => {
    setPendingAIResponse(null);

    // Random delay between 1 and 40 seconds
    const randomSeconds = Math.floor(Math.random() * 40) + 1;
    console.log(`[AI Engine] User idle for 4s. Activating typing state for ${randomSeconds} seconds before replying.`);

    // Show typing status
    setIsAIResponding(true);

    // Wait for the random delay
    await new Promise(resolve => setTimeout(resolve, randomSeconds * 1000));

    try {
      if (pending.isGroup) {
        const group = groups.find(g => g.id === pending.chatId);
        if (group) {
          const groupContacts = contacts.filter(c => group.memberIds.includes(c.id));
          if (groupContacts.length > 0) {
            const replier = groupContacts[Math.floor(Math.random() * groupContacts.length)];
            const conversationHistory = messages
              .filter(m => m.chatId === pending.chatId)
              .map(m => ({
                role: m.senderId === "me" ? "user" as const : "assistant" as const,
                content: m.content
              }));

            const reply = await fetchAIChatResponse(
              conversationHistory,
              replier,
              userProfile.persona,
              apiConfig,
              group.name,
              groupContacts
            );

            const aiMsg: ChatMessage = {
              id: "msg_ai_" + Date.now(),
              chatId: pending.chatId,
              senderId: replier.id,
              senderName: replier.name,
              senderAvatar: replier.avatar,
              content: reply,
              timestamp: getCurrentFormattedTime(),
              type: "text"
            };

            setMessages(prev => [...prev, aiMsg]);
          }
        }
      } else {
        const contact = contacts.find(c => c.id === pending.chatId);
        if (contact) {
          const conversationHistory = messages
            .filter(m => m.chatId === pending.chatId)
            .map(m => ({
              role: m.senderId === "me" ? "user" as const : "assistant" as const,
              content: m.content
            }));

          const reply = await fetchAIChatResponse(
            conversationHistory,
            contact,
            userProfile.persona,
            apiConfig
          );

          const aiMsg: ChatMessage = {
            id: "msg_ai_" + Date.now(),
            chatId: pending.chatId,
            senderId: contact.id,
            senderName: contact.name,
            senderAvatar: contact.avatar,
            content: reply,
            timestamp: getCurrentFormattedTime(),
            type: "text"
          };

          setMessages(prev => [...prev, aiMsg]);
        }
      }
    } catch (err) {
      console.error("AI response error:", err);
    } finally {
      setIsAIResponding(false);
    }
  };

  useEffect(() => {
    if (!pendingAIResponse) return;

    const checkInterval = setInterval(() => {
      const now = Date.now();
      
      // Determine if user is typing
      const activeTyping = chatInputText.trim() !== "" && (now - lastActiveTypingTimeRef.current) < 2500;
      
      let typingEndedTime = lastTypingEndTimeRef.current;
      if (activeTyping) {
        lastTypingEndTimeRef.current = now;
        typingEndedTime = now;
      } else {
        if (chatInputText.trim() !== "") {
          typingEndedTime = lastActiveTypingTimeRef.current + 2500;
        } else {
          typingEndedTime = Math.max(pendingAIResponse.sentTime, lastTypingEndTimeRef.current);
        }
      }

      const idleDuration = now - typingEndedTime;
      
      if (idleDuration >= 4000) {
        clearInterval(checkInterval);
        triggerAIReplySequence(pendingAIResponse);
      }
    }, 200);

    return () => clearInterval(checkInterval);
  }, [pendingAIResponse, chatInputText, contacts, groups, messages, userProfile, apiConfig]);

  // --- Helper: Format Time ---
  const getCurrentFormattedTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // --- Contacts Pinning ---
  const handlePinContact = (contactId: string) => {
    setContacts(prev => prev.map(c => {
      if (c.id === contactId) {
        return { ...c, isPinned: !c.isPinned };
      }
      // Since Quick List can ONLY display one pinned contact, unpin all others if this one is pinned
      if (!c.isPinned) {
        return c; // If we are unpinning, no need to touch others
      }
      return { ...c, isPinned: false }; // Unpin previous pinned contact
    }));
    setContextMenu(null);
  };

  // --- Contacts Deletion ---
  const handleDeleteContact = (contactId: string) => {
    setContacts(prev => prev.filter(c => c.id !== contactId));
    // Clear chats associated with it
    setMessages(prev => prev.filter(m => m.chatId !== contactId));
    if (currentChatId === contactId) {
      setCurrentChatId(null);
    }
    setContextMenu(null);
  };

  // --- Contacts Addition ---
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) return;

    const newId = "contact_" + Date.now();
    const createdContact: Contact = {
      id: newId,
      name: newContactName,
      signature: newContactSignature || "Hello, I am using WeChat!",
      persona: newContactPersona || "一位溫和友善的對話夥伴。",
      avatar: newContactAvatar,
      avatarShape: newContactShape,
      postFrequency: "medium",
      isPinned: false
    };

    setContacts(prev => [...prev, createdContact]);
    
    // Auto generate an initial Moments update from this contact to make them feel alive
    setTimeout(async () => {
      const generatedStatus = await fetchAIMomentUpdate(createdContact, apiConfig);
      const newPost: MomentPost = {
        id: "post_" + Date.now(),
        authorId: createdContact.id,
        authorName: createdContact.name,
        authorAvatar: createdContact.avatar,
        authorAvatarShape: createdContact.avatarShape,
        content: generatedStatus,
        timestamp: "現在",
        likes: [],
        comments: []
      };
      setPosts(prev => [newPost, ...prev]);
    }, 1500);

    // Reset Form
    setNewContactName("");
    setNewContactSignature("");
    setNewContactPersona("");
    setNewContactAvatar(AVATAR_ME);
    setNewContactShape("rounded");
    setIsAddContactOpen(false);
  };

  // --- Group Creation ---
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || selectedMembers.length === 0) return;

    const newGroupId = "group_" + Date.now();
    const newGroup: Group = {
      id: newGroupId,
      name: newGroupName,
      memberIds: selectedMembers,
    };

    setGroups(prev => [...prev, newGroup]);
    
    // Add a welcome system message
    const welcomeMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      chatId: newGroupId,
      senderId: "system",
      senderName: "系統",
      senderAvatar: "",
      content: `群組「${newGroupName}」已創建。`,
      timestamp: getCurrentFormattedTime(),
      type: "system"
    };

    setMessages(prev => [...prev, welcomeMsg]);

    // Reset Form
    setNewGroupName("");
    setSelectedMembers([]);
    setIsCreateGroupOpen(false);
  };

  // --- Dynamic Moment AI Posting Engine (Simulated frequency on load or via timer) ---
  const triggerAICurrentStatusUpdate = async (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    // Fetch random AI status based on persona
    const updatedStatus = await fetchAIMomentUpdate(contact, apiConfig);
    
    // Replace latest status
    setContacts(prev => prev.map(c => {
      if (c.id === contactId) {
        return { ...c, lastGeneratedStatus: updatedStatus } as any;
      }
      return c;
    }));
    
    return updatedStatus;
  };

  // --- Create User Post & AI Responses ---
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const userPostId = "post_" + Date.now();
    const newPost: MomentPost = {
      id: userPostId,
      authorId: "me",
      authorName: userProfile.name,
      authorAvatar: userProfile.avatar,
      authorAvatarShape: "circle",
      content: newPostContent,
      timestamp: "現在",
      likes: [],
      comments: []
    };

    setPosts(prev => [newPost, ...prev]);
    setNewPostContent("");
    setIsNewPostOpen(false);

    // AI dynamic feedback based on persona
    const activeAIContacts = contacts.filter(c => c.postFrequency !== "none");
    if (activeAIContacts.length === 0) return;

    // Call server to fetch simulated reactions (likes and comments)
    const reactions = await fetchAIMomentsReactions(
      newPostContent,
      userProfile.persona,
      activeAIContacts,
      apiConfig
    );

    // Queue reactions with delay
    reactions.forEach(reaction => {
      setTimeout(() => {
        setPosts(prev => prev.map(p => {
          if (p.id !== userPostId) return p;
          
          let updatedLikes = [...p.likes];
          if (reaction.like && !updatedLikes.includes(reaction.contactName)) {
            updatedLikes.push(reaction.contactName);
          }

          let updatedComments = [...p.comments];
          if (reaction.comment && reaction.comment.trim()) {
            updatedComments.push({
              id: "comment_" + Date.now() + "_" + Math.random(),
              authorName: reaction.contactName,
              text: reaction.comment,
              timestamp: "現在"
            });
          }

          return {
            ...p,
            likes: updatedLikes,
            comments: updatedComments
          };
        }));
      }, reaction.delaySec * 1000);
    });
  };

  // --- Add Comment on timeline ---
  const handleAddComment = (postId: string, text: string) => {
    if (!text.trim()) return;

    const myComment = {
      id: "comment_me_" + Date.now(),
      authorName: userProfile.name,
      text: text,
      timestamp: "現在"
    };

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...p.comments, myComment]
        };
      }
      return p;
    }));

    // Reset comment input
    setCommentInputs(prev => ({ ...prev, [postId]: "" }));

    // AI response to user comment
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const postAuthor = contacts.find(c => c.id === post.authorId);
    if (postAuthor) {
      setTimeout(async () => {
        // AI reply back to comment
        const chatPrompt = `
User commented on your Moments post "${post.content}".
User's comment is: "${text}"
Your Character: ${postAuthor.name}
Your Persona: ${postAuthor.persona}

Write a very brief, friendly, single-sentence response to their comment as "${postAuthor.name}". Do not use quotes or headers. Keep it authentic to WeChat.
`;
        const aiReplyText = await fetchAIChatResponse(
          [{ role: "user", content: chatPrompt }],
          postAuthor,
          userProfile.persona,
          apiConfig
        );

        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: "comment_ai_" + Date.now(),
                  authorName: postAuthor.name,
                  text: `@${userProfile.name} ${aiReplyText}`,
                  timestamp: "現在"
                }
              ]
            };
          }
          return p;
        }));
      }, 3000);
    }
  };

  // --- Toggle Like on Moment Post ---
  const handleToggleLike = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const alreadyLiked = p.likes.includes(userProfile.name);
        return {
          ...p,
          likes: alreadyLiked 
            ? p.likes.filter(name => name !== userProfile.name)
            : [...p.likes, userProfile.name]
        };
      }
      return p;
    }));
  };

  // --- Send Active Chat Message ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim() || isAIResponding || !currentChatId) return;

    const userMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      chatId: currentChatId,
      senderId: "me",
      senderName: userProfile.name,
      senderAvatar: userProfile.avatar,
      content: chatInputText,
      timestamp: getCurrentFormattedTime(),
      type: "text"
    };

    setMessages(prev => [...prev, userMsg]);
    const promptToSend = chatInputText;
    setChatInputText("");

    // Clear user typing states immediately
    setIsUserTyping(false);
    lastTypingEndTimeRef.current = Date.now();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Queue response to detect idle state for 4s, then delay randomly and reply
    setPendingAIResponse(prev => {
      if (prev && prev.chatId === currentChatId) {
        return {
          ...prev,
          prompt: prev.prompt + "\n" + promptToSend,
          sentTime: Date.now()
        };
      }
      return {
        chatId: currentChatId,
        isGroup: isGroupChat,
        prompt: promptToSend,
        sentTime: Date.now()
      };
    });
  };

  // --- Voice Call Interactive Simulation ---
  const handleStartCall = (contact: Contact) => {
    setActiveCall({ contact, duration: 0 });
    setCallMessages([
      { sender: 'ai', text: `もしもし、つむぎ？どうしたの？` }
    ]);
  };

  const handleSendCallMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callInput.trim() || !activeCall) return;

    const userText = callInput;
    setCallMessages(prev => [...prev, { sender: 'me', text: userText }]);
    setCallInput("");

    // Simulate AI voice feedback
    const chatPrompt = `
User is speaking to you on an active WeChat voice call.
User says: "${userText}"
Respond directly, briefly, as if speaking on the phone. Keep it to a single conversational, colloquial sentence.
`;

    const reply = await fetchAIChatResponse(
      [{ role: "user", content: chatPrompt }],
      activeCall.contact,
      userProfile.persona,
      apiConfig
    );

    setCallMessages(prev => [...prev, { sender: 'ai', text: reply }]);
  };

  // --- Wipeout Database ---
  const handleWipeDatabase = () => {
    localStorage.clear();
    setUserProfile(DEFAULT_USER);
    setContacts(INITIAL_CONTACTS);
    setGroups([]);
    setMessages(INITIAL_MESSAGES);
    setPosts(INITIAL_POSTS);
    setApiConfig(DEFAULT_API_CONFIG);
    setCurrentChatId(null);
    setSelectedContactId(null);
    setActiveTab("chat");
    setIsDeleteAllOpen(false);
  };

  // --- Open Contact Profile & generate latest info dynamically ---
  const handleOpenContactProfile = async (contactId: string) => {
    setSelectedContactId(contactId);
    const targetContact = contacts.find(c => c.id === contactId);
    if (targetContact && !(targetContact as any).lastGeneratedStatus) {
      await triggerAICurrentStatusUpdate(contactId);
    }
  };

  // --- Handle Avatar File Upload Utility ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          callback(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Filtered lists for rendering ---
  const pinnedContact = contacts.find(c => c.isPinned);
  
  // Calculate chat list with last message metadata
  const getChatList = () => {
    const chats: {
      id: string;
      name: string;
      avatar: string;
      avatarShape: 'rounded' | 'circle';
      lastMessage: string;
      timestamp: string;
      isGroup: boolean;
    }[] = [];

    // Add private chats
    contacts.forEach(contact => {
      const chatMsgs = messages.filter(m => m.chatId === contact.id);
      if (chatMsgs.length > 0) {
        const lastMsg = chatMsgs[chatMsgs.length - 1];
        chats.push({
          id: contact.id,
          name: contact.name,
          avatar: contact.avatar,
          avatarShape: contact.avatarShape,
          lastMessage: lastMsg.content,
          timestamp: lastMsg.timestamp,
          isGroup: false
        });
      }
    });

    // Add group chats
    groups.forEach(group => {
      const chatMsgs = messages.filter(m => m.chatId === group.id);
      const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1].content : "No messages";
      const timestamp = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1].timestamp : "12:00";
      chats.push({
        id: group.id,
        name: group.name,
        avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23d199ad"/><text x="50" y="62" font-size="36" font-family="sans-serif" font-weight="bold" fill="%23ffffff" text-anchor="middle">G</text></svg>`,
        avatarShape: "rounded",
        lastMessage: lastMsg,
        timestamp: timestamp,
        isGroup: true
      });
    });

    return chats.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  };

  const recentChats = getChatList();

  return (
    <div id="app-root" className="min-h-screen bg-neutral-900 flex items-center justify-center p-2 sm:p-6 select-none font-sans overflow-x-hidden">
      {/* --- Smartphone Enclosure Frame --- */}
      <div className="w-full max-w-md h-[880px] bg-[#1a1a1a] rounded-[48px] border-8 border-neutral-800 shadow-2xl relative flex flex-col overflow-hidden text-neutral-800">
        
        {/* Notch Area */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-6 bg-black rounded-b-2xl z-50 flex items-center justify-center">
          <div className="w-12 h-1 bg-neutral-800 rounded-full mb-1"></div>
          <div className="w-3 h-3 bg-neutral-900 rounded-full absolute right-6 top-1.5 border border-neutral-800"></div>
        </div>

        {/* Status Bar */}
        <div className="h-8 bg-neutral-950 text-white flex justify-between items-center px-8 text-xs z-40 select-none">
          <div className="font-semibold tracking-tight">{getCurrentFormattedTime()}</div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">5G</span>
            <div className="w-5 h-2.5 border border-neutral-400 rounded-sm p-0.5 flex items-center">
              <div className="w-full h-full bg-emerald-400 rounded-2xs"></div>
            </div>
          </div>
        </div>

        {/* --- Main Screen Render Space --- */}
        <div className="flex-1 bg-[#f4f5f7] flex flex-col relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {/* 1. Chat Tab Content */}
            {activeTab === "chat" && !currentChatId && !selectedContactId && (
              <motion.div 
                key="tab-chat" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col h-full"
              >
                {/* WeChat Top bar */}
                <div className="h-14 bg-[#1f1f1f] text-white flex items-center justify-between px-5 shadow-md">
                  <div className="text-lg font-bold tracking-wide text-neutral-100 flex items-center space-x-2">
                    <span className="text-[#d199ad]">愛は風と共に昇る</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => setIsAddContactOpen(true)}
                      className="p-1.5 rounded-full hover:bg-neutral-800 transition text-[#d199ad]"
                      title="連絡先を追加"
                    >
                      <UserPlus size={20} />
                    </button>
                    <button 
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="p-1.5 rounded-full hover:bg-neutral-800 transition text-[#d199ad]"
                      title="グループ作成"
                    >
                      <Users size={20} />
                    </button>
                  </div>
                </div>

                {/* --- WeChat Sub-Navigation Menu ("中間往上一點有一行功能") --- */}
                <div className="bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-around text-xs font-medium text-neutral-600 shadow-2xs">
                  {/* Pinned / Quick List Display */}
                  <div className="flex flex-col items-center space-y-1 w-1/4">
                    <button 
                      onClick={() => {
                        if (pinnedContact) {
                          setCurrentChatId(pinnedContact.id);
                          setIsGroupChat(false);
                        } else {
                          alert("友達を長押しして「メニュー」から「ピン留め」を選択すると、ここに表示されます。");
                        }
                      }}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition ${
                        pinnedContact ? "bg-[#d199ad]/10 text-[#d199ad] border border-[#d199ad]/30" : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                      }`}
                    >
                      <Bookmark size={20} className={pinnedContact ? "fill-current" : ""} />
                    </button>
                    <span className="text-[10px] text-neutral-500 font-semibold truncate max-w-full">
                      {pinnedContact ? `${pinnedContact.name}` : "クイックリスト"}
                    </span>
                  </div>

                  {/* Groups Trigger */}
                  <div className="flex flex-col items-center space-y-1 w-1/4">
                    <button 
                      onClick={() => {
                        if (groups.length === 0) {
                          setIsCreateGroupOpen(true);
                        } else {
                          setChatSubView("recent");
                        }
                      }}
                      className="w-11 h-11 rounded-xl bg-neutral-100 text-neutral-600 hover:bg-neutral-200 flex items-center justify-center transition"
                    >
                      <Users size={20} />
                    </button>
                    <span className="text-[10px] text-neutral-500 font-semibold">グループ</span>
                  </div>

                  {/* Friends Trigger */}
                  <div className="flex flex-col items-center space-y-1 w-1/4">
                    <button 
                      onClick={() => setChatSubView(chatSubView === "friends" ? "recent" : "friends")}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition ${
                        chatSubView === "friends" ? "bg-[#1f1f1f] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      <User size={20} />
                    </button>
                    <span className="text-[10px] text-neutral-500 font-semibold">友達</span>
                  </div>

                  {/* Quick Add Contact Trigger */}
                  <div className="flex flex-col items-center space-y-1 w-1/4">
                    <button 
                      onClick={() => setIsAddContactOpen(true)}
                      className="w-11 h-11 rounded-xl bg-[#d199ad] text-white hover:opacity-90 flex items-center justify-center transition"
                    >
                      <Plus size={20} />
                    </button>
                    <span className="text-[10px] text-neutral-500 font-semibold">に追加</span>
                  </div>
                </div>

                {/* Chat Lists Area */}
                <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 bg-white">
                  {chatSubView === "recent" ? (
                    recentChats.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-neutral-400 p-6 text-center">
                        <MessageSquare size={48} className="text-neutral-300 mb-2" />
                        <p className="text-sm">チャット履歴はありません。</p>
                        <p className="text-xs text-neutral-400 mt-1">「友達」からメッセージを送信してください。</p>
                      </div>
                    ) : (
                      recentChats.map(chat => (
                        <div 
                          key={chat.id}
                          onClick={() => {
                            setCurrentChatId(chat.id);
                            setIsGroupChat(chat.isGroup);
                          }}
                          className="flex items-center px-4 py-3.5 hover:bg-neutral-50 cursor-pointer transition relative"
                        >
                          <img 
                            src={chat.avatar} 
                            alt={chat.name} 
                            className={`w-12 h-12 ${chat.avatarShape === 'circle' ? 'rounded-full' : 'rounded-xl'} border border-neutral-100 object-cover flex-shrink-0`}
                          />
                          <div className="ml-3 flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                              <h3 className="text-sm font-semibold text-neutral-800 truncate">{chat.name}</h3>
                              <span className="text-[10px] text-neutral-400">{chat.timestamp}</span>
                            </div>
                            <p className="text-xs text-neutral-500 truncate mt-0.5">{chat.lastMessage}</p>
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    // Friends List (友達)
                    contacts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-neutral-400 p-6 text-center">
                        <User size={48} className="text-neutral-300 mb-2" />
                        <p className="text-sm">連絡先が登録されていません。</p>
                        <button 
                          onClick={() => setIsAddContactOpen(true)}
                          className="mt-3 px-4 py-1.5 bg-[#d199ad] text-white rounded-lg text-xs font-semibold"
                        >
                          連絡先を追加
                        </button>
                      </div>
                    ) : (
                      contacts.map(contact => (
                        <div 
                          key={contact.id}
                          onClick={() => handleOpenContactProfile(contact.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              contactId: contact.id,
                              x: Math.min(e.clientX, window.innerWidth - 180),
                              y: Math.min(e.clientY, window.innerHeight - 150)
                            });
                          }}
                          onTouchStart={(e) => {
                            // Simple mobile long press simulator
                            const touch = e.touches[0];
                            const timer = setTimeout(() => {
                              setContextMenu({
                                contactId: contact.id,
                                x: Math.min(touch.clientX, window.innerWidth - 180),
                                y: Math.min(touch.clientY, window.innerHeight - 150)
                              });
                            }, 700);
                            e.currentTarget.addEventListener("touchend", () => clearTimeout(timer), { once: true });
                          }}
                          className="flex items-center px-4 py-3 hover:bg-neutral-50 cursor-pointer transition group"
                        >
                          <img 
                            src={contact.avatar} 
                            alt={contact.name} 
                            className={`w-11 h-11 ${contact.avatarShape === 'circle' ? 'rounded-full' : 'rounded-xl'} border border-neutral-100 object-cover flex-shrink-0`}
                          />
                          <div className="ml-3 flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-neutral-800 truncate">{contact.name}</h3>
                              {contact.isPinned && (
                                <span className="text-[10px] bg-[#d199ad]/10 text-[#d199ad] px-1.5 py-0.5 rounded font-semibold">ピン留め中</span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 truncate mt-0.5">{contact.signature}</p>
                          </div>
                          {/* Desktop menu trigger button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setContextMenu({
                                contactId: contact.id,
                                x: rect.left - 120,
                                y: rect.top + 30
                              });
                            }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-100 transition"
                          >
                            <span className="text-xs text-neutral-400">●●●</span>
                          </button>
                        </div>
                      ))
                    )
                  )}
                </div>
              </motion.div>
            )}

            {/* 2. Moments Tab Content */}
            {activeTab === "moments" && (
              <motion.div 
                key="tab-moments" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col h-full bg-[#f8f9fa] overflow-y-auto"
              >
                {/* Header */}
                <div className="h-14 bg-[#1f1f1f] text-white flex items-center justify-between px-5 shadow-md flex-shrink-0 sticky top-0 z-10">
                  <span className="text-lg font-bold tracking-wide">最新情報 (Moments)</span>
                  <button 
                    onClick={() => setIsNewPostOpen(true)}
                    className="p-1.5 rounded-full hover:bg-neutral-800 transition text-[#d199ad]"
                  >
                    <Plus size={22} />
                  </button>
                </div>

                {/* Profile Cover Banner */}
                <div className="relative h-44 bg-gradient-to-br from-[#d199ad] to-[#1f1f1f] flex-shrink-0">
                  <div className="absolute right-6 -bottom-6 flex items-end space-x-3 z-10">
                    <div className="text-right pb-2">
                      <h2 className="text-sm font-bold text-neutral-800 bg-white/80 backdrop-blur-md px-2 py-0.5 rounded shadow-sm">{userProfile.name}</h2>
                      <p className="text-[10px] text-neutral-500 max-w-[150px] truncate mt-0.5 bg-white/60 px-1.5 py-0.5 rounded">{userProfile.signature}</p>
                    </div>
                    <img 
                      src={userProfile.avatar} 
                      alt="Me" 
                      className="w-16 h-16 rounded-xl border-2 border-white shadow-md object-cover bg-neutral-100"
                    />
                  </div>
                  <div className="absolute left-4 bottom-3 bg-black/40 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-full font-semibold">
                    {userProfile.state}
                  </div>
                </div>

                {/* Margin Divider */}
                <div className="h-10 flex-shrink-0"></div>

                {/* Timeline Feed */}
                <div className="px-4 py-2 space-y-4 pb-20">
                  {posts.length === 0 ? (
                    <div className="text-center text-neutral-400 py-10">
                      <Compass size={40} className="mx-auto text-neutral-300 mb-2" />
                      <p className="text-sm">動態はまだありません。</p>
                    </div>
                  ) : (
                    posts.map(post => (
                      <div key={post.id} className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-100/60">
                        {/* Author Info */}
                        <div className="flex items-start">
                          <img 
                            src={post.authorAvatar} 
                            alt={post.authorName} 
                            className={`w-10 h-10 ${post.authorAvatarShape === 'circle' ? 'rounded-full' : 'rounded-lg'} object-cover border border-neutral-100 flex-shrink-0`}
                          />
                          <div className="ml-3 flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-neutral-800">{post.authorName}</h4>
                            <span className="text-[9px] text-neutral-400 block mt-0.5">{post.timestamp}</span>
                            <p className="text-xs text-neutral-700 leading-relaxed mt-2 whitespace-pre-wrap">{post.content}</p>
                          </div>
                        </div>

                        {/* Action buttons (Like & Comment) */}
                        <div className="flex items-center justify-end space-x-4 mt-3 border-t border-neutral-50 pt-2 text-neutral-500">
                          <button 
                            onClick={() => handleToggleLike(post.id)}
                            className={`flex items-center space-x-1.5 text-[11px] font-semibold transition ${
                              post.likes.includes(userProfile.name) ? "text-[#d199ad]" : "hover:text-[#d199ad]"
                            }`}
                          >
                            <Heart size={14} className={post.likes.includes(userProfile.name) ? "fill-current" : ""} />
                            <span>{post.likes.length > 0 ? `いいね (${post.likes.length})` : "いいね"}</span>
                          </button>
                        </div>

                        {/* Likes List */}
                        {post.likes.length > 0 && (
                          <div className="bg-[#f8f9fa] rounded-lg p-2 mt-2 flex items-center space-x-1 text-[10px] text-neutral-600 border border-neutral-100/50">
                            <Heart size={10} className="text-[#d199ad] fill-current" />
                            <span className="font-semibold">{post.likes.join(", ")}</span>
                          </div>
                        )}

                        {/* Comments Block */}
                        <div className="mt-2.5 bg-[#f8f9fa] rounded-xl p-2.5 space-y-1.5 text-[10px] border border-neutral-100/40">
                          {post.comments.length > 0 && (
                            <div className="space-y-1 divide-y divide-neutral-100/50 pb-2">
                              {post.comments.map(c => (
                                <div key={c.id} className="py-1">
                                  <span className="font-bold text-neutral-800">{c.authorName}: </span>
                                  <span className="text-neutral-600 leading-normal">{c.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Inline comment inputs */}
                          <div className="flex items-center mt-1 border-t border-neutral-100/60 pt-1.5">
                            <input 
                              type="text" 
                              placeholder="コメントを入力..." 
                              value={commentInputs[post.id] || ""}
                              onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddComment(post.id, commentInputs[post.id] || "");
                                }
                              }}
                              className="flex-1 bg-white border border-neutral-200 rounded-lg px-2 py-1 text-[10px] focus:outline-hidden focus:border-[#d199ad]"
                            />
                            <button 
                              onClick={() => handleAddComment(post.id, commentInputs[post.id] || "")}
                              className="ml-1.5 p-1 text-[#d199ad] hover:opacity-85 transition"
                            >
                              <Send size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* 3. Settings Tab Content */}
            {activeTab === "settings" && (
              <motion.div 
                key="tab-settings" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col h-full bg-white overflow-y-auto"
              >
                {/* Header */}
                <div className="h-14 bg-[#1f1f1f] text-white flex items-center px-5 shadow-md flex-shrink-0">
                  <span className="text-lg font-bold tracking-wide">設定 (Settings)</span>
                </div>

                {/* Profile Widget */}
                <div className="p-6 bg-gradient-to-r from-neutral-50 to-neutral-100 border-b border-neutral-100 flex items-center space-x-4">
                  <img 
                    src={userProfile.avatar} 
                    alt="Me" 
                    className="w-16 h-16 rounded-2xl border-2 border-[#d199ad] object-cover bg-neutral-100 shadow-xs"
                  />
                  <div>
                    <h2 className="text-base font-bold text-neutral-800">{userProfile.name}</h2>
                    <p className="text-xs text-neutral-500 mt-1">{userProfile.signature}</p>
                    <span className="inline-block mt-2 bg-[#d199ad]/10 text-[#d199ad] text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
                      {userProfile.state}
                    </span>
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="p-5 space-y-4">
                  
                  {/* Option 1: Profile Manager */}
                  <button 
                    onClick={() => {
                      setTempUserName(userProfile.name);
                      setTempUserAvatar(userProfile.avatar);
                      setTempUserSig(userProfile.signature);
                      setTempUserState(userProfile.state);
                      setTempUserPersona(userProfile.persona);
                      setIsUserProfileOpen(true);
                    }}
                    className="w-full bg-[#fcf9fa] border border-[#d199ad]/20 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-[#fbf4f6] transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-[#d199ad]/15 text-[#d199ad] flex items-center justify-center">
                        <User size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-800">ユーザーマスク</h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5">自分の状態、人設を編集</p>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-400 group-hover:text-[#d199ad] transition">編輯 →</span>
                  </button>

                  {/* Option 2: API Keys Config */}
                  <button 
                    onClick={() => setIsApiSettingsOpen(true)}
                    className="w-full bg-[#f9fafc] border border-neutral-200 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-neutral-50 transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                        <Globe size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-800">API設定 (Groq / OpenAI)</h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5">模型端點與 API 密鑰設置</p>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-400 group-hover:text-blue-500 transition">設定 →</span>
                  </button>

                  {/* Option 3: Wipe Storage Database */}
                  <button 
                    onClick={() => setIsDeleteAllOpen(true)}
                    className="w-full bg-red-50/50 border border-red-100 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-red-50 transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-red-100 text-red-500 flex items-center justify-center">
                        <Trash2 size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-red-600">すべてのデータを削除する</h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5">全聯絡人、對話、動態資料清空</p>
                      </div>
                    </div>
                    <span className="text-xs text-red-400 group-hover:text-red-600 transition">リセット →</span>
                  </button>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* --- Bottom Navigation Bar --- */}
          <div className="h-16 bg-[#1f1f1f] text-neutral-400 border-t border-neutral-800 flex items-center justify-around flex-shrink-0 z-10">
            <button 
              onClick={() => {
                setActiveTab("chat");
                setCurrentChatId(null);
                setSelectedContactId(null);
              }}
              className={`flex flex-col items-center justify-center w-20 h-full transition ${activeTab === "chat" ? "text-[#d199ad]" : "hover:text-neutral-200"}`}
            >
              <MessageSquare size={20} className={activeTab === "chat" ? "scale-110" : ""} />
              <span className="text-[9px] mt-1 font-semibold">チャット</span>
            </button>
            <button 
              onClick={() => {
                setActiveTab("moments");
                setCurrentChatId(null);
                setSelectedContactId(null);
              }}
              className={`flex flex-col items-center justify-center w-20 h-full transition ${activeTab === "moments" ? "text-[#d199ad]" : "hover:text-neutral-200"}`}
            >
              <Compass size={20} className={activeTab === "moments" ? "scale-110" : ""} />
              <span className="text-[9px] mt-1 font-semibold">最新情報</span>
            </button>
            <button 
              onClick={() => {
                setActiveTab("settings");
                setCurrentChatId(null);
                setSelectedContactId(null);
              }}
              className={`flex flex-col items-center justify-center w-20 h-full transition ${activeTab === "settings" ? "text-[#d199ad]" : "hover:text-neutral-200"}`}
            >
              <Settings size={20} className={activeTab === "settings" ? "scale-110" : ""} />
              <span className="text-[9px] mt-1 font-semibold">設定</span>
            </button>
          </div>

          {/* ==============================================
              SUB-SCREEN 1: ACTIVE CHAT SCREEN 
             ============================================== */}
          <AnimatePresence>
            {currentChatId && (
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                style={{
                  background: !isGroupChat && contacts.find(c => c.id === currentChatId)?.chatBg 
                    ? `url(${contacts.find(c => c.id === currentChatId)?.chatBg}) center/cover no-repeat` 
                    : "#f4f5f7"
                }}
                className="absolute inset-0 z-30 flex flex-col"
              >
                {/* Chat Top bar */}
                <div className="h-14 bg-[#1f1f1f] text-white flex items-center justify-between px-4 shadow-md flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setCurrentChatId(null)}
                      className="p-1 hover:bg-neutral-800 rounded-full transition"
                    >
                      <ChevronLeft size={24} className="text-[#d199ad]" />
                    </button>
                    <span className="font-bold text-sm truncate max-w-[180px] flex items-center">
                      <span className="truncate">
                        {isGroupChat 
                          ? groups.find(g => g.id === currentChatId)?.name 
                          : contacts.find(c => c.id === currentChatId)?.name
                        }
                      </span>
                      {pendingAIResponse && pendingAIResponse.chatId === currentChatId && (
                        <span className="text-[10px] text-amber-400 font-normal ml-1.5 flex-shrink-0 animate-pulse">
                          {isUserTyping ? "(正在輸入...)" : "(等待您輸入結束...)"}
                        </span>
                      )}
                      {isAIResponding && (
                        <span className="text-[10px] text-emerald-400 font-normal ml-1.5 flex-shrink-0 animate-pulse">
                          (相手が入力中...)
                        </span>
                      )}
                    </span>
                  </div>
                  
                  {/* Call and Config Actions */}
                  <div className="flex items-center space-x-2">
                    {!isGroupChat && (
                      <button 
                        onClick={() => {
                          const contact = contacts.find(c => c.id === currentChatId);
                          if (contact) handleStartCall(contact);
                        }}
                        className="p-2 rounded-full hover:bg-neutral-800 transition text-[#d199ad]"
                        title="語音通話"
                      >
                        <Phone size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (!isGroupChat) {
                          setIsEditContactOpen(currentChatId);
                        } else {
                          alert("グループ詳細編集は今後のアップデートで可能になります。");
                        }
                      }}
                      className="p-2 rounded-full hover:bg-neutral-800 transition text-neutral-400"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>

                {/* Message Bubble Feed */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
                  {messages
                    .filter(m => m.chatId === currentChatId)
                    .map((msg, index) => {
                      if (msg.type === "system") {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <span className="bg-black/10 backdrop-blur-xs text-neutral-500 text-[10px] px-3 py-1 rounded-full">
                              {msg.content}
                            </span>
                          </div>
                        );
                      }

                      const isMe = msg.senderId === "me";
                      const senderContact = contacts.find(c => c.id === msg.senderId);
                      const shape = senderContact?.avatarShape || "rounded";

                      return (
                        <div 
                          key={msg.id} 
                          className={`flex items-start ${isMe ? "flex-row-reverse space-x-reverse" : "space-x-3"}`}
                        >
                          <img 
                            src={msg.senderAvatar} 
                            alt={msg.senderName} 
                            className={`w-9 h-9 ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'} object-cover border border-neutral-100 flex-shrink-0`}
                          />
                          <div className="max-w-[70%]">
                            {!isMe && isGroupChat && (
                              <span className="text-[10px] text-neutral-500 font-bold block mb-0.5">{msg.senderName}</span>
                            )}
                            <div className={`p-3 rounded-2xl text-xs leading-relaxed break-words shadow-2xs ${
                              isMe 
                                ? "bg-[#d199ad] text-white rounded-tr-none" 
                                : "bg-white text-neutral-800 rounded-tl-none border border-neutral-100/55"
                            }`}>
                              {msg.content}
                            </div>
                            <span className={`text-[9px] text-neutral-400 block mt-1 ${isMe ? "text-right" : "text-left"}`}>
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                  {isAIResponding && (
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 bg-neutral-200 rounded-lg flex items-center justify-center animate-pulse">
                        <span className="text-xs text-neutral-400">...</span>
                      </div>
                      <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl rounded-tl-none border border-neutral-100">
                        <span className="text-xs text-neutral-500 italic">入力中...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input Dock */}
                <form 
                  onSubmit={handleSendMessage}
                  className="p-3 bg-white border-t border-neutral-100 flex items-center space-x-2 flex-shrink-0"
                >
                  <input 
                    type="text" 
                    placeholder="メッセージを入力..."
                    value={chatInputText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setChatInputText(val);
                      if (val.trim() !== "") {
                        setIsUserTyping(true);
                        lastActiveTypingTimeRef.current = Date.now();
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
                          setIsUserTyping(false);
                          lastTypingEndTimeRef.current = Date.now();
                        }, 2000);
                      } else {
                        setIsUserTyping(false);
                        lastTypingEndTimeRef.current = Date.now();
                      }
                    }}
                    className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-[#d199ad]"
                  />
                  <button 
                    type="submit" 
                    className="bg-[#d199ad] text-white p-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50"
                    disabled={isAIResponding || !chatInputText.trim()}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ==============================================
              SUB-SCREEN 2: CONTACT DETAIL PROFILE SCREEN
             ============================================== */}
          <AnimatePresence>
            {selectedContactId && !currentChatId && (
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="absolute inset-0 z-30 bg-[#f4f5f7] flex flex-col"
              >
                {/* Header */}
                <div className="h-14 bg-[#1f1f1f] text-white flex items-center px-4 shadow-md">
                  <button 
                    onClick={() => setSelectedContactId(null)}
                    className="p-1 hover:bg-neutral-800 rounded-full transition mr-2"
                  >
                    <ChevronLeft size={24} className="text-[#d199ad]" />
                  </button>
                  <span className="font-bold text-sm">連絡先プロフィール</span>
                </div>

                {/* Profile Widget */}
                {(() => {
                  const contact = contacts.find(c => c.id === selectedContactId);
                  if (!contact) return <p className="p-6 text-center text-neutral-500">連絡先が見つかりません。</p>;

                  return (
                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                      
                      {/* Avatar & Signature in Upper Middle */}
                      <div className="flex flex-col items-center text-center space-y-3 bg-white p-6 rounded-3xl shadow-xs border border-neutral-100">
                        <img 
                          src={contact.avatar} 
                          alt={contact.name} 
                          className={`w-24 h-24 ${contact.avatarShape === 'circle' ? 'rounded-full' : 'rounded-[24px]'} object-cover border-2 border-[#d199ad]/30 shadow-md bg-neutral-50`}
                        />
                        <div>
                          <h2 className="text-base font-bold text-neutral-800">{contact.name}</h2>
                          <p className="text-xs text-neutral-500 italic mt-1 px-4">「 {contact.signature} 」</p>
                        </div>
                      </div>

                      {/* Latest Info (最新情報) */}
                      <div className="bg-white p-5 rounded-3xl shadow-xs border border-neutral-100/60">
                        <h4 className="text-[10px] font-bold text-[#d199ad] tracking-wider uppercase mb-2">最新情報</h4>
                        <div className="p-3 bg-neutral-50 rounded-xl text-xs text-neutral-700 leading-relaxed italic relative">
                          { (contact as any).lastGeneratedStatus || "今日ものんびり過ごしています。✨" }
                          
                          <button 
                            onClick={async () => {
                              await triggerAICurrentStatusUpdate(contact.id);
                            }}
                            className="absolute right-3 bottom-3 text-[9px] text-[#d199ad] font-semibold hover:underline"
                          >
                            再生成 ↺
                          </button>
                        </div>
                      </div>

                      {/* Character Design (キャラクターデザイン人設編輯) */}
                      <div className="bg-white p-5 rounded-3xl shadow-xs border border-neutral-100/60">
                        <h4 className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase mb-2">キャラクターデザイン (人設)</h4>
                        <textarea 
                          value={contact.persona}
                          onChange={(e) => {
                            setContacts(prev => prev.map(c => {
                              if (c.id === contact.id) {
                                return { ...c, persona: e.target.value };
                              }
                              return c;
                            }));
                          }}
                          placeholder="AIの人設設定を入力してください。"
                          className="w-full bg-neutral-50 text-xs border border-neutral-200 rounded-xl p-3 h-28 focus:outline-hidden focus:border-[#d199ad] resize-none leading-relaxed text-neutral-700"
                        />
                      </div>

                      {/* Double Buttons */}
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <button 
                          onClick={() => {
                            setCurrentChatId(contact.id);
                            setIsGroupChat(false);
                            setSelectedContactId(null);
                          }}
                          className="bg-[#d199ad] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md hover:opacity-90 transition flex items-center justify-center space-x-1.5"
                        >
                          <MessageSquare size={14} />
                          <span>メッセージを送信</span>
                        </button>
                        
                        <button 
                          onClick={() => {
                            setIsEditContactOpen(contact.id);
                          }}
                          className="bg-white border border-[#d199ad]/30 text-neutral-800 py-3.5 rounded-2xl text-xs font-bold hover:bg-neutral-50 transition flex items-center justify-center space-x-1.5"
                        >
                          <Edit size={14} className="text-[#d199ad]" />
                          <span>データ編集</span>
                        </button>
                      </div>

                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ==============================================
              SUB-SCREEN 3: IMMERSIVE ACTIVE VOICE CALL 
             ============================================== */}
          <AnimatePresence>
            {activeCall && (
              <motion.div 
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 z-50 flex flex-col justify-between text-white"
                style={{
                  background: activeCall.contact.voiceBg 
                    ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${activeCall.contact.voiceBg}) center/cover no-repeat` 
                    : "linear-gradient(to bottom, #1f1f1f, #111111)"
                }}
              >
                {/* Top call status */}
                <div className="pt-16 px-6 text-center">
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-[#d199ad]/50 shadow-lg animate-pulse mb-4">
                    <img src={activeCall.contact.avatar} alt="AI" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-lg font-bold">{activeCall.contact.name}</h2>
                  <p className="text-xs text-neutral-300 mt-2">語音通話中...</p>
                  <p className="text-xs text-[#d199ad] font-mono mt-1">
                    {Math.floor(activeCall.duration / 60)}:
                    {String(activeCall.duration % 60).padStart(2, '0')}
                  </p>
                </div>

                {/* Call transcript / Real-time chat loop */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 flex flex-col justify-end">
                  {callMessages.slice(-4).map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`p-3 rounded-2xl text-xs max-w-[80%] ${
                        msg.sender === 'me' 
                          ? 'bg-[#d199ad] text-white rounded-tr-none' 
                          : 'bg-white/10 backdrop-blur-md text-white rounded-tl-none border border-white/10'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Phone Call Controls & Text speaking dock */}
                <div className="bg-black/40 backdrop-blur-md p-6 border-t border-white/10 space-y-4">
                  
                  {/* Inline text talk during call */}
                  <form onSubmit={handleSendCallMessage} className="flex space-x-2">
                    <input 
                      type="text" 
                      placeholder="AIに話しかける..." 
                      value={callInput}
                      onChange={(e) => setCallInput(e.target.value)}
                      className="flex-1 bg-white/10 text-white placeholder-neutral-400 text-xs rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:bg-white/15"
                    />
                    <button type="submit" className="bg-[#d199ad] text-white px-4 rounded-xl text-xs font-semibold hover:opacity-90">
                      話す
                    </button>
                  </form>

                  <div className="flex justify-center pt-2">
                    <button 
                      onClick={() => {
                        setActiveCall(null);
                        setCallMessages([]);
                      }}
                      className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition shadow-lg text-white"
                    >
                      <PhoneOff size={24} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ==============================================
              SUB-SCREEN 4: CONTACT CONTEXT MENU (友達長按菜單)
             ============================================== */}
          <AnimatePresence>
            {contextMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setContextMenu(null)}
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{ top: contextMenu.y, left: contextMenu.x }}
                  className="absolute w-44 bg-[#1f1f1f] text-white rounded-2xl p-3 shadow-xl z-50 border border-neutral-700/50"
                >
                  <span className="text-[9px] font-bold text-neutral-400 block mb-2 px-1 tracking-wider uppercase">メニュー</span>
                  
                  <div className="space-y-1">
                    <button 
                      onClick={() => handlePinContact(contextMenu.contactId)}
                      className="w-full text-left px-2 py-1.5 hover:bg-neutral-800 rounded-lg text-xs font-medium text-neutral-200 transition flex items-center space-x-2"
                    >
                      <Bookmark size={12} className="text-[#d199ad]" />
                      <span>{contacts.find(c => c.id === contextMenu.contactId)?.isPinned ? "ピン留め解除" : "ピン留め (置頂)"}</span>
                    </button>
                    
                    <button 
                      onClick={() => {
                        setIsEditContactOpen(contextMenu.contactId);
                        setContextMenu(null);
                      }}
                      className="w-full text-left px-2 py-1.5 hover:bg-neutral-800 rounded-lg text-xs font-medium text-neutral-200 transition flex items-center space-x-2"
                    >
                      <Edit size={12} className="text-[#d199ad]" />
                      <span>情報の編集 (編輯資料)</span>
                    </button>

                    <button 
                      onClick={() => handleDeleteContact(contextMenu.contactId)}
                      className="w-full text-left px-2 py-1.5 hover:bg-red-950 rounded-lg text-xs font-medium text-red-400 transition flex items-center space-x-2"
                    >
                      <Trash2 size={12} />
                      <span>連絡先を削除 (刪除)</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ==============================================
              SUB-SCREEN 5: EDIT CONTACT SCREEN (情報の編集)
             ============================================== */}
          <AnimatePresence>
            {isEditContactOpen && (
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="absolute inset-0 z-40 bg-white flex flex-col"
              >
                {/* Header */}
                <div className="h-14 bg-[#1f1f1f] text-white flex items-center justify-between px-4 shadow-md flex-shrink-0">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">連絡担当者編集</span>
                  <button 
                    onClick={() => setIsEditContactOpen(null)}
                    className="p-1 hover:bg-neutral-800 rounded-full transition"
                  >
                    <X size={20} className="text-[#d199ad]" />
                  </button>
                </div>

                {/* Edit Form */}
                {(() => {
                  const contact = contacts.find(c => c.id === isEditContactOpen);
                  if (!contact) return null;

                  return (
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      
                      {/* Name & Signature */}
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 block mb-1">名前</label>
                        <input 
                          type="text" 
                          value={contact.name}
                          onChange={(e) => {
                            setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, name: e.target.value } : c));
                          }}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-[#d199ad]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 block mb-1">個簽 (ステータスメッセージ)</label>
                        <input 
                          type="text" 
                          value={contact.signature}
                          onChange={(e) => {
                            setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, signature: e.target.value } : c));
                          }}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-[#d199ad]"
                        />
                      </div>

                      {/* Avatar Management & Shape switcher */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-400 block mb-1">頭像アップロード</label>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, (base64) => {
                                setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, avatar: base64 } : c));
                              })}
                              className="hidden" 
                              id={`avatar-upload-${contact.id}`}
                            />
                            <label 
                              htmlFor={`avatar-upload-${contact.id}`}
                              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs px-3 py-2 rounded-xl cursor-pointer transition flex items-center space-x-1 border border-neutral-200"
                            >
                              <ImageIcon size={14} />
                              <span>画像を選択</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-neutral-400 block mb-1">頭像の形状 (角丸/真円)</label>
                          <div className="flex space-x-1.5 bg-neutral-100 p-1 rounded-xl">
                            <button 
                              onClick={() => {
                                setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, avatarShape: 'rounded' } : c));
                              }}
                              className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold transition ${
                                contact.avatarShape === 'rounded' ? 'bg-white text-[#d199ad] shadow-xs' : 'text-neutral-500'
                              }`}
                            >
                              方圓角
                            </button>
                            <button 
                              onClick={() => {
                                setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, avatarShape: 'circle' } : c));
                              }}
                              className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold transition ${
                                contact.avatarShape === 'circle' ? 'bg-white text-[#d199ad] shadow-xs' : 'text-neutral-500'
                              }`}
                            >
                              圓形
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Chat Background Upload */}
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 block mb-1">チャットの背景画像</label>
                        <div className="flex items-center space-x-3">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, (base64) => {
                              setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, chatBg: base64 } : c));
                            })}
                            className="hidden" 
                            id={`chat-bg-upload-${contact.id}`}
                          />
                          <label 
                            htmlFor={`chat-bg-upload-${contact.id}`}
                            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs px-3.5 py-2 rounded-xl cursor-pointer transition border border-neutral-200"
                          >
                            背景をアップロード
                          </label>
                          {contact.chatBg && (
                            <span className="text-[9px] text-[#d199ad] font-bold">✓ カスタム設定中</span>
                          )}
                        </div>
                      </div>

                      {/* Voice Call Background Upload */}
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 block mb-1">通話中の背景画像</label>
                        <div className="flex items-center space-x-3">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, (base64) => {
                              setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, voiceBg: base64 } : c));
                            })}
                            className="hidden" 
                            id={`voice-bg-upload-${contact.id}`}
                          />
                          <label 
                            htmlFor={`voice-bg-upload-${contact.id}`}
                            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs px-3.5 py-2 rounded-xl cursor-pointer transition border border-neutral-200"
                          >
                            背景をアップロード
                          </label>
                          {contact.voiceBg && (
                            <span className="text-[9px] text-[#d199ad] font-bold">✓ カスタム設定中</span>
                          )}
                        </div>
                      </div>

                      {/* Post frequency selection */}
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 block mb-1.5">動態の投稿頻度 (Moments Frequency)</label>
                        <div className="grid grid-cols-4 gap-1.5 bg-neutral-50 p-1.5 rounded-xl border border-neutral-100">
                          {(['high', 'medium', 'low', 'none'] as const).map((freq) => (
                            <button
                              key={freq}
                              onClick={() => {
                                setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, postFrequency: freq } : c));
                              }}
                              className={`text-[9px] py-1.5 rounded-lg font-bold uppercase transition ${
                                contact.postFrequency === freq 
                                  ? 'bg-[#d199ad] text-white shadow-xs' 
                                  : 'text-neutral-500 hover:bg-neutral-100'
                              }`}
                            >
                              {freq === 'high' ? '高' : freq === 'medium' ? '中' : freq === 'low' ? '低' : 'なし'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={() => setIsEditContactOpen(null)}
                        className="w-full bg-[#1f1f1f] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md hover:bg-neutral-800 transition"
                      >
                        変更を保存する
                      </button>

                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ==============================================
              MODAL: ADD NEW CONTACT (に追加)
             ============================================== */}
          <AnimatePresence>
            {isAddContactOpen && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end">
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  className="w-full bg-white rounded-t-[32px] p-6 space-y-4 shadow-2xl flex flex-col max-h-[85%] overflow-y-auto text-neutral-800"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                    <h3 className="text-sm font-bold">新しい連絡先を追加</h3>
                    <button onClick={() => setIsAddContactOpen(false)} className="text-neutral-400">
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleAddContact} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">名前</label>
                      <input 
                        type="text" 
                        required
                        placeholder="例: 白川 さくら"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-[#d199ad]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">個簽 (ステータスメッセージ)</label>
                      <input 
                        type="text" 
                        placeholder="例: 今日も一日頑張りましょう！🍀"
                        value={newContactSignature}
                        onChange={(e) => setNewContactSignature(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-[#d199ad]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">キャラクターデザイン (AI 人設角色設定)</label>
                      <textarea 
                        required
                        placeholder="例: あなたを応援する陽気な妹系キャラクター。常に笑顔で前向き、丁寧な敬語を使うが、お茶目な一面もある。"
                        value={newContactPersona}
                        onChange={(e) => setNewContactPersona(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs h-20 focus:outline-hidden focus:border-[#d199ad]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 block mb-1">頭像アップロード</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, (base64) => setNewContactAvatar(base64))}
                          className="hidden" 
                          id="new-avatar-upload"
                        />
                        <label 
                          htmlFor="new-avatar-upload"
                          className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs px-3 py-2.5 rounded-xl cursor-pointer transition border border-neutral-200 block text-center font-semibold"
                        >
                          画像をアップロード
                        </label>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 block mb-1">頭像の形状</label>
                        <div className="flex space-x-1 bg-neutral-100 p-1 rounded-xl">
                          <button 
                            type="button"
                            onClick={() => setNewContactShape('rounded')}
                            className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold transition ${
                              newContactShape === 'rounded' ? 'bg-white text-[#d199ad] shadow-xs' : 'text-neutral-500'
                            }`}
                          >
                            方圓角
                          </button>
                          <button 
                            type="button"
                            onClick={() => setNewContactShape('circle')}
                            className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold transition ${
                              newContactShape === 'circle' ? 'bg-white text-[#d199ad] shadow-xs' : 'text-neutral-500'
                            }`}
                          >
                            圓形
                          </button>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-[#d199ad] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md hover:opacity-90 transition mt-2"
                    >
                      新しい友達を追加する
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ==============================================
              MODAL: CREATE GROUP (グループを作成する)
             ============================================== */}
          <AnimatePresence>
            {isCreateGroupOpen && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end">
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  className="w-full bg-white rounded-t-[32px] p-6 space-y-4 shadow-2xl flex flex-col max-h-[85%] overflow-y-auto text-neutral-800"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                    <h3 className="text-sm font-bold">グループを作成する</h3>
                    <button onClick={() => setIsCreateGroupOpen(false)} className="text-neutral-400">
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">グループ名</label>
                      <input 
                        type="text" 
                        required
                        placeholder="例: 旅行計画、桜サークルなど"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-[#d199ad]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-2">メンバーを選択 (複数選択)</label>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 border border-neutral-100 rounded-xl p-2 bg-neutral-50">
                        {contacts.map(contact => (
                          <label 
                            key={contact.id} 
                            className="flex items-center space-x-3 p-1.5 rounded-lg hover:bg-white cursor-pointer transition text-xs"
                          >
                            <input 
                              type="checkbox" 
                              checked={selectedMembers.includes(contact.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMembers([...selectedMembers, contact.id]);
                                } else {
                                  setSelectedMembers(selectedMembers.filter(id => id !== contact.id));
                                }
                              }}
                              className="accent-[#d199ad] rounded"
                            />
                            <img src={contact.avatar} alt="avatar" className="w-6 h-6 rounded-md object-cover" />
                            <span className="font-semibold">{contact.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={!newGroupName.trim() || selectedMembers.length === 0}
                      className="w-full bg-[#d199ad] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md hover:opacity-90 transition mt-2 disabled:opacity-50"
                    >
                      グループチャットを作成
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ==============================================
              MODAL: USER PROFILE SETTINGS (ユーザーマスク)
             ============================================== */}
          <AnimatePresence>
            {isUserProfileOpen && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end">
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  className="w-full bg-white rounded-t-[32px] p-6 space-y-4 shadow-2xl flex flex-col max-h-[85%] overflow-y-auto text-neutral-800"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                    <h3 className="text-sm font-bold">ユーザーマスク (自分のプロフィール)</h3>
                    <button onClick={() => setIsUserProfileOpen(false)} className="text-neutral-400">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">名前</label>
                      <input 
                        type="text" 
                        value={tempUserName}
                        onChange={(e) => setTempUserName(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-[#d199ad]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">ステータスメッセージ (個簽)</label>
                      <input 
                        type="text" 
                        value={tempUserSig}
                        onChange={(e) => setTempUserSig(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-[#d199ad]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">現在の状態 (ステータス)</label>
                      <input 
                        type="text" 
                        value={tempUserState}
                        onChange={(e) => setTempUserState(e.target.value)}
                        placeholder="例: 🌸 桜舞う季節"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-[#d199ad]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">面對 AI 的人設 (我的特徵)</label>
                      <textarea 
                        value={tempUserPersona}
                        onChange={(e) => setTempUserPersona(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs h-20 focus:outline-hidden focus:border-[#d199ad]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">頭像変更</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, (base64) => setTempUserAvatar(base64))}
                        className="hidden" 
                        id="user-avatar-upload"
                      />
                      <label 
                        htmlFor="user-avatar-upload"
                        className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs px-3.5 py-2.5 rounded-xl cursor-pointer transition border border-neutral-200 block text-center font-bold"
                      >
                        新しいアバターをアップロード
                      </label>
                    </div>

                    <button 
                      onClick={() => {
                        setUserProfile({
                          name: tempUserName,
                          avatar: tempUserAvatar,
                          signature: tempUserSig,
                          state: tempUserState,
                          persona: tempUserPersona
                        });
                        setIsUserProfileOpen(false);
                      }}
                      className="w-full bg-[#d199ad] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md hover:opacity-90 transition mt-2"
                    >
                      プロフィールを保存する
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ==============================================
              MODAL: NEW POST (動態を送信する)
             ============================================== */}
          <AnimatePresence>
            {isNewPostOpen && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end">
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  className="w-full bg-white rounded-t-[32px] p-6 space-y-4 shadow-2xl flex flex-col max-h-[85%] overflow-y-auto text-neutral-800"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                    <h3 className="text-sm font-bold">動態を送信する (Post Moment)</h3>
                    <button onClick={() => setIsNewPostOpen(false)} className="text-neutral-400">
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleCreatePost} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">今何してる？</label>
                      <textarea 
                        required
                        placeholder="今どんな気分？みんなに近況を共有しましょう！"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-xs h-32 focus:outline-hidden focus:border-[#d199ad] leading-relaxed resize-none"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-[#d199ad] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md hover:opacity-90 transition mt-2"
                    >
                      送信する
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ==============================================
              MODAL: API SETTINGS (API設定)
             ============================================== */}
          <AnimatePresence>
            {isApiSettingsOpen && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end">
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  className="w-full bg-white rounded-t-[32px] p-6 space-y-4 shadow-2xl flex flex-col max-h-[85%] overflow-y-auto text-neutral-800"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                    <div className="flex items-center space-x-1.5">
                      <Key size={16} className="text-[#d199ad]" />
                      <h3 className="text-sm font-bold">API設定 (AI Configuration)</h3>
                    </div>
                    <button onClick={() => setIsApiSettingsOpen(false)} className="text-neutral-400">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-[#fcf9fa] border border-[#d199ad]/15 p-3 rounded-xl text-[10px] text-neutral-600 leading-normal">
                      預設為內置的 <strong>Gemini 3.5 Flash</strong> 引擎。若您想自訂模型（如 <strong>Groq</strong> 的 Llama3），請於下方填寫相應的端點、模型名稱與 API 金鑰。
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">API URL (端點)</label>
                      <input 
                        type="text" 
                        placeholder="例: https://api.groq.com/openai/v1/chat/completions"
                        value={apiConfig.url}
                        onChange={(e) => setApiConfig({ ...apiConfig, url: e.target.value })}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-[#d199ad]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">AI 模型 (Model)</label>
                      <input 
                        type="text" 
                        placeholder="例: llama-3.3-70b-versatile"
                        value={apiConfig.model}
                        onChange={(e) => setApiConfig({ ...apiConfig, model: e.target.value })}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-[#d199ad]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">API KEY (密鑰)</label>
                      <input 
                        type="password" 
                        placeholder="在此輸入您的 API KEY (例如: gsk_...)"
                        value={apiConfig.apiKey}
                        onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-[#d199ad]"
                      />
                    </div>

                    <button 
                      onClick={() => setIsApiSettingsOpen(false)}
                      className="w-full bg-[#d199ad] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md hover:opacity-90 transition mt-2"
                    >
                      設定を保存
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ==============================================
              DOUBLE CONFIRMATION MODAL: DELETE ALL DATA
             ============================================== */}
          <AnimatePresence>
            {isDeleteAllOpen && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-6">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-3xl p-6 w-full max-w-sm text-center space-y-4 shadow-2xl border border-neutral-100"
                >
                  <AlertTriangle size={48} className="mx-auto text-red-500 animate-bounce" />
                  
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-neutral-800">すべてのデータを削除しますか？</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      この操作を実行すると、すべての連絡先、群組、メッセージ履歴、およびモーメンツ動態が完全に削除され、復元できなくなります。
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={handleWipeDatabase}
                      className="bg-red-500 text-white py-3 rounded-2xl text-xs font-bold hover:bg-red-600 transition"
                    >
                      もちろん (當然)
                    </button>
                    
                    <button 
                      onClick={() => setIsDeleteAllOpen(false)}
                      className="bg-neutral-100 text-neutral-800 py-3 rounded-2xl text-xs font-bold hover:bg-neutral-200 transition"
                    >
                      キャンセル (取消)
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
