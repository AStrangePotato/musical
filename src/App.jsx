import { useState, useEffect, useRef } from 'react';
import { audioLinks } from './constants';
import { Music, SkipForward, Play, Pause, RotateCcw } from 'lucide-react';

const stems = ["bass", "drums", "other", "vocals"];

export default function SongGuesser() {
  const [currentSong, setCurrentSong] = useState("");
  const [activeStems, setActiveStems] = useState(["bass"]);
  const [userGuess, setUserGuess] = useState("");
  const [feedback, setFeedback] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadErrors, setLoadErrors] = useState({});
  const [guessHistory, setGuessHistory] = useState([]);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  
  // Create refs for each audio element
  const audioRefs = {
    bass: useRef(null),
    drums: useRef(null),
    other: useRef(null),
    vocals: useRef(null)
  };

  // Generate proper URL for a stem
  const getStemUrl = (song, stem) => {
    return `${audioLinks[song]}/${stem}.wav`;
  };

  // Pick a random song when the game starts
  useEffect(() => {
    const songTitles = Object.keys(audioLinks);
    const randomSong = songTitles[Math.floor(Math.random() * songTitles.length)];
    setCurrentSong(randomSong);
    
    // Reset errors
    setLoadErrors({});
    
    // Set up audio sources
    stems.forEach(stem => {
      if (audioRefs[stem].current) {
        const url = getStemUrl(randomSong, stem);
        audioRefs[stem].current.src = url;
        
        // Handle errors
        audioRefs[stem].current.onerror = () => {
          setLoadErrors(prev => ({...prev, [stem]: true}));
          console.error(`Failed to load ${stem} for ${randomSong}`);
        };
        
        // Synchronize all audio elements to end together
        audioRefs[stem].current.onended = () => {
          setIsPlaying(false);
          // Reset all audio to start
          stems.forEach(s => {
            if (audioRefs[s].current) {
              audioRefs[s].current.currentTime = 0;
            }
          });
        };
      }
    });
  }, []);

  // Generate song suggestions based on user input
  useEffect(() => {
    if (userGuess.trim() === "") {
      setSuggestions([]);
      return;
    }
    
    const songTitles = Object.keys(audioLinks);
    const filtered = songTitles.filter(song => 
      song.toLowerCase().includes(userGuess.toLowerCase())
    ).slice(0, 5);
    
    setSuggestions(filtered);
  }, [userGuess]);

  const playStems = () => {
    if (isPlaying) {
      // Stop all active stems
      activeStems.forEach(stem => {
        if (audioRefs[stem].current && !loadErrors[stem]) {
          audioRefs[stem].current.pause();
          audioRefs[stem].current.currentTime = 0;
        }
      });
      setIsPlaying(false);
    } else {
      // Play all active stems simultaneously
      const playPromises = activeStems.filter(stem => !loadErrors[stem]).map(stem => {
        if (audioRefs[stem].current) {
          return audioRefs[stem].current.play().catch(err => {
            console.error(`Error playing ${stem}:`, err);
            setLoadErrors(prev => ({...prev, [stem]: true}));
          });
        }
        return Promise.resolve();
      });

      Promise.all(playPromises.filter(p => p !== undefined))
        .then(() => {
          if (activeStems.some(stem => !loadErrors[stem])) {
            setIsPlaying(true);
          } else {
            setFeedback("Couldn't play any audio stems. Please try a different song.");
          }
        })
        .catch(err => {
          setFeedback(`Error playing audio: ${err.message}`);
        });
    }
  };

  const revealNextStem = () => {
    const nextStemIndex = activeStems.length;
    if (nextStemIndex < stems.length) {
      const nextStem = stems[nextStemIndex];
      setActiveStems([...activeStems, nextStem]);
      
      // If playing, start the new stem too (if it's not errored)
      if (isPlaying && audioRefs[nextStem].current && !loadErrors[nextStem]) {
        // Find the first active stem that's playing to sync with
        const playingStem = activeStems.find(stem => !loadErrors[stem]);
        if (playingStem && audioRefs[playingStem].current) {
          audioRefs[nextStem].current.currentTime = audioRefs[playingStem].current.currentTime;
          audioRefs[nextStem].current.play().catch(err => {
            console.error(`Error playing ${nextStem}:`, err);
            setLoadErrors(prev => ({...prev, [nextStem]: true}));
          });
        }
      }
    }
  };

  const selectGuess = (selectedSong) => {
    // Save this guess to history
    const newGuess = {
      song: selectedSong,
      correct: selectedSong === currentSong,
      stemCount: activeStems.length
    };
    
    setGuessHistory([...guessHistory, newGuess]);
    
    if (selectedSong === currentSong) {
      setFeedback(`Correct! You guessed the song with ${activeStems.length} stem(s) revealed.`);
      setGameOver(true);
    } else {
      const newAttemptsLeft = attemptsLeft - 1;
      setAttemptsLeft(newAttemptsLeft);
      
      if (newAttemptsLeft <= 0) {
        setFeedback(`Game over! The song was "${currentSong}".`);
        setGameOver(true);
      } else {
        setFeedback(`Not "${selectedSong}". ${newAttemptsLeft} guesses remaining.`);
        
        // Auto-reveal next stem if we have more left to reveal
        if (activeStems.length < stems.length) {
          revealNextStem();
        }
      }
    }
    
    setUserGuess("");
    setSuggestions([]);
  };

  const resetGame = () => {
    // Stop all audio if playing
    stems.forEach(stem => {
      if (audioRefs[stem].current) {
        audioRefs[stem].current.pause();
        audioRefs[stem].current.currentTime = 0;
      }
    });
    
    const songTitles = Object.keys(audioLinks);
    const randomSong = songTitles[Math.floor(Math.random() * songTitles.length)];
    
    setCurrentSong(randomSong);
    setActiveStems(["bass"]);
    setUserGuess("");
    setFeedback("");
    setGameOver(false);
    setIsPlaying(false);
    setLoadErrors({});
    setGuessHistory([]);
    setAttemptsLeft(3);
    
    // Set up new audio sources
    stems.forEach(stem => {
      if (audioRefs[stem].current) {
        const url = getStemUrl(randomSong, stem);
        audioRefs[stem].current.src = url;
      }
    });
  };

  const getProgressColor = (index) => {
    if (index < activeStems.length) {
      return 'bg-emerald-500';
    }
    return 'bg-gray-700';
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 font-sans sm:p-6 md:p-8 lg:p-12 xl:p-16">
      <div className="max-w-lg mx-auto">
        <header className="border-b border-gray-700 pb-4 mb-6 flex items-center justify-center">
          <Music size={24} className="text-emerald-500 mr-2" />
          <h1 className="text-3xl font-bold text-center tracking-wide">Trackle</h1>
        </header>
        
        {/* Game Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm uppercase tracking-widest text-gray-400">Progress</h2>
            <div className="flex gap-1">
              {Array.from({length: attemptsLeft}, (_, i) => (
                <div key={i} className="w-1 h-4 bg-emerald-600 rounded"></div>
              ))}
              {Array.from({length: 6-attemptsLeft}, (_, i) => (
                <div key={i} className="w-1 h-4 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
          <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden">
            <div className="flex h-full">
              {stems.map((stem, index) => (
                <div 
                  key={stem} 
                  className={`h-full ${getProgressColor(index)} ${loadErrors[stem] ? 'bg-opacity-50' : ''} ${index > 0 ? 'border-l border-gray-900' : ''}`} 
                  style={{width: `${100/stems.length}%`}}
                ></div>
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            {stems.map(stem => (
              <span key={stem} className="capitalize">
                {stem}
              </span>
            ))}
          </div>
        </div>
        
        {/* Hidden audio elements */}
        {stems.map(stem => (
          <audio key={stem} ref={audioRefs[stem]} />
        ))}
        
        {/* Playback Controls */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 shadow-lg">
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={playStems}
              disabled={activeStems.every(stem => loadErrors[stem])}
              className={`p-4 rounded-full flex items-center justify-center
                ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} 
                ${activeStems.every(stem => loadErrors[stem]) ? 'opacity-50 cursor-not-allowed' : ''} 
                transition-all shadow-lg`}
            >
              {isPlaying ? (
                <Pause size={24} />
              ) : (
                <Play size={24} />
              )}
            </button>
            
            <button
              onClick={revealNextStem}
              disabled={gameOver || activeStems.length >= stems.length}
              className={`p-4 rounded-full flex items-center justify-center
                bg-yellow-600 hover:bg-yellow-700 transition-all shadow-lg
                ${gameOver || activeStems.length >= stems.length ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <SkipForward size={24} />
            </button>
          </div>
          
          <div className="flex gap-2 mb-2">
            {stems.map((stem, index) => (
              <div
                key={stem}
                className={`px-3 py-2 rounded-md text-center flex-1 text-sm font-medium transition-all
                  ${index < activeStems.length
                    ? loadErrors[stem]
                      ? 'bg-red-900 bg-opacity-50 text-red-300' 
                      : 'bg-emerald-900 bg-opacity-30 text-emerald-300 border border-emerald-700' 
                    : 'bg-gray-800 text-gray-500 border border-gray-700'}`}
              >
                {stem}
                {loadErrors[stem] && <span className="block text-xs">Error</span>}
              </div>
            ))}
          </div>
          
          <p className="text-xs text-center text-gray-400">
            Currently playing {activeStems.length} of {stems.length} stems
          </p>
        </div>
        
        {/* Guess Input */}
        {!gameOver && (
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={userGuess}
                onChange={(e) => setUserGuess(e.target.value)}
                placeholder="Search for songs..."
                className="w-full px-4 py-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-emerald-500 focus:outline-none"
              />
              
              {suggestions.length > 0 && (
                <div className="absolute mt-1 w-full bg-gray-800 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto border border-gray-700">
                  {suggestions.map((song, index) => (
                    <div
                      key={index}
                      onClick={() => selectGuess(song)}
                      className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0"
                    >
                      {song}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Feedback */}
        {feedback && (
          <div className={`p-4 mb-6 rounded-lg text-center font-medium ${
            gameOver && feedback.includes("Correct") ? 'bg-emerald-800 bg-opacity-50 border border-emerald-700' : 
            gameOver ? 'bg-red-900 bg-opacity-50 border border-red-700' : 
            'bg-blue-900 bg-opacity-30 border border-blue-700'
          }`}>
            {feedback}
          </div>
        )}
        
        {/* Game Over */}
        {gameOver && (
          <button
            onClick={resetGame}
            className="w-full mb-6 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw size={18} />
            Play Again
          </button>
        )}
        
        {/* Previous Guesses */}
        {guessHistory.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-3">Previous Guesses</h2>
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              {guessHistory.map((guess, index) => (
                <div
                  key={index}
                  className={`p-3 ${index < guessHistory.length - 1 ? 'border-b border-gray-700' : ''} flex justify-between items-center`}
                >
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-3 ${guess.correct ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <span>{guess.song}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex gap-1 mr-2">
                      {Array.from({length: guess.stemCount}, (_, i) => (
                        <div key={i} className="w-1.5 h-3 bg-emerald-600 rounded-sm"></div>
                      ))}
                      {Array.from({length: stems.length - guess.stemCount}, (_, i) => (
                        <div key={i} className="w-1.5 h-3 bg-gray-600 rounded-sm"></div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">{guess.stemCount}/{stems.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Instructions - Collapsible */}
        <details className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
          <summary className="font-medium cursor-pointer">How to Play</summary>
          <div className="mt-3 text-sm text-gray-300 space-y-2">
            <p>Guess the song by listening to the stems (audio parts).</p>
            <p>Start with just the bass, then reveal drums, other instruments, and vocals.</p>
            <p>The fewer stems you need to guess correctly, the better!</p>
            <p>You have 3 guesses before the game ends.</p>
          </div>
        </details>
      </div>
    </div>
  );
}