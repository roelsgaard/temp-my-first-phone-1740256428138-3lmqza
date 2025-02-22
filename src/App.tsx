import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Video, MessageSquare, MessageSquare as QuickMessage, Settings, AlertCircle } from 'lucide-react';
import { VideoPage } from './pages/VideoPage';
import { MessagesPage } from './pages/MessagesPage';
import { QuickMessagesPage } from './pages/QuickMessagesPage';
import { AdminPage } from './pages/AdminPage';
import { auth, googleProvider, requestNotificationPermission } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { BuildNumber } from './components/BuildNumber';

function App() {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        await requestNotificationPermission();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Error signing in:', error);
      if (error.code === 'auth/popup-blocked') {
        setError(
          'The sign-in popup was blocked by your browser. Please allow popups for this site and try again. ' +
          'Look for a popup indicator in your browser\'s address bar.'
        );
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out. Please try again.');
    }
  };

  const tiles = [
    {
      title: 'Video Call',
      description: 'Make video calls with friends and family',
      icon: Video,
      link: '/video',
      bgColor: 'bg-fun-primary',
      comingSoon: false
    },
    {
      title: 'Quick Messages',
      description: 'Send quick preset messages',
      icon: QuickMessage,
      link: '/quick-messages',
      bgColor: 'bg-fun-secondary',
      comingSoon: false
    },
    {
      title: 'Messages',
      description: 'Chat with your contacts',
      icon: MessageSquare,
      link: '/messages',
      bgColor: 'bg-fun-accent',
      comingSoon: false
    },
    {
      title: 'Settings',
      description: 'Manage your contacts',
      icon: Settings,
      link: '/admin',
      bgColor: 'bg-fun-background',
      comingSoon: false
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-fun flex items-center justify-center">
        <div className="text-white text-xl font-bold animate-bounce">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/video" element={user ? <VideoPage /> : <Navigate to="/" replace />} />
        <Route path="/messages" element={user ? <MessagesPage /> : <Navigate to="/" replace />} />
        <Route path="/quick-messages" element={user ? <QuickMessagesPage /> : <Navigate to="/" replace />} />
        <Route path="/admin" element={user ? <AdminPage /> : <Navigate to="/" replace />} />
        <Route path="/" element={
          <div className="min-h-screen bg-gradient-fun p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
                <div>
                  <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 sm:mb-3 animate-float">MyFirstPhone</h1>
                  <p className="text-white/90 text-base sm:text-lg">Your safe space to connect! 🌟</p>
                  <BuildNumber />
                </div>
                {user ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <span className="text-white/90 text-sm sm:text-base break-all">
                      {user.email}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all transform hover:scale-105 font-medium backdrop-blur-sm text-sm sm:text-base w-auto"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    className="bg-white text-fun-primary px-6 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all transform hover:scale-105 font-bold shadow-fun text-sm sm:text-base"
                  >
                    Sign In
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-6 sm:mb-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-white text-sm sm:text-base">{error}</p>
                    {error.includes('popup') && (
                      <p className="text-white/80 mt-2 text-xs sm:text-sm">
                        Tip: Look for a popup blocker icon (🚫) in your browser's address bar and click it to allow popups for this site.
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                {tiles.map((tile, index) => (
                  <div key={index} className="relative group animate-float" style={{ animationDelay: `${index * 0.2}s` }}>
                    {tile.comingSoon ? (
                      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl cursor-not-allowed transform transition-all duration-300">
                        <div className={`${tile.bgColor} p-6 sm:p-8 h-full opacity-50`}>
                          <tile.icon className="w-10 h-10 sm:w-12 sm:h-12 text-white mb-4 sm:mb-6" />
                          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">{tile.title}</h2>
                          <p className="text-white/90 text-base sm:text-lg">{tile.description}</p>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                          <span className="text-white font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-full border-2 border-white/50">
                            Coming Soon
                          </span>
                        </div>
                      </div>
                    ) : (
                      <Link to={tile.link} className="block">
                        <div className={`${tile.bgColor} p-6 sm:p-8 rounded-2xl sm:rounded-3xl transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group-hover:shadow-fun`}>
                          <tile.icon className="w-10 h-10 sm:w-12 sm:h-12 text-white mb-4 sm:mb-6 transform transition-transform group-hover:scale-110" />
                          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">{tile.title}</h2>
                          <p className="text-white/90 text-base sm:text-lg">{tile.description}</p>
                        </div>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;