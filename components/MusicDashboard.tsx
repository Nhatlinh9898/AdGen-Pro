
import React, { useState, useRef, useEffect } from 'react';
import { Mic2, Play, Square, Wand2, Music, Volume2, Download, Loader2, Save } from 'lucide-react';
import { generateJingleScript, generateSpeech, fuseAudioStyles } from '../services/geminiService';
import { LibraryItem, AudioConfig } from '../types';
import { LibraryPanel } from './LibraryPanel';

interface MusicDashboardProps {
  productName: string;
  onAudioGenerated: (base64: string) => void;
  onClose: () => void;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
const MOODS = ['Energetic', 'Professional', 'Cinematic', 'Friendly', 'Mysterious'];

// Utility to decode base64 string to Uint8Array
function decode(base64: string) {
  const binaryString = atob(base64.replace(/\s/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Manual PCM decoding function
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const byteLength = data.length % 2 === 0 ? data.length : data.length - 1;
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// System Library Items
const SYSTEM_AUDIO_ITEMS: LibraryItem[] = [
  { id: 'sys_1', type: 'audio', source: 'system', name: 'Tech Beat', createdAt: Date.now(), data: { script: 'Experience the future. Now.', mood: 'Energetic', voiceName: 'Zephyr' } },
  { id: 'sys_2', type: 'audio', source: 'system', name: 'Soft Sell', createdAt: Date.now(), data: { script: 'Gentle, effective, and pure.', mood: 'Friendly', voiceName: 'Kore' } },
  { id: 'sys_3', type: 'audio', source: 'system', name: 'Movie Trailer', createdAt: Date.now(), data: { script: 'In a world where power meets design.', mood: 'Cinematic', voiceName: 'Fenrir' } }
];

export const MusicDashboard: React.FC<MusicDashboardProps> = ({ productName, onAudioGenerated, onClose }) => {
  const [script, setScript] = useState('');
  const [voice, setVoice] = useState('Zephyr');
  const [mood, setMood] = useState('Energetic');
  
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isFusing, setIsFusing] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  
  // Library State
  const [library, setLibrary] = useState<LibraryItem[]>(SYSTEM_AUDIO_ITEMS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    // Load persisted user items if any (mock for now, could be localStorage)
    return () => {
      stopAudio();
      if (audioContextRef.current) audioContextRef.current.close();
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const stopAudio = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current = null;
    }
    setIsPlaying(false);
    if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
  };

  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    try {
      const result = await generateJingleScript(productName, mood);
      setScript(result.trim());
    } catch (error) {
      console.error(error);
      alert("Failed to generate script");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!script) return;
    stopAudio();
    setIsGeneratingAudio(true);
    try {
      const base64 = await generateSpeech(script, voice);
      setAudioBase64(base64);
      onAudioGenerated(base64);
    } catch (error) {
      console.error(error);
      alert("Failed to generate audio");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const playAudio = async () => {
    if (!audioBase64) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    try {
      const audioData = decode(audioBase64);
      const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);

      stopAudio();

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      
      analyserRef.current = analyser;
      sourceRef.current = source;
      source.onended = () => { setIsPlaying(false); cancelAnimationFrame(animationRef.current); };
      source.start(0);
      setIsPlaying(true);
      drawVisualizer();
    } catch (error) {
      console.error("Audio playback failed", error);
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const downloadAudio = () => {
    if (!audioBase64) return;
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${audioBase64}`; 
    link.download = `ad_audio_${Date.now()}.pcm`; 
    link.click();
  };

  // Library Functions
  const saveToLibrary = () => {
    if (!audioBase64 || !script) return;
    const newItem: LibraryItem = {
        id: `user_${Date.now()}`,
        type: 'audio',
        source: 'user',
        name: `Audio ${new Date().toLocaleTimeString()}`,
        createdAt: Date.now(),
        data: { script, mood, voiceName: voice, base64: audioBase64 }
    };
    setLibrary([...library, newItem]);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          // Mock upload for audio: Just creates an entry
          const newItem: LibraryItem = {
            id: `upload_${Date.now()}`,
            type: 'audio',
            source: 'user',
            name: file.name,
            createdAt: Date.now(),
            data: { script: 'Imported Audio Track', mood: 'Imported', voiceName: 'Unknown', base64: '' } // Base64 empty as we can't easily play arbitrary files in this demo setup without more logic
        };
        setLibrary([...library, newItem]);
        alert("Audio imported to library (Simulation).");
      }
  };

  const handleFusion = async () => {
      if (selectedIds.length < 2) return;
      setIsFusing(true);
      try {
          const selectedItems = library.filter(i => selectedIds.includes(i.id));
          const descriptions = selectedItems.map(i => `Script: "${i.data.script}", Mood: ${i.data.mood}`);
          
          const result = await fuseAudioStyles(descriptions);
          
          setScript(result.script);
          setMood(result.mood);
          if (VOICES.includes(result.voiceRecommendation)) {
              setVoice(result.voiceRecommendation);
          }
          setSelectedIds([]);
      } catch (e) {
          console.error(e);
          alert("Fusion failed.");
      } finally {
          setIsFusing(false);
      }
  };

  const handleLoadItem = (item: LibraryItem) => {
      setScript(item.data.script);
      setMood(item.data.mood);
      setVoice(item.data.voiceName);
      if (item.data.base64) {
          setAudioBase64(item.data.base64);
          stopAudio();
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a2b36] w-full max-w-5xl rounded-xl border border-[#00ffff]/30 shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-gray-900 to-[#0f2027] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#00ffff]/10 rounded-lg">
                <Music className="w-5 h-5 text-[#00ffff]" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-white">AI Audio Studio</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Left: Generator */}
            <div className="w-2/3 p-6 overflow-y-auto space-y-6 border-r border-white/10">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Voice Model</label>
                        <div className="flex flex-wrap gap-2">
                            {VOICES.map(v => (
                                <button 
                                    key={v}
                                    onClick={() => setVoice(v)}
                                    className={`px-3 py-1.5 rounded text-sm transition-all border ${
                                        voice === v 
                                        ? 'bg-[#00ffff]/20 border-[#00ffff] text-[#00ffff]' 
                                        : 'bg-black/20 border-white/10 text-gray-300 hover:border-white/30'
                                    }`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Vibe / Mood</label>
                        <select 
                            value={mood}
                            onChange={(e) => setMood(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#00ffff] outline-none"
                        >
                            {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="block text-xs uppercase tracking-wider text-gray-400">Script</label>
                        <button 
                            onClick={handleGenerateScript}
                            disabled={isGeneratingScript}
                            className="text-xs text-[#00ffff] hover:text-[#b3ffff] flex items-center gap-1"
                        >
                            {isGeneratingScript ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            Generate Script
                        </button>
                    </div>
                    <textarea 
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        placeholder="Enter text..."
                        className="w-full h-24 bg-black/30 border border-white/10 rounded p-3 text-sm focus:border-[#00ffff] focus:outline-none resize-none"
                    />
                </div>

                <div className="bg-black/40 rounded-lg border border-white/10 p-4 flex flex-col items-center justify-center min-h-[160px] relative">
                    <canvas ref={canvasRef} width="600" height="100" className="w-full h-[100px] mb-4 opacity-80" />
                    <div className="flex items-center gap-4">
                        {isGeneratingAudio ? (
                            <button disabled className="px-6 py-2 bg-indigo-600/50 rounded-full flex items-center gap-2 cursor-not-allowed">
                                <Loader2 className="w-5 h-5 animate-spin text-white" />
                                <span className="text-white font-medium">Rendering...</span>
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={handleGenerateAudio}
                                    disabled={!script.trim()}
                                    className="px-6 py-2 bg-[#00ffff] text-black rounded-full font-bold hover:bg-[#b3ffff] transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Mic2 className="w-4 h-4" />
                                    Create
                                </button>
                                {audioBase64 && (
                                    <>
                                        <button onClick={isPlaying ? stopAudio : playAudio} className="w-10 h-10 rounded-full bg-[#00ffff] text-black flex items-center justify-center hover:scale-105">
                                            {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-1" />}
                                        </button>
                                        <button onClick={downloadAudio} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button onClick={saveToLibrary} className="p-2 bg-white/10 rounded-full hover:bg-white/20" title="Save to Library">
                                            <Save className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Library */}
            <div className="w-1/3 p-4 bg-black/10">
                <LibraryPanel 
                    title="Audio Library"
                    items={library}
                    selectedIds={selectedIds}
                    onSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    onDelete={(id) => setLibrary(prev => prev.filter(i => i.id !== id))}
                    onUpload={() => fileInputRef.current?.click()}
                    onFusion={handleFusion}
                    onLoadItem={handleLoadItem}
                    isFusionLoading={isFusing}
                />
                <input type="file" ref={fileInputRef} onChange={handleUpload} accept="audio/*" className="hidden" />
            </div>
        </div>
      </div>
    </div>
  );
};
