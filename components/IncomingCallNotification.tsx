'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, X, User } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface Props {
  caregiverId: string;
}

interface IncomingCall {
  id: string;
  patient_id: string;
  patient_name: string;
  status: string;
  created_at: string;
}

export function IncomingCallNotification({ caregiverId }: Props) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    // Subscribe to new calls
    const channel = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `caregiver_id=eq.${caregiverId}`,
        },
        async (payload) => {
          const call = payload.new as any;
          
          // Get patient name
          const { data: patient } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', call.patient_id)
            .single();

          setIncomingCall({
            id: call.id,
            patient_id: call.patient_id,
            patient_name: patient?.name || 'Patient',
            status: call.status,
            created_at: call.created_at,
          });

          // Play notification sound (optional)
          playNotificationSound();
        }
      )
      .subscribe();

    // Also subscribe to status updates
    const statusChannel = supabase
      .channel('call-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `caregiver_id=eq.${caregiverId}`,
        },
        (payload) => {
          const call = payload.new as any;
          
          // Hide notification if call is no longer ringing
          if (call.status !== 'ringing' && incomingCall?.id === call.id) {
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(statusChannel);
    };
  }, [caregiverId, supabase, incomingCall]);

  const playNotificationSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const dismissNotification = () => {
    setIncomingCall(null);
  };

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]"
        >
          <div className="relative p-6 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur-2xl border-2 border-emerald-400/40 shadow-2xl shadow-emerald-500/30 overflow-hidden">
            {/* Animated background */}
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 blur-xl"
            />

            {/* Close button */}
            <button
              onClick={dismissNotification}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="relative">
              {/* Header */}
              <div className="flex items-center gap-4 mb-4">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="p-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/50"
                >
                  <Phone className="w-6 h-6 text-white" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-white">Incoming Call Request</h3>
                  <p className="text-sm text-emerald-300">Patient needs assistance</p>
                </div>
              </div>

              {/* Patient info */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-600/20">
                  <User className="w-5 h-5 text-violet-300" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{incomingCall.patient_name}</p>
                  <p className="text-xs text-slate-400">Just now</p>
                </div>
              </div>

              {/* Message */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <p className="text-sm text-emerald-200 text-center">
                  📞 Your phone will ring shortly. Please answer to assist the patient.
                </p>
              </div>

              {/* Animated indicator */}
              <div className="flex items-center justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                    className="w-2 h-2 rounded-full bg-emerald-400"
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
