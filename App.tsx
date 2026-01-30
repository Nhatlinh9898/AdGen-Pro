import React, { useState } from 'react';
import { INITIAL_AD_DATA, AdData } from './types';
import { AdCard } from './components/AdCard';
import { AdEditor } from './components/AdEditor';
import { MusicDashboard } from './components/MusicDashboard';
import { ThreeDashboard } from './components/ThreeDashboard';
import { Music, Box } from 'lucide-react';

const App: React.FC = () => {
  const [adData, setAdData] = useState<AdData>(INITIAL_AD_DATA);
  const [showAudioStudio, setShowAudioStudio] = useState(false);
  const [showThreeStudio, setShowThreeStudio] = useState(false);

  const handleAudioGenerated = (base64: string) => {
    // Optionally save the audio to the adData if we want to persist it or use it later
    // For now, we just let the dashboard handle playback
    setAdData(prev => ({
        ...prev,
        audio: {
            ...prev.audio,
            generatedAudioBase64: base64,
            voiceName: 'Generated', // Placeholder
            script: 'Generated Script'
        }
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#0f2027] via-[#203a43] to-[#2c5364] text-white overflow-hidden flex flex-col">
      <header className="p-4 border-b border-white/10 bg-black/20 backdrop-blur-sm flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight text-white/90">
          AdGen <span className="text-[#00ffff]">Pro</span>
        </h1>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowThreeStudio(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/50 rounded-lg transition-all text-purple-200 text-sm font-medium"
            >
                <Box className="w-4 h-4" />
                3D Studio
            </button>
            <button 
                onClick={() => setShowAudioStudio(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 rounded-lg transition-all text-indigo-200 text-sm font-medium"
            >
                <Music className="w-4 h-4" />
                Audio Studio
            </button>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-6 lg:gap-12 overflow-hidden h-[calc(100vh-64px)]">
        {/* Editor Panel */}
        <section className="w-full lg:w-1/3 min-h-[400px] lg:h-full overflow-hidden flex flex-col order-2 lg:order-1">
          <AdEditor data={adData} onChange={setAdData} />
        </section>

        {/* Preview Panel */}
        <section className="w-full lg:w-2/3 h-full flex flex-col order-1 lg:order-2">
            <div className="bg-white/5 border border-white/10 rounded-xl flex-1 relative overflow-hidden flex items-center justify-center p-4">
                {/* Grid Background Pattern */}
                <div 
                    className="absolute inset-0 opacity-10 pointer-events-none" 
                    style={{
                        backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }} 
                />
                
                <div className="relative w-full">
                    <AdCard data={adData} />
                </div>

                <div className="absolute bottom-4 right-4 text-xs text-white/30 pointer-events-none">
                    Live Preview
                </div>
            </div>
        </section>
      </main>

      {/* Audio Dashboard Modal */}
      {showAudioStudio && (
        <MusicDashboard 
            productName={adData.productName} 
            onAudioGenerated={handleAudioGenerated}
            onClose={() => setShowAudioStudio(false)}
        />
      )}

      {/* 3D Studio Modal */}
      {showThreeStudio && (
        <ThreeDashboard 
            productName={adData.productName} 
            initialConfig={adData.threeD}
            onClose={() => setShowThreeStudio(false)}
        />
      )}
    </div>
  );
};

export default App;