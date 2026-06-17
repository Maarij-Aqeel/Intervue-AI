"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { useRouter } from "next/navigation";

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
  audioLevelRef?: React.MutableRefObject<number>;
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
  audioLevelRef,
}: LiveKitInterviewProps) {
  const roomRef = useRef<Room | null>(null);
  const router = useRouter();
  const warningSentRef = useRef(false);
  const agentReadyFiredRef = useRef(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Web Audio analysis — feeds the reactive orb via audioLevelRef
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<AnalyserNode[]>([]);
  const levelRafRef = useRef<number>(0);

  const setupAnalyser = useCallback((mediaTrack: MediaStreamTrack) => {
    const ac = audioCtxRef.current;
    if (!ac) return;
    try {
      const stream = new MediaStream([mediaTrack]);
      const source = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser); // analysis only — not connected to destination
      analysersRef.current.push(analyser);
    } catch (e) {
      console.warn("[LiveKit] analyser setup failed:", e);
    }
  }, []);

  const startLevelLoop = useCallback(() => {
    if (levelRafRef.current) return;
    const buf = new Uint8Array(128);
    const tick = () => {
      let max = 0;
      for (const an of analysersRef.current) {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        if (rms > max) max = rms;
      }
      if (audioLevelRef) audioLevelRef.current = Math.min(1, max * 3.2);
      levelRafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [audioLevelRef]);

  const tryStartAudio = useCallback(() => {
    const room = roomRef.current;
    audioCtxRef.current?.resume().catch(() => {});
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

        // Audio context for the reactive orb
        const AC =
          window.AudioContext ||
          (window as any).webkitAudioContext;
        audioCtxRef.current = new AC();
        startLevelLoop();

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
            // Feed agent voice into the reactive orb
            if (track.mediaStreamTrack) setupAnalyser(track.mediaStreamTrack);
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

        // Feed user mic into the reactive orb
        const micTrack = room.localParticipant
          .getTrackPublication(Track.Source.Microphone)
          ?.track?.mediaStreamTrack;
        if (micTrack) setupAnalyser(micTrack);
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
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = 0;
      analysersRef.current = [];
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
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

  // Headless — the reactive orb (rendered by the parent) is the visual.
  // Only surface the audio-unblock affordance when the browser blocks autoplay.
  if (!audioBlocked) return null;

  return (
    <button
      onClick={tryStartAudio}
      className="fixed top-24 left-1/2 -translate-x-1/2 z-30 bg-black/70 hover:bg-black/80 text-white text-sm font-semibold px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition-all"
    >
      Tap to enable audio
    </button>
  );
}
