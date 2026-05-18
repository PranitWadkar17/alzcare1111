'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneCall, CheckCircle2, Loader2, PhoneOff } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface Props {
  patientId: string;
  caregiverId: string;
  className?: string;
}

export function CallCaregiverButton({ patientId, caregiverId, className = '' }: Props) {
  const [calling, setCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('');
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const supabase = createBrowserSupabaseClient();

  // Subscribe to call status updates
  useEffect(() => {
    if (!currentCallId) return;

    const channel = supabase
      .channel(`call-status-${currentCallId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${currentCallId}`,
        },
        (payload) => {
          const call = payload.new as any;
          setCallStatus(call.status);
          
          if (call.status === 'completed' || call.status === 'missed' || call.status === 'failed') {
            setCalling(false);
            setTimeout(() => {
              setCallStatus('');
              setCurrentCallId(null);
            }, 5000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCallId, supabase]);

  const initiateCall = async () => {
    try {
      setCalling(true);
      setCallStatus('initiating');
      setError('');

      const response = await fetch('/api/twilio/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          caregiverId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCallStatus('ringing');
        setCurrentCallId(data.callId);
      } else {
        throw new Error(data.error || 'Failed to initiate call');
      }
    } catch (err: any) {
      console.error('Call failed:', err);
      setError(err.message || 'Failed to call caregiver');
      setCalling(false);
      setCallStatus('failed');
    }
  };

  const getStatusInfo = () => {
    switch (callStatus) {
      case 'initiating':
        return {
          icon: Loader2,
          text: 'Initiating call...',
          color: 'text-cyan-400',
          bgColor: 'from-cyan-500/20 to-sky-500/10',
          borderColor: 'border-cyan-500/30',
        };
      case 'ringing':
        return {
          icon: PhoneCall,
          text: 'Caregiver will call you soon',
          color: 'text-emerald-400',
          bgColor: 'from-emerald-500/20 to-teal-500/10',
          borderColor: 'border-emerald-500/30',
        };
      case 'active':
        return {
          icon: CheckCircle2,
          text: 'Call received by caregiver',
          color: 'text-emerald-400',
          bgColor: 'from-emerald-500/20 to-teal-500/10',
          borderColor: 'border-emerald-500/30',
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          text: 'Call completed',
          color: 'text-emerald-400',
          bgColor: 'from-emerald-500/20 to-teal-500/10',
          borderColor: 'border-emerald-500/30',
        };
      case 'missed':
        return {
          icon: PhoneOff,
          text: 'Caregiver missed the call',
          color: 'text-amber-400',
          bgColor: 'from-amber-500/20 to-orange-500/10',
          borderColor: 'border-amber-500/30',
        };
      case 'failed':
        return {
          icon: PhoneOff,
          text: error || 'Call failed',
          color: 'text-red-400',
          bgColor: 'from-red-500/20 to-rose-500/10',
          borderColor: 'border-red-500/30',
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <motion.button
        whileHover={{ scale: calling ? 1 : 1.05, y: calling ? 0 : -4 }}
        whileTap={{ scale: calling ? 1 : 0.98 }}
        onClick={initiateCall}
        disabled={calling}
        className={`
          group relative px-8 py-5 rounded-3xl font-black text-white
          flex items-center gap-3.5 transition-all duration-300
          shadow-2xl overflow-hidden
          ${calling 
            ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 cursor-not-allowed' 
            : 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 shadow-emerald-500/40 hover:shadow-emerald-500/60'
          }
        `}
      >
        {/* Animated background gradient */}
        {!calling && (
          <motion.div
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/20 to-emerald-400/0 opacity-0 group-hover:opacity-100"
            style={{ backgroundSize: '200% 200%' }}
          />
        )}

        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity" />

        <div className="relative flex items-center gap-3.5">
          {callStatus === 'initiating' ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Phone className="w-6 h-6" />
          )}
          <span className="text-base">
            {calling ? 'Calling...' : 'Call Caregiver'}
          </span>
        </div>
      </motion.button>

      {/* Status message */}
      <AnimatePresence mode="wait">
        {statusInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className={`
              relative p-5 rounded-2xl backdrop-blur-xl
              bg-gradient-to-br ${statusInfo.bgColor}
              border-2 ${statusInfo.borderColor}
              shadow-2xl max-w-sm w-full
            `}
          >
            {/* Pulsing glow for active states */}
            {(callStatus === 'ringing' || callStatus === 'active') && (
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={`absolute inset-0 bg-gradient-to-r ${statusInfo.bgColor} blur-xl rounded-2xl`}
              />
            )}

            <div className="relative flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-white/10 ${statusInfo.color}`}>
                <statusInfo.icon className={`w-6 h-6 ${callStatus === 'initiating' ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold ${statusInfo.color}`}>
                  {statusInfo.text}
                </p>
                {callStatus === 'ringing' && (
                  <p className="text-xs text-slate-400 mt-1">
                    Keep your phone nearby 📱
                  </p>
                )}
                {callStatus === 'active' && (
                  <p className="text-xs text-slate-400 mt-1">
                    They will call you back shortly
                  </p>
                )}
              </div>
              
              {/* Animated indicator */}
              {(callStatus === 'ringing' || callStatus === 'active') && (
                <div className="flex gap-1">
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
                      className={`w-2 h-2 rounded-full ${statusInfo.color.replace('text-', 'bg-')}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
