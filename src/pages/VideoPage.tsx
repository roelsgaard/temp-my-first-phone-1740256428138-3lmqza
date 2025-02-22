import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Phone, PhoneOff, AlertCircle, ArrowLeft, User } from 'lucide-react';
import { auth, createCallOffer, createCallAnswer, addIceCandidate, listenToCall, endCall, database, sendNotification } from '../firebase';
import { Link } from 'react-router-dom';
import { Contact, getAvatarForContact, avatarOptions } from '../utils/avatars';

export function VideoPage() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isGettingMedia, setIsGettingMedia] = useState(false);
  const [callerName, setCallerName] = useState<string | null>(null);
  const [callerContact, setCallerContact] = useState<Contact | null>(null);
  const [userAvatar, setUserAvatar] = useState(avatarOptions[0]);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Load contacts from localStorage
    const storedContacts = localStorage.getItem(`contacts_${auth.currentUser.uid}`);
    if (storedContacts) {
      setContacts(JSON.parse(storedContacts));
    }

    // Load user's avatar preference
    const storedUserAvatar = localStorage.getItem(`userAvatar_${auth.currentUser.uid}`);
    if (storedUserAvatar) {
      const avatar = avatarOptions.find(a => a.id === storedUserAvatar);
      if (avatar) {
        setUserAvatar(avatar);
      }
    }
  }, []);

  useEffect(() => {
    if (auth.currentUser?.email) {
      listenToCall('', async (data, callId) => {
        if (data?.offer && !data?.answer && !isCallActive && callId) {
          setIsIncomingCall(true);
          setCurrentCallId(callId);
          
          // Find caller's contact info
          const caller = contacts.find(contact => contact.email === data.fromEmail);
          if (caller) {
            setCallerContact(caller);
            setCallerName(caller.name);
          } else {
            setCallerName(data.fromEmail);
          }
        }
      });
    }
  }, [isCallActive, contacts]);

  const getLocalStream = async () => {
    try {
      setIsGettingMedia(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(error => {
          console.error('Error playing local video:', error);
        });
      }
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setError('Failed to access camera/microphone. Please check your permissions.');
      throw error;
    } finally {
      setIsGettingMedia(false);
    }
  };

  const setupPeerConnection = async (stream: MediaStream) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: [
            'turn:eu-0.turn.peerjs.com:3478',
            'turn:us-0.turn.peerjs.com:3478',
          ],
          username: 'peerjs',
          credential: 'peerjsp'
        }
      ],
      iceCandidatePoolSize: 10
    };

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    const pc = new RTCPeerConnection(configuration);
    peerConnection.current = pc;

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    const newRemoteStream = new MediaStream();
    setRemoteStream(newRemoteStream);

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        newRemoteStream.addTrack(track);
      });
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = newRemoteStream;
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        stopCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        stopCall();
      }
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate && currentCallId) {
        try {
          await addIceCandidate(currentCallId, event.candidate.toJSON(), !isIncomingCall);
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    };

    return pc;
  };

  const startCall = async () => {
    try {
      if (!auth.currentUser?.email || !selectedContact) {
        setError('Please select a contact to call.');
        return;
      }

      setError(null);
      setIsCallActive(true);
      
      const stream = await getLocalStream();
      const pc = await setupPeerConnection(stream);
      
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await pc.setLocalDescription(offer);
      
      const callId = await createCallOffer(auth.currentUser.email, selectedContact.email, offer);
      setCurrentCallId(callId);

      // Send notification to recipient
      await sendNotification(
        selectedContact.email,
        'Incoming Video Call',
        `${auth.currentUser.email} is calling you`,
        '/video'
      );

      listenToCall(callId, async (data) => {
        if (data?.answer && !pc.remoteDescription) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          } catch (e) {
            console.error('Error setting remote description:', e);
          }
        }

        if (data?.answerCandidates && pc.remoteDescription) {
          Object.values(data.answerCandidates).forEach(async (candidate: any) => {
            if (candidate && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.error('Error adding ICE candidate:', e);
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('Error starting call:', error);
      setError('Failed to start call. Please check your camera/microphone permissions.');
      stopCall();
    }
  };

  const answerCall = async () => {
    try {
      if (!currentCallId) return;

      setIsCallActive(true);
      
      const stream = await getLocalStream();
      const pc = await setupPeerConnection(stream);

      const callData = await new Promise((resolve) => {
        listenToCall(currentCallId, resolve);
      });

      if (!callData?.offer) {
        throw new Error('No offer found in call data');
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await createCallAnswer(currentCallId, answer);
      } catch (error) {
        console.error('Error during answer creation:', error);
        throw error;
      }

      if (callData?.offerCandidates) {
        Object.values(callData.offerCandidates).forEach(async (candidate: any) => {
          if (candidate && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.error('Error adding ICE candidate:', e);
            }
          }
        });
      }

      setIsIncomingCall(false);
    } catch (error) {
      console.error('Error answering call:', error);
      setError('Failed to answer call. Please try again.');
      stopCall();
    }
  };

  const stopCall = async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (currentCallId) {
      await endCall(currentCallId);
      setCurrentCallId(null);
    }
    setIsCallActive(false);
    setIsIncomingCall(false);
    setSelectedContact(null);
    setCallerName(null);
    setCallerContact(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fun-primary via-fun-purple to-fun-pink p-0 sm:p-4">
      <div className="bg-white/90 backdrop-blur-lg w-full h-screen sm:h-[80vh] rounded-none sm:rounded-xl shadow-fun-lg">
        {/* Header */}
        <div className="p-4 border-b border-white/20 flex items-center gap-3 bg-white/50 rounded-none sm:rounded-t-xl">
          <Link to="/" className="text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-bold text-xl text-gray-900">Video Call</h1>
        </div>

        <div className="p-8">
          <div className="flex flex-col items-center space-y-6">
            {error && (
              <div className="w-full bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <div className="w-full space-y-6">
              {!isCallActive && !isIncomingCall && (
                <div className="space-y-6">
                  {contacts.length === 0 ? (
                    <div className="text-center py-12 animate-fade-in">
                      <User className="w-16 h-16 text-fun-primary/30 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg mb-4">No contacts found</p>
                      <Link
                        to="/admin"
                        className="text-fun-primary hover:text-fun-primary/80 font-semibold text-lg transition-colors"
                      >
                        Add contacts in Settings
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {contacts.map((contact, index) => {
                          const avatar = getAvatarForContact(contact);
                          return (
                            <button
                              key={contact.email}
                              onClick={() => setSelectedContact(contact)}
                              className={`p-6 rounded-2xl transition-all transform hover:scale-[1.02] animate-fade-in ${
                                selectedContact?.email === contact.email
                                  ? 'bg-gradient-to-r from-fun-primary to-fun-secondary text-white shadow-fun'
                                  : 'bg-white/50 hover:bg-white/70 text-gray-900'
                              }`}
                              style={{ animationDelay: `${index * 0.1}s` }}
                            >
                              <div className="flex flex-col items-center text-center">
                                <div className={`w-16 h-16 ${
                                  selectedContact?.email === contact.email
                                    ? 'bg-white/20'
                                    : avatar.bg
                                } rounded-2xl flex items-center justify-center mb-3 transform transition-transform hover:scale-110 hover:rotate-[10deg]`}>
                                  <span className="text-3xl">{avatar.emoji}</span>
                                </div>
                                <span className="font-semibold text-lg mb-1">{contact.name}</span>
                                <span className={`text-sm ${
                                  selectedContact?.email === contact.email
                                    ? 'text-white/80'
                                    : 'text-gray-500'
                                }`}>{contact.email}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-center">
                        <button
                          onClick={startCall}
                          disabled={!selectedContact || isGettingMedia}
                          className="bg-gradient-to-r from-fun-accent to-fun-secondary hover:opacity-90 disabled:opacity-50 text-white font-semibold py-4 px-8 rounded-2xl transition-all transform hover:scale-[1.02] shadow-fun flex items-center gap-3 text-lg"
                        >
                          <Phone className="w-6 h-6" />
                          {isGettingMedia ? 'Starting...' : `Call ${selectedContact?.name || ''}`}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {isIncomingCall && (
                <div className="flex flex-col items-center gap-6 p-8 bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-white/20 animate-fade-in">
                  {callerContact && (
                    <div className={`w-24 h-24 ${getAvatarForContact(callerContact).bg} rounded-2xl flex items-center justify-center animate-bounce-gentle`}>
                      <span className="text-5xl">{getAvatarForContact(callerContact).emoji}</span>
                    </div>
                  )}
                  <p className="text-2xl font-semibold text-fun-primary">
                    Incoming call from {callerName}
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={answerCall}
                      disabled={isGettingMedia}
                      className="bg-gradient-to-r from-fun-accent to-fun-secondary hover:opacity-90 disabled:opacity-50 text-white font-semibold py-3 px-8 rounded-2xl transition-all transform hover:scale-[1.02] shadow-fun flex items-center gap-2"
                    >
                      <Phone className="w-5 h-5" />
                      {isGettingMedia ? 'Connecting...' : 'Answer'}
                    </button>
                    <button
                      onClick={stopCall}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:opacity-90 text-white font-semibold py-3 px-8 rounded-2xl transition-all transform hover:scale-[1.02] shadow-lg flex items-center gap-2"
                    >
                      <PhoneOff className="w-5 h-5" />
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {isCallActive && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative aspect-video">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover rounded-2xl bg-gray-900 shadow-lg"
                      />
                      <div className="absolute bottom-3 left-3 text-white bg-black/50 px-3 py-1.5 rounded-xl backdrop-blur-sm font-medium flex items-center gap-2">
                        <div className={`w-8 h-8 ${userAvatar.bg} rounded-lg flex items-center justify-center`}>
                          <span className="text-xl">{userAvatar.emoji}</span>
                        </div>
                        <span>You</span>
                      </div>
                    </div>
                    <div className="relative aspect-video">
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover rounded-2xl bg-gray-900 shadow-lg"
                      />
                      <div className="absolute bottom-3 left-3 text-white bg-black/50 px-3 py-1.5 rounded-xl backdrop-blur-sm font-medium flex items-center gap-2">
                        {selectedContact || callerContact ? (
                          <>
                            <div className={`w-8 h-8 ${getAvatarForContact(selectedContact || callerContact).bg} rounded-lg flex items-center justify-center`}>
                              <span className="text-xl">{getAvatarForContact(selectedContact || callerContact).emoji}</span>
                            </div>
                            <span>{selectedContact?.name || callerName}</span>
                          </>
                        ) : (
                          <span>{callerName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={stopCall}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:opacity-90 text-white font-semibold py-4 px-8 rounded-2xl transition-all transform hover:scale-[1.02] shadow-lg flex items-center gap-3 text-lg"
                    >
                      <PhoneOff className="w-6 h-6" />
                      End Call
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}