import React, { useEffect, useRef, useState } from 'react';
import './VideoPlayer.css';

// Utility to extract YouTube ID
function getYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function VideoPlayer({ url, onProgress, seekTime }) {
  const videoId = getYouTubeId(url);
  const containerId = 'youtube-player-iframe';
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const [apiReady, setApiReady] = useState(false);

  // 1. Load YouTube IFrame API dynamically
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }

    // Add API script to DOM
    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // Callback when API is loaded
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback();
      setApiReady(true);
    };

    return () => {
      // Clean up callback if component unmounts before API loads
      window.onYouTubeIframeAPIReady = previousCallback;
    };
  }, []);

  // 2. Initialize Player when API is ready and videoId changes
  useEffect(() => {
    if (!apiReady || !videoId) return;

    // Destroy existing player if it exists
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.error('Error destroying player:', e);
      }
      playerRef.current = null;
    }

    // Clear progress interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Create player
    playerRef.current = new window.YT.Player(containerId, {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        fs: 1, // Allow full screen
        cc_load_policy: 0, // Disable default CC to show ours!
        iv_load_policy: 3
      },
      events: {
        onStateChange: (event) => {
          // Play state = 1
          if (event.data === window.YT.PlayerState.PLAYING) {
            startPollingProgress();
          } else {
            stopPollingProgress();
          }
        }
      }
    });

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
      stopPollingProgress();
    };
  }, [apiReady, videoId]);

  // 3. Handle external seek requests
  useEffect(() => {
    if (playerRef.current && typeof seekTime === 'number') {
      playerRef.current.seekTo(seekTime, true);
      // If player was paused, play it
      if (playerRef.current.getPlayerState() !== window.YT.PlayerState.PLAYING) {
        playerRef.current.playVideo();
      }
    }
  }, [seekTime]);

  const startPollingProgress = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const currentTime = playerRef.current.getCurrentTime();
        onProgress(currentTime);
      }
    }, 200); // Poll every 200ms for tight sync
  };

  const stopPollingProgress = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  if (!videoId) {
    return <div className="video-player-error">Invalid Video URL</div>;
  }

  return (
    <div className="video-player-wrapper">
      <div className="player-aspect-ratio">
        <div id={containerId}></div>
      </div>
    </div>
  );
}
