import React, { useState, useRef, useEffect } from 'react';

export default function SongGuesser() {
  const [trackStates, setTrackStates] = useState({
    bass: false,
    drums: false,
    other: false,
    vocals: false
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRefs = useRef({});
  const progressInterval = useRef(null);
  
  // Initialize audio elements
  useEffect(() => {
    const tracks = ['bass', 'drums', 'other', 'vocals'];
    tracks.forEach(track => {
      const audio = new Audio(`/${track}.wav`);
      audio.addEventListener('loadedmetadata', () => {
        if (!duration) {
          setDuration(audio.duration);
        }
      });
      audioRefs.current[track] = audio;
    });
    
    return () => {
      // Clean up
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);
  
  // Set up timer to update progress
  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        // Get current time from any playing track
        const playingTrack = Object.keys(trackStates).find(t => trackStates[t]);
        if (playingTrack && audioRefs.current[playingTrack]) {
          setCurrentTime(audioRefs.current[playingTrack].currentTime);
        }
        
        // Check if we reached the end
        if (playingTrack && 
            audioRefs.current[playingTrack].currentTime >= audioRefs.current[playingTrack].duration - 0.1) {
          handleStop();
        }
      }, 100);
    } else if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, trackStates]);
  
  const toggleTrack = (track) => {
    setTrackStates(prev => {
      const newState = { ...prev, [track]: !prev[track] };
      
      if (newState[track] && isPlaying) {
        // Turn track on
        audioRefs.current[track].currentTime = currentTime;
        audioRefs.current[track].play();
      } else if (!newState[track]) {
        // Turn track off
        audioRefs.current[track].pause();
      }
      
      return newState;
    });
  };
  
  const togglePlayback = () => {
    if (isPlaying) {
      // Pause all tracks
      Object.keys(trackStates).forEach(track => {
        if (trackStates[track]) {
          audioRefs.current[track].pause();
        }
      });
    } else {
      // Play all active tracks
      Object.keys(trackStates).forEach(track => {
        if (trackStates[track]) {
          audioRefs.current[track].currentTime = currentTime;
          audioRefs.current[track].play();
        }
      });
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const handleSeek = (e) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / container.clientWidth) * duration;
    
    // Set time for all tracks
    Object.keys(audioRefs.current).forEach(track => {
      audioRefs.current[track].currentTime = newTime;
    });
    
    setCurrentTime(newTime);
  };
  
  const handleStop = () => {
    // Stop all tracks
    Object.keys(trackStates).forEach(track => {
      if (audioRefs.current[track]) {
        audioRefs.current[track].pause();
        audioRefs.current[track].currentTime = 0;
      }
    });
    
    setIsPlaying(false);
    setCurrentTime(0);
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Guess The Song</h1>
      
      {/* Progress bar */}
      <div 
        className="h-6 bg-gray-200 relative rounded cursor-pointer mb-2" 
        onClick={handleSeek}
      >
        <div 
          className="h-full bg-blue-500 absolute top-0 left-0 rounded"
          style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
        ></div>
      </div>
      
      {/* Time display */}
      <div className="mb-4">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
      
      {/* Play button */}
      <button 
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        onClick={togglePlayback}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      
      {/* Tracks */}
      <div>
        {Object.keys(trackStates).map(track => (
          <div key={track} className="mb-2 flex items-center">
            <input
              type="checkbox"
              id={track}
              checked={trackStates[track]}
              onChange={() => toggleTrack(track)}
              className="mr-2"
            />
            <label htmlFor={track}>{track}</label>
          </div>
        ))}
      </div>
    </div>
  );
}