import React, { useState, useEffect } from 'react';
import { AdData, THEMES } from '../types';

interface AdCardProps {
  data: AdData;
}

export const AdCard: React.FC<AdCardProps> = ({ data }) => {
  const theme = THEMES[data.theme] || THEMES.cyber;
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setVideoError(false);
  }, [data.videoUrl]);

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const renderVideo = () => {
    if (!data.videoUrl) return null;

    const youtubeId = getYouTubeId(data.videoUrl);
    const isYouTubeLike = data.videoUrl.includes('youtube.com') || data.videoUrl.includes('youtu.be');

    // Case 1: Invalid YouTube URL
    if (isYouTubeLike && !youtubeId) {
      return (
        <div 
            className="w-full mt-6 mb-2 rounded-lg border flex flex-col items-center justify-center p-8 bg-black/10" 
            style={{ borderColor: theme.text, color: theme.text }}
        >
            <div className="text-2xl mb-2">⚠️</div>
            <div className="font-bold opacity-80">Invalid Video Source</div>
            <div className="text-sm opacity-60">Invalid YouTube URL format</div>
        </div>
      );
    }

    // Case 2: Video file load error
    if (videoError) {
      return (
        <div 
            className="w-full mt-6 mb-2 rounded-lg border flex flex-col items-center justify-center p-8 bg-black/10" 
            style={{ borderColor: theme.text, color: theme.text }}
        >
            <div className="text-2xl mb-2">⚠️</div>
            <div className="font-bold opacity-80">Invalid Video Source</div>
            <div className="text-sm opacity-60">Unable to load video file</div>
        </div>
      );
    }

    return (
      <div className="w-full mt-6 mb-2 rounded-lg overflow-hidden border" style={{ borderColor: theme.text, opacity: 0.9 }}>
        {youtubeId ? (
          <iframe
            width="100%"
            height="315"
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video 
            key={data.videoUrl}
            width="100%" 
            controls 
            className="block"
            onError={() => setVideoError(true)}
          >
            <source src={data.videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div 
        className="w-full max-w-[800px] rounded-xl transition-all duration-300"
        style={{
            background: theme.background, 
            color: theme.text,
            padding: '30px',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            borderRadius: '12px'
        }}
      >
        <div 
          className="font-bold leading-tight"
          style={{ fontSize: '28px', marginBottom: '10px', color: theme.accent }}
        >
          {data.header}
        </div>
        
        <div 
          className="font-bold leading-tight"
          style={{ fontSize: '24px', marginBottom: '20px' }}
        >
          {data.productName}
        </div>

        <ul className="list-none p-0 m-0">
          {data.specs.map((spec, index) => (
            <li 
              key={index} 
              className="flex items-start"
              style={{ fontSize: '16px', marginBottom: '8px' }}
            >
              <span className="opacity-90">{spec}</span>
            </li>
          ))}
        </ul>

        {renderVideo()}

        <div 
          className="text-center"
          style={{ fontSize: '14px', marginTop: '30px', color: theme.footerColor }}
        >
          {data.footer}
        </div>
      </div>
    </div>
  );
};