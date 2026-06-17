"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { useRouter } from "next/navigation";
import Pulse from "./CirclePulse";

export interface TranscriptEntry {
  role: string;
  text: string;
}

interface LiveKitInterviewProps {
  stopCall: boolean;
  questionsArray: string[];
  timeleft: number;
  name: string;
  interviewId: string;
  userId: string;
  duration: number;
  setTranscript: React.Dispatch<React.SetStateAction<TranscriptEntry[]>>;
  setError: any;
  onAgentReady?: () => void;
}

export default function LiveKitInterview({
  stopCall,
  questionsArray,
  timeleft,
  name,
  interviewId,
  userId,
  duration,
  setTranscript,
  setError,
  onAgentReady,
}: LiveKitInterviewProps) {
  const roomRef = useRef<Room | null>(null);
  const router = useRouter();
  const warningSentRef = useRef(false);
  const agentReadyFiredRef = useRef(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const tryStartAudio = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    room.startAudio()
      .then(() => setAudioBlocked(false))
      .catch((err) => console.error("[LiveKit] startAudio() failed:", err));
  }, []);

  useEffect(() => {
    let cleaned = false;

    const connect = async () => {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewId, userId, name, questionsArray, duration }),
        });

        if (!res.ok) {
          if (!cleaned) setError(true);
          return;
        }

        if (cleaned) return;

        const { token, url } = await res.json();
        const room = new Room();
        roomRef.current = room;

        room.on(RoomEvent.DataReceived, (payload) => {
          try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            if (data.type === "transcript" && data.text) {
              const role: string = data.role ?? "user";
              setTranscript((prev) => {
                // Remove any pending speaking indicator for this role
                const filtered =
                  prev[prev.length - 1]?.role === "user-pending"
                    ? prev.slice(0, -1)
                    : prev;
                const last = filtered[filtered.length - 1];
                // Merge consecutive messages from same speaker into one entry
                if (last && last.role === role) {
                  return [
                    ...filtered.slice(0, -1),
                    { role, text: last.text + " " + data.text },
                  ];
                }
                return [...filtered, { role, text: data.text }];
              });
            }
          } catch {
            // ignore malformed packets
          }
        });

        room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          const localSpeaking = speakers.some((p) => p.isLocal);
          if (localSpeaking) {
            setTranscript((prev) => {
              if (prev[prev.length - 1]?.role === "user-pending") return prev;
              return [...prev, { role: "user-pending", text: "" }];
            });
          } else {
            // Give STT 1.5 s to commit; if no transcript arrives, drop indicator
            setTimeout(() => {
              setTranscript((prev) =>
                prev[prev.length - 1]?.role === "user-pending"
                  ? prev.slice(0, -1)
                  : prev
              );
            }, 1500);
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          if (cleaned) return;
          setTimeout(() => {
            router.push(`/results?p=${interviewId}&q=${userId}`);
          }, 2000);
        });

        room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
          if (!cleaned) setAudioBlocked(!room.canPlaybackAudio);
        });

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            el.volume = 1;
            el.muted = false;
            el.play().catch((e) =>
              console.warn("[LiveKit] audio.play() blocked:", e)
            );
            // Signal that agent audio is live — fire once only
            if (!agentReadyFiredRef.current && !cleaned) {
              agentReadyFiredRef.current = true;
              onAgentReady?.();
            }
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            track.detach();
          }
        });

        await room.connect(url, token);

        if (cleaned) {
          room.disconnect();
          return;
        }

        if (!room.canPlaybackAudio) {
          setAudioBlocked(true);
        }

        room.startAudio().catch(() => {});

        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (err) {
        if (!cleaned) {
          console.error("[LiveKit] connection error:", err);
          setError(true);
        }
      }
    };

    connect();

    return () => {
      cleaned = true;
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId, userId]);

  useEffect(() => {
    if (stopCall) roomRef.current?.disconnect();
  }, [stopCall]);

  useEffect(() => {
    if (timeleft > 30 || warningSentRef.current || !roomRef.current) return;
    warningSentRef.current = true;
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "time_warning", secondsLeft: 30 })
    );
    roomRef.current.localParticipant
      .publishData(payload, { reliable: true })
      .catch(() => {});
  }, [timeleft]);

  return (
    <div
      className="relative cursor-pointer"
      onClick={audioBlocked ? tryStartAudio : undefined}
      title={audioBlocked ? "Click to enable audio" : undefined}
    >
      <Pulse />
      {audioBlocked && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-full pointer-events-none">
            Tap to enable audio
          </span>
        </div>
      )}
    </div>
  );
}
