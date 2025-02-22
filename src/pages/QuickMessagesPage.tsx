import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, User, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth, database, sendNotification } from '../firebase';
import { ref, push, onValue, set } from 'firebase/database';
import { Contact, getAvatarForContact } from '../utils/avatars';

interface QuickMessage {
  id: string;
  text: string;
  createdAt: number;
}

export function QuickMessagesPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [quickMessages, setQuickMessages] = useState<QuickMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    // Load contacts from localStorage
    const storedContacts = localStorage.getItem(`contacts_${currentUser.uid}`);
    if (storedContacts) {
      setContacts(JSON.parse(storedContacts));
    }

    // Load quick messages from localStorage
    const storedMessages = localStorage.getItem(`quickMessages_${currentUser.uid}`);
    if (storedMessages) {
      setQuickMessages(JSON.parse(storedMessages));
    }
  }, [currentUser]);

  const sendQuickMessage = async (message: QuickMessage) => {
    if (!currentUser || !selectedContact) return;

    setSending(true);
    setSendingMessageId(message.id);
    setSentMessage(null);
    setError(null);

    try {
      // Find existing chat
      const chatsRef = ref(database, 'chats');
      const chatsSnapshot = await new Promise<any>((resolve, reject) => {
        onValue(chatsRef, resolve, { onlyOnce: true }, reject);
      });
      
      const chatsData = chatsSnapshot.val() || {};
      let chatId = Object.entries(chatsData).find(([_, chat]: [string, any]) => {
        const participants = chat.participants || [];
        return participants.includes(currentUser.email) && 
               participants.includes(selectedContact.email) &&
               participants.length === 2;
      })?.[0];

      // Create new chat if none exists
      if (!chatId) {
        const newChatRef = push(chatsRef);
        chatId = newChatRef.key;
        await set(newChatRef, {
          participants: [currentUser.email, selectedContact.email],
          createdAt: Date.now(),
        });
      }

      // Send message
      const messagesRef = ref(database, `messages/${chatId}`);
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, {
        text: message.text,
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        timestamp: Date.now(),
        readBy: {
          [currentUser.uid]: {
            timestamp: Date.now()
          }
        }
      });

      // Update chat's last message
      const chatRef = ref(database, `chats/${chatId}`);
      await set(chatRef, {
        ...chatsData[chatId],
        lastMessage: message.text,
        lastMessageTime: Date.now(),
      });

      // Send notification to recipient
      await sendNotification(
        selectedContact.email,
        'New Quick Message',
        `${currentUser.email} sent you a message: ${message.text}`,
        '/messages'
      );

      // Show success message
      setSentMessage(message.text);

      // Clear the success message and reset the contact after 2 seconds
      setTimeout(() => {
        setSentMessage(null);
        setSelectedContact(null);
      }, 2000);
    } catch (error) {
      console.error('Error sending quick message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
      setSendingMessageId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fun-secondary via-fun-yellow to-fun-orange p-0 sm:p-4">
      <div className="bg-white/90 backdrop-blur-lg w-full h-screen sm:h-[80vh] rounded-none sm:rounded-xl shadow-fun-lg">
        <div className="p-4 border-b border-white/20 flex items-center gap-3 bg-white/50 rounded-none sm:rounded-t-xl">
          <Link to="/" className="text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-bold text-xl text-gray-900">Quick Messages</h1>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-2xl p-4 text-red-700 animate-fade-in">
              {error}
            </div>
          )}

          {sentMessage && (
            <div className="mb-6 bg-fun-accent/10 backdrop-blur-sm border-2 border-fun-accent/20 rounded-2xl p-4 text-fun-accent font-medium animate-fade-in">
              Message sent: "{sentMessage}"
            </div>
          )}

          {quickMessages.length === 0 ? (
            <div className="text-center py-12 animate-fade-in">
              <Send className="w-16 h-16 text-fun-secondary/30 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-4">No quick messages configured</p>
              <Link
                to="/admin"
                className="text-fun-secondary hover:text-fun-secondary/80 font-semibold text-lg transition-colors"
              >
                Add quick messages in Settings
              </Link>
            </div>
          ) : !selectedContact ? (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Select a contact</h2>
              {contacts.length === 0 ? (
                <div className="text-center py-12 animate-fade-in">
                  <User className="w-16 h-16 text-fun-secondary/30 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg mb-4">No contacts found</p>
                  <Link
                    to="/admin"
                    className="text-fun-secondary hover:text-fun-secondary/80 font-semibold text-lg transition-colors"
                  >
                    Add contacts in Settings
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {contacts.map((contact, index) => {
                    const avatar = getAvatarForContact(contact);
                    return (
                      <button
                        key={contact.email}
                        onClick={() => setSelectedContact(contact)}
                        className="p-6 rounded-2xl bg-white/50 hover:bg-white/70 transition-all transform hover:scale-[1.02] shadow-lg animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className={`w-16 h-16 ${avatar.bg} rounded-xl flex items-center justify-center mb-3 transform transition-transform hover:scale-110 hover:rotate-[10deg]`}>
                            <span className="text-3xl">{avatar.emoji}</span>
                          </div>
                          <span className="font-semibold text-lg mb-1">{contact.name}</span>
                          <span className="text-sm text-gray-500">{contact.email}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${getAvatarForContact(selectedContact).bg} rounded-xl flex items-center justify-center transform transition-transform hover:scale-110 hover:rotate-[10deg]`}>
                    <span className="text-2xl">{getAvatarForContact(selectedContact).emoji}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedContact.name}</h2>
                    <p className="text-gray-500">{selectedContact.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-fun-secondary hover:text-fun-secondary/80 font-medium transition-colors"
                >
                  Change contact
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickMessages.map((message, index) => (
                  <button
                    key={message.id}
                    onClick={() => sendQuickMessage(message)}
                    disabled={sending}
                    className="p-4 text-left rounded-2xl bg-white/50 hover:bg-white/70 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-between gap-2 shadow-lg animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <p className="text-gray-900 font-medium">{message.text}</p>
                    {sendingMessageId === message.id ? (
                      <Loader2 className="w-5 h-5 text-fun-secondary animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 text-fun-secondary opacity-50 group-hover:opacity-100" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}