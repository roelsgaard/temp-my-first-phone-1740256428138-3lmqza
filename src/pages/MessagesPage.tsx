import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Send, ArrowLeft, User, Loader2, CheckCheck } from 'lucide-react';
import { auth, database, sendNotification } from '../firebase';
import { ref, push, onValue, query, orderByChild, get, set, update } from 'firebase/database';
import { Link } from 'react-router-dom';
import { Contact, getAvatarForContact, avatarOptions } from '../utils/avatars';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderEmail: string;
  timestamp: number;
  status?: 'sending' | 'sent';
  readBy?: {
    [key: string]: {
      timestamp: number;
    };
  };
}

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: number;
}

export function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [message, setMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [userAvatar, setUserAvatar] = useState(avatarOptions[0]);
  const firstLoadRef = useRef<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    // Load user's avatar preference
    const storedUserAvatar = localStorage.getItem(`userAvatar_${currentUser.uid}`);
    if (storedUserAvatar) {
      const avatar = avatarOptions.find(a => a.id === storedUserAvatar);
      if (avatar) {
        setUserAvatar(avatar);
      }
    }

    const storedContacts = localStorage.getItem(`contacts_${currentUser.uid}`);
    if (storedContacts) {
      setContacts(JSON.parse(storedContacts));
    }
  }, [currentUser]);

  useLayoutEffect(() => {
    if (messageContainerRef.current && messages.length > 0) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, selectedChat]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowSidebar(true);
      } else if (selectedChat) {
        setShowSidebar(false);
      }
      if (messageContainerRef.current) {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedChat]);

  useEffect(() => {
    if (!currentUser) return;

    const chatsRef = ref(database, 'chats');
    const unsubscribeChats = onValue(chatsRef, async (snapshot) => {
      try {
        const chatsData = snapshot.val() || {};
        const userChats: Chat[] = [];

        for (const [chatId, chat] of Object.entries(chatsData)) {
          const chatObj = chat as any;
          if (chatObj.participants?.includes(currentUser.email)) {
            userChats.push({
              id: chatId,
              participants: chatObj.participants,
              lastMessage: chatObj.lastMessage,
              lastMessageTime: chatObj.lastMessageTime,
            });
          }
        }

        setChats(userChats.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)));
      } catch (error) {
        console.error('Error loading chats:', error);
        setError('Failed to load chats. Please try refreshing the page.');
      }
    });

    return () => {
      unsubscribeChats();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!selectedChat || !currentUser) return;

    const messagesRef = ref(database, `messages/${selectedChat}`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));
    
    const unsubscribe = onValue(messagesQuery, async (snapshot) => {
      try {
        const messagesData = snapshot.val() || {};
        const messagesList = Object.entries(messagesData).map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }));

        if (firstLoadRef.current) {
          const updates: { [key: string]: any } = {};
          messagesList.forEach(msg => {
            if (msg.senderId !== currentUser.uid && (!msg.readBy || !msg.readBy[currentUser.uid])) {
              updates[`messages/${selectedChat}/${msg.id}/readBy/${currentUser.uid}`] = {
                timestamp: Date.now()
              };
            }
          });

          if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
          }
          firstLoadRef.current = false;
        }

        setMessages(messagesList);
      } catch (error) {
        console.error('Error loading messages:', error);
        setError('Failed to load messages. Please try refreshing the page.');
      }
    });

    return () => {
      unsubscribe();
      firstLoadRef.current = true;
    };
  }, [selectedChat, currentUser]);

  const startNewChat = async (contact: Contact) => {
    if (!currentUser) return;
    setError(null);

    try {
      const existingChat = chats.find(chat => 
        chat.participants.includes(contact.email) && 
        chat.participants.length === 2
      );

      if (existingChat) {
        setSelectedChat(existingChat.id);
        setShowNewChatModal(false);
        if (window.innerWidth < 768) {
          setShowSidebar(false);
        }
        return;
      }

      const chatRef = ref(database, 'chats');
      const newChat = await push(chatRef, {
        participants: [currentUser.email, contact.email],
        createdAt: Date.now(),
      });

      setSelectedChat(newChat.key);
      setShowNewChatModal(false);
      if (window.innerWidth < 768) {
        setShowSidebar(false);
      }
    } catch (error) {
      console.error('Error starting new chat:', error);
      setError('Failed to start new chat. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedChat || !currentUser) return;
    setError(null);
    setSending(true);

    try {
      const messagesRef = ref(database, `messages/${selectedChat}`);
      const chatRef = ref(database, `chats/${selectedChat}`);

      const chatSnapshot = await get(chatRef);
      const chatData = chatSnapshot.val();
      
      if (!chatData) {
        throw new Error('Chat not found');
      }

      const recipientEmail = chatData.participants.find((p: string) => p !== currentUser.email);
      
      const newMessage = {
        text: message,
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        timestamp: Date.now(),
        readBy: {
          [currentUser.uid]: {
            timestamp: Date.now()
          }
        }
      };

      await push(messagesRef, newMessage);

      await set(chatRef, {
        ...chatData,
        lastMessage: message,
        lastMessageTime: Date.now(),
      });

      if (recipientEmail) {
        await sendNotification(
          recipientEmail,
          'New Message',
          `${currentUser.email} sent you a message: ${message}`,
          '/messages'
        );
      }

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    const otherEmail = chat.participants.find(p => p !== currentUser?.email) || '';
    const contact = contacts.find(c => c.email === otherEmail);
    return contact || { name: otherEmail, email: otherEmail };
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChat(chatId);
    setError(null);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
    firstLoadRef.current = true;
  };

  const handleBackToList = () => {
    if (window.innerWidth < 768) {
      setShowSidebar(true);
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    const timeString = date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });

    if (isToday) {
      return timeString;
    } else if (isYesterday) {
      return `Yesterday ${timeString}`;
    } else {
      return `${date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric' 
      })} ${timeString}`;
    }
  };

  const formatChatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      });
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric' 
      });
    }
  };

  const isMessageRead = (message: Message) => {
    if (!message.readBy) return false;
    const selectedChatData = chats.find(chat => chat.id === selectedChat);
    if (!selectedChatData) return false;
    
    const recipient = selectedChatData.participants.find(p => p !== currentUser?.email);
    if (!recipient) return false;
    
    const recipientId = Object.keys(message.readBy).find(id => id !== currentUser?.uid);
    return !!recipientId && message.readBy[recipientId]?.timestamp;
  };

  const getReadTimestamp = (message: Message) => {
    if (!message.readBy) return null;
    const selectedChatData = chats.find(chat => chat.id === selectedChat);
    if (!selectedChatData) return null;
    
    const recipient = selectedChatData.participants.find(p => p !== currentUser?.email);
    if (!recipient) return null;
    
    const recipientId = Object.keys(message.readBy).find(id => id !== currentUser?.uid);
    return recipientId ? message.readBy[recipientId]?.timestamp : null;
  };

  const getMessageAvatar = (email: string) => {
    if (email === currentUser?.email) {
      return userAvatar;
    }
    const contact = contacts.find(c => c.email === email);
    return contact ? getAvatarForContact(contact) : avatarOptions[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fun-primary via-fun-secondary to-fun-accent flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white/90 backdrop-blur-lg w-full h-screen sm:h-[80vh] sm:rounded-3xl sm:shadow-2xl flex overflow-hidden">
        <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 bg-white/50 border-r border-white/20`}>
          <div className="p-4 border-b border-white/20 flex items-center gap-3">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
          </div>

          {error && (
            <div className="p-4">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-red-700 text-sm">
                {error}
              </div>
            </div>
          )}

          <div className="p-4 border-b border-white/20">
            <button
              onClick={() => setShowNewChatModal(true)}
              className="w-full bg-gradient-to-r from-fun-primary to-fun-secondary hover:opacity-90 text-white font-medium py-2 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-lg"
            >
              <Send className="w-4 h-4" />
              New Message
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-fun-primary/30 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No messages yet</p>
                <p className="text-gray-500 text-sm">
                  Start a conversation with one of your contacts
                </p>
              </div>
            ) : (
              chats.map((chat) => {
                const contact = getOtherParticipant(chat);
                const avatar = getAvatarForContact(contact);
                return (
                  <button
                    key={chat.id}
                    onClick={() => handleChatSelect(chat.id)}
                    className={`w-full p-4 text-left hover:bg-white/50 transition-all flex items-center gap-3 ${
                      selectedChat === chat.id ? 'bg-white/70' : ''
                    }`}
                  >
                    <div className={`w-12 h-12 ${avatar.bg} rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110`}>
                      <span className="text-2xl">{avatar.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                        {chat.lastMessageTime && (
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatChatTime(chat.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      {chat.lastMessage && (
                        <p className="text-sm text-gray-500 truncate mt-1">{chat.lastMessage}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-white/30`}>
          {selectedChat ? (
            <>
              <div className="p-4 border-b border-white/20 flex items-center gap-3 bg-white/50">
                <button
                  onClick={handleBackToList}
                  className="md:hidden text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                {(() => {
                  const contact = getOtherParticipant(chats.find(chat => chat.id === selectedChat)!);
                  const avatar = getAvatarForContact(contact);
                  return (
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${avatar.bg} rounded-2xl flex items-center justify-center transition-transform hover:scale-110`}>
                        <span className="text-xl">{avatar.emoji}</span>
                      </div>
                      <h2 className="font-semibold text-gray-900">{contact.name}</h2>
                    </div>
                  );
                })()}
              </div>

              <div className="flex-1 overflow-y-auto p-4" ref={messageContainerRef}>
                <div className="space-y-6">
                  {messages.map((msg) => {
                    const isOwnMessage = msg.senderId === currentUser?.uid;
                    const readTimestamp = isOwnMessage ? getReadTimestamp(msg) : null;
                    const avatar = getMessageAvatar(msg.senderEmail);
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end gap-2 animate-fade-in`}
                      >
                        {!isOwnMessage && (
                          <div className={`w-8 h-8 ${avatar.bg} rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110`}>
                            <span className="text-base">{avatar.emoji}</span>
                          </div>
                        )}
                        <div className="flex flex-col items-end gap-1 max-w-[80%]">
                          <div className="flex items-end gap-2">
                            {isOwnMessage && (
                              <div className="flex items-center self-end mb-1">
                                {sending ? (
                                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                ) : (
                                  <CheckCheck 
                                    className={`w-4 h-4 ${
                                      isMessageRead(msg) ? 'text-fun-accent' : 'text-gray-400'
                                    }`}
                                    title={readTimestamp ? `Read ${formatMessageTime(readTimestamp)}` : 'Delivered'}
                                  />
                                )}
                              </div>
                            )}
                            <div
                              className={`rounded-2xl px-4 py-2.5 ${
                                isOwnMessage
                                  ? 'bg-gradient-to-r from-fun-primary to-fun-secondary text-white rounded-br-sm shadow-lg'
                                  : 'bg-white text-gray-900 rounded-bl-sm shadow-md'
                              }`}
                            >
                              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                                {msg.text}
                              </p>
                            </div>
                          </div>
                          <div className={`flex items-center gap-2 text-xs text-gray-500 px-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span>{formatMessageTime(msg.timestamp)}</span>
                            {isOwnMessage && readTimestamp && (
                              <span className="text-fun-accent">
                                • Read {formatMessageTime(readTimestamp)}
                              </span>
                            )}
                          </div>
                        </div>
                        {isOwnMessage && (
                          <div className={`w-8 h-8 ${avatar.bg} rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110`}>
                            <span className="text-base">{avatar.emoji}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="p-4 border-t border-white/20 bg-white/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-white/30 rounded-2xl focus:ring-2 focus:ring-fun-primary focus:border-transparent bg-white/50 backdrop-blur-sm placeholder:text-gray-500"
                    disabled={sending}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!message.trim() || sending}
                    className="bg-gradient-to-r from-fun-primary to-fun-secondary hover:opacity-90 disabled:opacity-50 text-white px-4 py-2 rounded-2xl transition-all transform hover:scale-[1.02] shadow-lg flex items-center gap-2"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a chat or start a new conversation
            </div>
          )}
        </div>
      </div>

      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">New Message</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {contacts.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-fun-primary/30 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No contacts found</p>
                  <Link
                    to="/admin"
                    className="text-fun-primary hover:text-fun-primary/80 font-medium"
                    onClick={() => setShowNewChatModal(false)}
                  >
                    Add contacts in Settings
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact) => {
                    const avatar = getAvatarForContact(contact);
                    return (
                      <button
                        key={contact.email}
                        onClick={() => startNewChat(contact)}
                        className="w-full p-3 flex items-center gap-3 rounded-2xl hover:bg-gray-50 transition-all text-left group"
                      >
                        <div className={`w-10 h-10 ${avatar.bg} rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
                          <span className="text-2xl">{avatar.emoji}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          <p className="text-sm text-gray-500">{contact.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}