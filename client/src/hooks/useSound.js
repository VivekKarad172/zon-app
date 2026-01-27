import { useState, useCallback, useRef } from 'react';

export const useSound = () => {
    const [muted, setMuted] = useState(localStorage.getItem('soundMuted') === 'true');
    const audioContextRef = useRef(null);

    const toggleMute = () => {
        const newMuted = !muted;
        setMuted(newMuted);
        localStorage.setItem('soundMuted', newMuted);
    };

    const initAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
    };

    const playTone = (freq, type, duration, vol = 0.1) => {
        if (muted) return;
        initAudioContext();

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    };

    // Success: High C major chord arpeggio or simple ding
    const playSuccess = useCallback(() => {
        if (muted) return;
        // Play a nice "Ding" (Sine wave, high pitch)
        playTone(880, 'sine', 0.1, 0.1); // A5
        setTimeout(() => playTone(1108.73, 'sine', 0.3, 0.1), 50); // C#6
    }, [muted]);

    // Error: Low buzz
    const playError = useCallback(() => {
        if (muted) return;
        // Play a "Bonk" (Sawtooth, low pitch)
        playTone(150, 'sawtooth', 0.3, 0.1);
        setTimeout(() => playTone(100, 'sawtooth', 0.3, 0.1), 100);
    }, [muted]);

    // Click/Tap sound
    const playClick = useCallback(() => {
        if (muted) return;
        playTone(400, 'sine', 0.05, 0.05);
    }, [muted]);

    return { playSuccess, playError, playClick, muted, toggleMute };
};
