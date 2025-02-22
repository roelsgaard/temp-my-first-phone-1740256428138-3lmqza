import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, AlertCircle, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { avatarOptions } from '../utils/avatars';

interface Contact {
  name: string;
  email: string;
  addedAt: number;
  avatar?: string;
}

interface QuickMessage {
  id: string;
  text: string;
  createdAt: number;
}

export function AdminPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [quickMessages, setQuickMessages] = useState<QuickMessage[]>([]);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showUserAvatarSelector, setShowUserAvatarSelector] = useState(false);
  const [showContactAvatarSelector, setShowContactAvatarSelector] = useState(false);
  const [selectedContactAvatar, setSelectedContactAvatar] = useState(avatarOptions[0]);
  const [userAvatar, setUserAvatar] = useState(avatarOptions[0]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const storedContacts = localStorage.getItem(`contacts_${currentUser.uid}`);
    if (storedContacts) {
      setContacts(JSON.parse(storedContacts));
    }

    const storedMessages = localStorage.getItem(`quickMessages_${currentUser.uid}`);
    if (storedMessages) {
      setQuickMessages(JSON.parse(storedMessages));
    }

    // Load user's avatar preference
    const storedUserAvatar = localStorage.getItem(`userAvatar_${currentUser.uid}`);
    if (storedUserAvatar) {
      const avatar = avatarOptions.find(a => a.id === storedUserAvatar);
      if (avatar) {
        setUserAvatar(avatar);
      }
    }
  }, [currentUser]);

  const addContact = async () => {
    if (!currentUser) return;
    if (!newName.trim()) {
      setError('Please enter a contact name');
      return;
    }
    if (!newEmail.trim()) {
      setError('Please enter an email address');
      return;
    }
    if (!newEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (contacts.some(contact => contact.email === newEmail)) {
      setError('This contact is already in your list');
      return;
    }
    if (newEmail === currentUser.email) {
      setError('You cannot add yourself as a contact');
      return;
    }

    try {
      setError(null);
      const contact: Contact = {
        name: newName.trim(),
        email: newEmail,
        addedAt: Date.now(),
        avatar: selectedContactAvatar.id
      };
      
      const updatedContacts = [...contacts, contact];
      setContacts(updatedContacts);
      localStorage.setItem(`contacts_${currentUser.uid}`, JSON.stringify(updatedContacts));
      setNewName('');
      setNewEmail('');
      setShowContactAvatarSelector(false);
      setSelectedContactAvatar(avatarOptions[0]);
    } catch (error) {
      console.error('Error adding contact:', error);
      setError('Failed to add contact. Please try again.');
    }
  };

  const removeContact = async (email: string) => {
    if (!currentUser) return;
    try {
      const updatedContacts = contacts.filter(contact => contact.email !== email);
      setContacts(updatedContacts);
      localStorage.setItem(`contacts_${currentUser.uid}`, JSON.stringify(updatedContacts));
    } catch (error) {
      console.error('Error removing contact:', error);
      setError('Failed to remove contact. Please try again.');
    }
  };

  const addQuickMessage = async () => {
    if (!currentUser) return;
    if (!newMessage.trim()) {
      setError('Please enter a message');
      return;
    }
    if (quickMessages.some(msg => msg.text === newMessage.trim())) {
      setError('This message already exists');
      return;
    }

    try {
      setError(null);
      const message: QuickMessage = {
        id: Date.now().toString(),
        text: newMessage.trim(),
        createdAt: Date.now()
      };
      
      const updatedMessages = [...quickMessages, message];
      setQuickMessages(updatedMessages);
      localStorage.setItem(`quickMessages_${currentUser.uid}`, JSON.stringify(updatedMessages));
      setNewMessage('');
    } catch (error) {
      console.error('Error adding quick message:', error);
      setError('Failed to add message. Please try again.');
    }
  };

  const removeQuickMessage = async (messageId: string) => {
    if (!currentUser) return;
    try {
      const updatedMessages = quickMessages.filter(msg => msg.id !== messageId);
      setQuickMessages(updatedMessages);
      localStorage.setItem(`quickMessages_${currentUser.uid}`, JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Error removing quick message:', error);
      setError('Failed to remove message. Please try again.');
    }
  };

  const getAvatarForContact = (contact: Contact) => {
    return avatarOptions.find(avatar => avatar.id === contact.avatar) || avatarOptions[0];
  };

  const updateUserAvatar = (avatar: typeof avatarOptions[0]) => {
    if (!currentUser) return;
    setUserAvatar(avatar);
    localStorage.setItem(`userAvatar_${currentUser.uid}`, avatar.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fun-primary via-fun-purple to-fun-pink p-0 sm:p-4">
      <div className="bg-white/90 backdrop-blur-lg w-full h-screen sm:h-[80vh] rounded-none sm:rounded-xl shadow-fun-lg flex flex-col">
        <div className="p-4 border-b border-white/20 flex items-center gap-3 bg-white/50 rounded-none sm:rounded-t-xl">
          <Link to="/" className="text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-bold text-xl text-gray-900">Settings</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* User Avatar Section */}
            <div className="bg-gradient-to-r from-fun-primary/5 to-fun-purple/5 p-6 rounded-2xl border-2 border-fun-primary/10">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Avatar</h2>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 ${userAvatar.bg} rounded-2xl flex items-center justify-center transform transition-all hover:scale-110 hover:rotate-[10deg]`}>
                  <span className="text-3xl">{userAvatar.emoji}</span>
                </div>
                <div className="flex-1">
                  <p className="text-lg font-medium text-gray-900">{userAvatar.name}</p>
                  <p className="text-gray-500">{currentUser?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserAvatarSelector(!showUserAvatarSelector);
                    setShowContactAvatarSelector(false);
                  }}
                  className="bg-gradient-to-r from-fun-primary to-fun-purple text-white px-4 py-2 rounded-xl hover:opacity-90 transition-all transform hover:scale-[1.02] shadow-fun"
                >
                  Change Avatar
                </button>
              </div>

              {showUserAvatarSelector && (
                <div className="mt-4 bg-white rounded-xl p-4 shadow-lg border border-fun-primary/10">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {avatarOptions.map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => {
                          updateUserAvatar(avatar);
                          setShowUserAvatarSelector(false);
                        }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-[1.02] ${
                          userAvatar.id === avatar.id
                            ? `${avatar.bg} border-2 border-fun-primary shadow-fun`
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-3xl transform transition-transform hover:scale-110 hover:rotate-[10deg]">
                          {avatar.emoji}
                        </span>
                        <span className={`text-sm font-medium ${avatar.color}`}>
                          {avatar.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Contacts Section */}
            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Manage Contacts</h2>
              
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contact name (e.g., Mom)"
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-fun-primary focus:border-transparent placeholder:text-gray-400"
                  />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Email address"
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-fun-primary focus:border-transparent placeholder:text-gray-400"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <button
                    onClick={() => {
                      setShowContactAvatarSelector(!showContactAvatarSelector);
                      setShowUserAvatarSelector(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                      showContactAvatarSelector 
                        ? 'border-fun-primary bg-fun-primary/5' 
                        : 'border-gray-300 hover:border-fun-primary/30'
                    }`}
                  >
                    <span className="text-2xl">{selectedContactAvatar.emoji}</span>
                    <span className="text-gray-700">Choose Avatar</span>
                  </button>

                  <button
                    onClick={addContact}
                    className="bg-gradient-to-r from-fun-primary to-fun-purple hover:opacity-90 text-white px-6 py-2.5 rounded-xl transition-all transform hover:scale-[1.02] flex items-center gap-2 whitespace-nowrap shadow-fun"
                  >
                    <Plus className="w-5 h-5" />
                    Add Contact
                  </button>
                </div>

                {showContactAvatarSelector && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {avatarOptions.map((avatar) => (
                        <button
                          key={avatar.id}
                          onClick={() => {
                            setSelectedContactAvatar(avatar);
                            setShowContactAvatarSelector(false);
                          }}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                            selectedContactAvatar.id === avatar.id
                              ? `${avatar.bg} border-2 border-fun-primary`
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-3xl transform transition-transform hover:scale-110 hover:rotate-[10deg]">
                            {avatar.emoji}
                          </span>
                          <span className={`text-sm font-medium ${avatar.color}`}>
                            {avatar.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {contacts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No contacts added yet. Add contacts to enable communication.
                  </p>
                ) : (
                  contacts.map((contact) => {
                    const avatar = getAvatarForContact(contact);
                    return (
                      <div
                        key={contact.email}
                        className="flex items-center justify-between p-4 bg-white/70 rounded-xl border border-white/30 transition-all hover:border-fun-primary/30 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 ${avatar.bg} rounded-xl flex items-center justify-center transform transition-all group-hover:scale-110 group-hover:rotate-[10deg]`}>
                            <span className="text-2xl">{avatar.emoji}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{contact.name}</span>
                            <span className="text-sm text-gray-500">{contact.email}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeContact(contact.email)}
                          className="text-red-500 hover:text-red-600 p-2 rounded-lg transition-colors"
                          title="Remove contact"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Messages Section */}
            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Messages</h2>
              
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Enter a quick message (e.g., 'I'm at school')"
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-fun-primary focus:border-transparent placeholder:text-gray-400"
                />
                <button
                  onClick={addQuickMessage}
                  className="bg-gradient-to-r from-fun-primary to-fun-purple hover:opacity-90 text-white px-6 py-2.5 rounded-xl transition-all transform hover:scale-[1.02] flex items-center gap-2 whitespace-nowrap shadow-fun"
                >
                  <Send className="w-5 h-5" />
                  Add Message
                </button>
              </div>

              <div className="space-y-3">
                {quickMessages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No quick messages added yet. Add messages for quick communication.
                  </p>
                ) : (
                  quickMessages.map((message) => (
                    <div
                      key={message.id}
                      className="flex items-center justify-between p-4 bg-white/70 rounded-xl border border-white/30 transition-all hover:border-fun-primary/30"
                    >
                      <p className="text-gray-900">{message.text}</p>
                      <button
                        onClick={() => removeQuickMessage(message.id)}
                        className="text-red-500 hover:text-red-600 p-2 rounded-lg transition-colors"
                        title="Remove message"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}