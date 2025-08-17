import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BookOpen, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX,
  Maximize, 
  Minimize, 
  Settings, 
  Download, 
  FileText, 
  CheckCircle, 
  Circle, 
  Clock, 
  Award, 
  ArrowLeft, 
  ArrowRight,
  Menu,
  X,
  Search,
  Bookmark,
  MessageSquare,
  PlusCircle,
  Star,
  BarChart3,
  Target,
  Zap,
  User,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  FastForward,
  Rewind,
  Monitor,
  Smartphone,
  Headphones,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './CourseLearning.css';

const API_BASE_URL = 'http://localhost:5555';

const CourseLearning = ({ courseId, setCurrentPage }) => {
  // Core state
  const [course, setCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState({});
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState([]);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('lessons'); // lessons, notes, bookmarks, quiz
  const [showNotes, setShowNotes] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [notes, setNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [newBookmark, setNewBookmark] = useState('');

  // Quiz state
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizAttempt, setQuizAttempt] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);

  // Progress tracking
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [lastProgressUpdate, setLastProgressUpdate] = useState(0);

  // Refs
  const videoRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Utility functions
  const getAuthToken = () => localStorage.getItem('userToken');
  const createAuthHeaders = () => ({
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json'
  });

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateCompletionPercentage = (currentTime, duration) => {
    if (!duration || duration === 0) return 0;
    return Math.min(100, Math.round((currentTime / duration) * 100));
  };

  // API Functions
  const fetchCourseData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = createAuthHeaders();

      // Fetch course details
      const courseResponse = await fetch(`${API_BASE_URL}/api/courses/${courseId}`, {
        headers
      });
      const courseData = await courseResponse.json();

      if (!courseData.success) {
        throw new Error(courseData.message || 'Failed to fetch course');
      }

      setCourse(courseData.data.course);
      setEnrollment(courseData.data.enrollment);
      setLessons(courseData.data.course.lessons || []);

      // Fetch course progress
      const progressResponse = await fetch(`${API_BASE_URL}/api/progress/course/${courseId}`, {
        headers
      });
      const progressData = await progressResponse.json();

      if (progressData.success) {
        const progressMap = {};
        progressData.data.progress.forEach(p => {
          progressMap[p.lesson._id] = p;
        });
        setProgress(progressMap);
      }

      // Set current lesson (first incomplete or first lesson)
      const sortedLessons = courseData.data.course.lessons.sort((a, b) => a.order - b.order);
      let targetLesson = sortedLessons[0];
      
      if (progressData.success) {
        const incompleteLesson = sortedLessons.find(lesson => {
          const lessonProgress = progressData.data.progress.find(p => p.lesson._id === lesson._id);
          return !lessonProgress || lessonProgress.status !== 'completed';
        });
        if (incompleteLesson) {
          targetLesson = incompleteLesson;
        }
      }

      setCurrentLesson(targetLesson);
      setSessionStartTime(Date.now());

    } catch (err) {
      console.error('Fetch course data error:', err);
      setError(err.message || 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const updateProgress = useCallback(async (lessonId, timeSpent, lastPosition, completionPercentage) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/progress`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          courseId,
          lessonId,
          timeSpent: Math.round(timeSpent),
          lastPosition: Math.round(lastPosition),
          completionPercentage: Math.round(completionPercentage)
        })
      });

      const data = await response.json();
      if (data.success) {
        setProgress(prev => ({
          ...prev,
          [lessonId]: data.data.progress
        }));
      }
    } catch (err) {
      console.error('Progress update error:', err);
    }
  }, [courseId]);

  const addNote = useCallback(async (content, timestamp) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/progress/${currentLesson._id}/notes`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({ content, timestamp })
      });

      const data = await response.json();
      if (data.success) {
        setNotes(prev => [...prev, data.data.note]);
        setNewNote('');
      }
    } catch (err) {
      console.error('Add note error:', err);
    }
  }, [currentLesson]);

  const addBookmark = useCallback(async (name, timestamp) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/progress/${currentLesson._id}/bookmarks`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({ name, timestamp })
      });

      const data = await response.json();
      if (data.success) {
        setBookmarks(prev => [...prev, data.data.bookmark]);
        setNewBookmark('');
      }
    } catch (err) {
      console.error('Add bookmark error:', err);
    }
  }, [currentLesson]);

  // Video Player Functions
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;

    const current = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    
    setCurrentTime(current);
    setDuration(dur);

    // Update progress every 30 seconds
    const now = Date.now();
    if (now - lastProgressUpdate > 30000 && currentLesson) {
      const completionPercentage = calculateCompletionPercentage(current, dur);
      const timeSpent = Math.round((now - sessionStartTime) / 1000);
      
      updateProgress(currentLesson._id, timeSpent, current, completionPercentage);
      setLastProgressUpdate(now);
    }

    // Auto-complete lesson when 80% watched
    if (dur > 0 && (current / dur) >= 0.8 && currentLesson) {
      const lessonProgress = progress[currentLesson._id];
      if (!lessonProgress || lessonProgress.status !== 'completed') {
        const completionPercentage = calculateCompletionPercentage(current, dur);
        const timeSpent = Math.round((now - sessionStartTime) / 1000);
        updateProgress(currentLesson._id, timeSpent, current, Math.max(completionPercentage, 100));
      }
    }
  }, [currentLesson, progress, lastProgressUpdate, sessionStartTime, updateProgress]);

  const handleProgressClick = useCallback((e) => {
    if (!videoRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const changePlaybackRate = useCallback((rate) => {
    if (!videoRef.current) return;
    
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((newVolume) => {
    if (!videoRef.current) return;
    
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Lesson Navigation
  const goToLesson = useCallback((lesson) => {
    if (!lesson) return;

    // Save current progress before switching
    if (currentLesson && videoRef.current) {
      const current = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 0;
      const completionPercentage = calculateCompletionPercentage(current, dur);
      const timeSpent = Math.round((Date.now() - sessionStartTime) / 1000);
      
      updateProgress(currentLesson._id, timeSpent, current, completionPercentage);
    }

    setCurrentLesson(lesson);
    setCurrentTime(0);
    setIsPlaying(false);
    setSessionStartTime(Date.now());
    
    // Load lesson notes and bookmarks
    const lessonProgress = progress[lesson._id];
    if (lessonProgress) {
      setNotes(lessonProgress.notes || []);
      setBookmarks(lessonProgress.bookmarks || []);
    } else {
      setNotes([]);
      setBookmarks([]);
    }
  }, [currentLesson, progress, sessionStartTime, updateProgress]);

  const goToNextLesson = useCallback(() => {
    const currentIndex = lessons.findIndex(l => l._id === currentLesson?._id);
    if (currentIndex < lessons.length - 1) {
      goToLesson(lessons[currentIndex + 1]);
    }
  }, [lessons, currentLesson, goToLesson]);

  const goToPreviousLesson = useCallback(() => {
    const currentIndex = lessons.findIndex(l => l._id === currentLesson?._id);
    if (currentIndex > 0) {
      goToLesson(lessons[currentIndex - 1]);
    }
  }, [lessons, currentLesson, goToLesson]);

  // Effects
  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleTimeUpdate = () => handleTimeUpdate();
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleBufferUpdate = () => {
      const bufferRanges = [];
      for (let i = 0; i < video.buffered.length; i++) {
        bufferRanges.push({
          start: video.buffered.start(i),
          end: video.buffered.end(i)
        });
      }
      setBuffered(bufferRanges);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('progress', handleBufferUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('progress', handleBufferUpdate);
    };
  }, [handleTimeUpdate]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    }
    return () => clearTimeout(controlsTimeoutRef.current);
  }, [showControls, isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, currentTime - 10);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, currentTime + 10);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePlay, currentTime, duration, volume, handleVolumeChange, toggleFullscreen, toggleMute]);

  // Render Functions
  const renderLessonList = () => (
    <div className="lesson-list">
      <div className="lesson-list-header">
        <h3>Course Content</h3>
        <span className="lesson-count">
          {lessons.filter(l => progress[l._id]?.status === 'completed').length} / {lessons.length} completed
        </span>
      </div>
      <div className="lessons">
        {lessons.map((lesson, index) => {
          const lessonProgress = progress[lesson._id];
          const isCompleted = lessonProgress?.status === 'completed';
          const isActive = currentLesson?._id === lesson._id;
          const completionPercentage = lessonProgress?.completionPercentage || 0;

          return (
            <div
              key={lesson._id}
              className={`lesson-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => goToLesson(lesson)}
            >
              <div className="lesson-icon">
                {isCompleted ? (
                  <CheckCircle className="completed-icon" />
                ) : isActive ? (
                  <PlayCircle className="active-icon" />
                ) : (
                  <Circle className="pending-icon" />
                )}
              </div>
              <div className="lesson-content">
                <div className="lesson-title">{lesson.title}</div>
                <div className="lesson-meta">
                  <span className="lesson-type">{lesson.type}</span>
                  {lesson.content?.videoDuration && (
                    <>
                      <span className="separator">•</span>
                      <span className="lesson-duration">
                        {formatTime(lesson.content.videoDuration)}
                      </span>
                    </>
                  )}
                  {lesson.isPreview && (
                    <>
                      <span className="separator">•</span>
                      <span className="preview-badge">Preview</span>
                    </>
                  )}
                </div>
                {!isCompleted && completionPercentage > 0 && (
                  <div className="lesson-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{completionPercentage}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderNotes = () => (
    <div className="notes-section">
      <div className="notes-header">
        <h3>Notes</h3>
        <button
          className="add-note-btn"
          onClick={() => setShowNotes(!showNotes)}
        >
          <PlusCircle className="icon" />
        </button>
      </div>
      
      {showNotes && (
        <div className="add-note-form">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note at current timestamp..."
            rows={3}
          />
          <div className="form-actions">
            <button
              onClick={() => addNote(newNote, currentTime)}
              disabled={!newNote.trim()}
              className="save-btn"
            >
              Save Note
            </button>
            <button
              onClick={() => {
                setShowNotes(false);
                setNewNote('');
              }}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="notes-list">
        {notes.map((note, index) => (
          <div key={index} className="note-item">
            <div className="note-header">
              <span className="note-timestamp" onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = note.timestamp;
                }
              }}>
                {formatTime(note.timestamp)}
              </span>
              <span className="note-date">
                {new Date(note.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="note-content">{note.content}</div>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="empty-notes">
            <MessageSquare className="empty-icon" />
            <p>No notes yet. Add your first note!</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderBookmarks = () => (
    <div className="bookmarks-section">
      <div className="bookmarks-header">
        <h3>Bookmarks</h3>
        <button
          className="add-bookmark-btn"
          onClick={() => setShowBookmarks(!showBookmarks)}
        >
          <Bookmark className="icon" />
        </button>
      </div>

      {showBookmarks && (
        <div className="add-bookmark-form">
          <input
            type="text"
            value={newBookmark}
            onChange={(e) => setNewBookmark(e.target.value)}
            placeholder="Bookmark name..."
          />
          <div className="form-actions">
            <button
              onClick={() => addBookmark(newBookmark, currentTime)}
              disabled={!newBookmark.trim()}
              className="save-btn"
            >
              Add Bookmark
            </button>
            <button
              onClick={() => {
                setShowBookmarks(false);
                setNewBookmark('');
              }}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bookmarks-list">
        {bookmarks.map((bookmark, index) => (
          <div key={index} className="bookmark-item">
            <div className="bookmark-content">
              <div className="bookmark-name">{bookmark.name}</div>
              <div className="bookmark-timestamp" onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = bookmark.timestamp;
                }
              }}>
                {formatTime(bookmark.timestamp)}
              </div>
            </div>
          </div>
        ))}
        {bookmarks.length === 0 && (
          <div className="empty-bookmarks">
            <Bookmark className="empty-icon" />
            <p>No bookmarks yet. Add your first bookmark!</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderVideoPlayer = () => {
    if (!currentLesson || currentLesson.type !== 'video') {
      return (
        <div className="no-video">
          <BookOpen className="no-video-icon" />
          <h3>No Video Content</h3>
          <p>This lesson doesn't contain video content.</p>
        </div>
      );
    }

    return (
      <div 
        className={`video-container ${isFullscreen ? 'fullscreen' : ''}`}
        onMouseMove={() => setShowControls(true)}
        onMouseLeave={() => {
          if (isPlaying) {
            setShowControls(false);
          }
        }}
      >
        <video
          ref={videoRef}
          src={currentLesson.content?.videoUrl}
          poster={currentLesson.content?.thumbnail}
          className="video-player"
          onClick={togglePlay}
        />

        {/* Video Controls */}
        <div className={`video-controls ${showControls ? 'visible' : ''}`}>
          {/* Progress Bar */}
          <div className="progress-container" onClick={handleProgressClick}>
            <div className="progress-track">
              {/* Buffered segments */}
              {buffered.map((segment, index) => (
                <div
                  key={index}
                  className="buffered-segment"
                  style={{
                    left: `${(segment.start / duration) * 100}%`,
                    width: `${((segment.end - segment.start) / duration) * 100}%`
                  }}
                />
              ))}
              {/* Progress bar */}
              <div
                className="progress-bar"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="controls-row">
            <div className="controls-left">
              <button onClick={togglePlay} className="control-btn play-btn">
                {isPlaying ? <Pause /> : <Play />}
              </button>
              
              <button 
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = Math.max(0, currentTime - 10);
                  }
                }}
                className="control-btn"
              >
                <Rewind />
              </button>

              <button 
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = Math.min(duration, currentTime + 10);
                  }
                }}
                className="control-btn"
              >
                <FastForward />
              </button>

              <div className="volume-control">
                <button onClick={toggleMute} className="control-btn">
                  {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="volume-slider"
                />
              </div>

              <div className="time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="controls-right">
              <div className="playback-rate">
                <select
                  value={playbackRate}
                  onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                  className="rate-select"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>

              <button onClick={toggleFullscreen} className="control-btn">
                {isFullscreen ? <Minimize /> : <Maximize />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProgressHeader = () => {
    const completedLessons = lessons.filter(l => progress[l._id]?.status === 'completed').length;
    const totalLessons = lessons.length;
    const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return (
      <div className="progress-header">
        <div className="course-info">
          <h1>{course?.title}</h1>
          <div className="course-meta">
            <span className="instructor">
              <User className="icon" />
              {course?.instructor?.firstName} {course?.instructor?.lastName}
            </span>
            <span className="progress-text">
              <Target className="icon" />
              {completedLessons} of {totalLessons} lessons completed
            </span>
          </div>
        </div>
        <div className="overall-progress">
          <div className="progress-circle">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path
                className="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="circle"
                strokeDasharray={`${overallProgress}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="percentage">{overallProgress}%</div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="course-learning loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading course content...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="course-learning error">
        <div className="error-message">
          <h2>Unable to Load Course</h2>
          <p>{error}</p>
          <button onClick={() => setCurrentPage('my-courses')} className="back-btn">
            <ArrowLeft className="icon" />
            Back to My Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="course-learning">
      {/* Header */}
      <div className="learning-header">
        <button 
          onClick={() => setCurrentPage('my-courses')} 
          className="back-button"
        >
          <ArrowLeft className="icon" />
          Back to Courses
        </button>
        
        <div className="header-center">
          <h2>{currentLesson?.title || 'Select a lesson'}</h2>
          <div className="lesson-navigation">
            <button 
              onClick={goToPreviousLesson}
              disabled={!currentLesson || lessons.findIndex(l => l._id === currentLesson._id) === 0}
              className="nav-btn"
            >
              <ChevronLeft className="icon" />
              Previous
            </button>
            <button 
              onClick={goToNextLesson}
              disabled={!currentLesson || lessons.findIndex(l => l._id === currentLesson._id) === lessons.length - 1}
              className="nav-btn"
            >
              Next
              <ChevronRight className="icon" />
            </button>
          </div>
        </div>

        <div className="header-actions">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sidebar-toggle"
          >
            <Menu className="icon" />
          </button>
        </div>
      </div>

      {/* Progress Header */}
      {renderProgressHeader()}

      {/* Main Content */}
      <div className="learning-content">
        {/* Video Player / Content Area */}
        <div className={`content-area ${sidebarOpen ? 'with-sidebar' : 'full-width'}`}>
          {renderVideoPlayer()}
          
          {/* Lesson Description */}
          {currentLesson && (
            <div className="lesson-details">
              <div className="lesson-description">
                <h3>About This Lesson</h3>
                <p>{currentLesson.description}</p>
              </div>
              
              {/* Lesson Resources */}
              {currentLesson.content?.resources && currentLesson.content.resources.length > 0 && (
                <div className="lesson-resources">
                  <h3>Resources</h3>
                  <div className="resources-list">
                    {currentLesson.content.resources.map((resource, index) => (
                      <a
                        key={index}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-item"
                      >
                        <FileText className="icon" />
                        <span>{resource.title}</span>
                        <Download className="download-icon" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Lesson Actions */}
              <div className="lesson-actions">
                <button
                  onClick={() => {
                    const lessonProgress = progress[currentLesson._id];
                    if (lessonProgress?.status !== 'completed') {
                      const completionPercentage = 100;
                      const timeSpent = Math.round((Date.now() - sessionStartTime) / 1000);
                      updateProgress(currentLesson._id, timeSpent, currentTime, completionPercentage);
                    }
                  }}
                  className={`complete-btn ${progress[currentLesson._id]?.status === 'completed' ? 'completed' : ''}`}
                  disabled={progress[currentLesson._id]?.status === 'completed'}
                >
                  <CheckCircle className="icon" />
                  {progress[currentLesson._id]?.status === 'completed' ? 'Completed' : 'Mark as Complete'}
                </button>
                
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="action-btn"
                >
                  <MessageSquare className="icon" />
                  Quick Note
                </button>
                
                <button
                  onClick={() => setShowBookmarks(!showBookmarks)}
                  className="action-btn"
                >
                  <Bookmark className="icon" />
                  Bookmark
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={`learning-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <div className="tab-nav">
              <button
                onClick={() => setActiveTab('lessons')}
                className={`tab-btn ${activeTab === 'lessons' ? 'active' : ''}`}
              >
                <BookOpen className="icon" />
                Lessons
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              >
                <MessageSquare className="icon" />
                Notes
              </button>
              <button
                onClick={() => setActiveTab('bookmarks')}
                className={`tab-btn ${activeTab === 'bookmarks' ? 'active' : ''}`}
              >
                <Bookmark className="icon" />
                Bookmarks
              </button>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="close-sidebar"
            >
              <X className="icon" />
            </button>
          </div>

          <div className="sidebar-content">
            {activeTab === 'lessons' && renderLessonList()}
            {activeTab === 'notes' && renderNotes()}
            {activeTab === 'bookmarks' && renderBookmarks()}
          </div>
        </div>
      </div>

      {/* Floating Progress Bar (when sidebar is closed) */}
      {!sidebarOpen && (
        <div className="floating-progress">
          <div className="progress-info">
            <span className="current-lesson">{currentLesson?.title}</span>
            <span className="lesson-count">
              {lessons.findIndex(l => l._id === currentLesson?._id) + 1} of {lessons.length}
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${(lessons.filter(l => progress[l._id]?.status === 'completed').length / lessons.length) * 100}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseLearning;