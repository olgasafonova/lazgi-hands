/**
 * Lazgi Hands - Main Application
 *
 * Orchestrates hand tracking, visualization, and sound generation
 * for Khorezm Lazgi dance learning and performance.
 */

import { HandTracker, PoseTracker } from './tracking.js';
import { Visualizer } from './visualizer.js';
import { SoundEngine } from './music.js';
import { templates, getClosestTemplate } from './templates.js';

// Application state
const state = {
  mode: 'learn', // 'learn' | 'perform'
  soundEnabled: false,
  musicPlaying: false,
  isLoading: true,
  currentHands: null,
  currentArms: null,
  matchScore: 0,
  currentTemplate: 0
};

// Initialize components
let tracker, poseTracker, visualizer, soundEngine;

async function init() {
  console.log('Initializing Lazgi Hands...');

  // Setup UI controls first so buttons always work
  setupControls();

  // Setup sound engine
  soundEngine = new SoundEngine();

  // Setup p5.js visualizer
  visualizer = new Visualizer({
    container: document.getElementById('canvas-container'),
    onReady: () => {
      console.log('Visualizer ready');
    }
  });

  // Connect sound engine to visualizer for equalizer
  visualizer.setSoundEngine(soundEngine);

  // Setup hand tracker
  tracker = new HandTracker({
    onResults: handleHandResults,
    videoElement: document.getElementById('video-feed')
  });

  // Setup pose tracker for arms
  poseTracker = new PoseTracker({
    onResults: handleArmResults,
    videoElement: document.getElementById('video-feed')
  });

  // Start trackers (this triggers camera permission)
  try {
    await tracker.start();
    document.getElementById('loading').classList.add('hidden');
    state.isLoading = false;

    // Start pose tracker separately (non-blocking, optional)
    try {
      const poseStarted = await poseTracker.start();
      if (poseStarted) {
        startPoseTracking();
        console.log('Arm tracking enabled');
      }
    } catch (poseErr) {
      console.warn('Pose tracker failed, arm tracking disabled:', poseErr);
    }

  } catch (err) {
    console.error('Failed to start hand tracker:', err);
    document.getElementById('loading').innerHTML = `
      <div style="color: #ffc107; text-align: center; padding: 20px;">
        <p>Camera access required</p>
        <p style="font-size: 12px; opacity: 0.7;">${err.message}</p>
      </div>
    `;
  }
}

function startPoseTracking() {
  const video = document.getElementById('video-feed');

  async function processPose() {
    if (video.readyState >= 2 && poseTracker) {
      await poseTracker.sendFrame(video);
    }
    // Run at lower rate than hands (every 3 frames)
    setTimeout(() => requestAnimationFrame(processPose), 100);
  }

  processPose();
}

function handleArmResults(arms) {
  state.currentArms = arms;

  if (!arms) return;

  // Use arm data for sound control when enabled
  if (state.soundEnabled && soundEngine) {
    soundEngine.updateFromArms(arms);
    updateArmIndicators(arms);
  }

  // Update visualizer with arm data
  if (visualizer) {
    visualizer.updateArms(arms);
  }
}

function updateMixIndicator(wristX) {
  const mixFill = document.getElementById('mix-fill');
  if (mixFill) {
    // wristX 0 = left (drums), 1 = right (melody)
    mixFill.style.width = `${wristX * 100}%`;
  }
}

function handleHandResults(results) {
  state.currentHands = results;

  if (results && results.length > 0) {
    // Update visualizer with hand landmarks
    visualizer.updateHands(results);

    // In learn mode, check template matching
    if (state.mode === 'learn') {
      const template = templates[state.currentTemplate];
      state.matchScore = getClosestTemplate(results[0], template);
      visualizer.setMatchScore(state.matchScore);
    }

    // Hand position controls stem mix when sound is on
    if (state.soundEnabled) {
      soundEngine.updateStemMix(results[0].landmarks);
      updateMixIndicator(results[0].landmarks[0].x);
    }

    // Synth layer responds to movement when enabled
    if (state.musicPlaying) {
      const velocity = calculateHandVelocity(results[0]);
      const spread = calculateFingerSpread(results[0]);
      soundEngine.updateFromHand(velocity, spread, results[0].landmarks);
    }
  } else {
    visualizer.updateHands([]);
  }
}

function calculateHandVelocity(hand) {
  // Calculate average movement speed of landmarks
  if (!hand.prevLandmarks) {
    hand.prevLandmarks = hand.landmarks;
    return 0;
  }

  let totalDist = 0;
  for (let i = 0; i < hand.landmarks.length; i++) {
    const curr = hand.landmarks[i];
    const prev = hand.prevLandmarks[i];
    totalDist += Math.sqrt(
      Math.pow(curr.x - prev.x, 2) +
      Math.pow(curr.y - prev.y, 2)
    );
  }

  hand.prevLandmarks = [...hand.landmarks];
  // More sensitive velocity detection
  return Math.min(totalDist / hand.landmarks.length * 100, 1);
}

function calculateFingerSpread(hand) {
  // Calculate how spread apart the fingers are
  const fingertips = [4, 8, 12, 16, 20]; // Thumb, index, middle, ring, pinky tips
  const palm = hand.landmarks[0]; // Wrist

  let avgDist = 0;
  for (const tip of fingertips) {
    const tipPos = hand.landmarks[tip];
    avgDist += Math.sqrt(
      Math.pow(tipPos.x - palm.x, 2) +
      Math.pow(tipPos.y - palm.y, 2)
    );
  }

  return Math.min(avgDist / fingertips.length * 3, 1);
}

function setupControls() {
  console.log('Setting up controls...');

  const btnLearn = document.getElementById('btn-learn');
  const btnPerform = document.getElementById('btn-perform');
  const btnSound = document.getElementById('btn-sound');
  const btnMusic = document.getElementById('btn-music');
  const modeIndicator = document.getElementById('mode-indicator');

  if (!btnLearn || !btnPerform || !btnSound || !btnMusic) {
    console.error('Could not find button elements');
    return;
  }

  console.log('Buttons found, adding listeners...');

  btnLearn.addEventListener('click', () => {
    console.log('Learn clicked');
    state.mode = 'learn';
    btnLearn.classList.add('active');
    btnPerform.classList.remove('active');
    modeIndicator.textContent = 'Learn Mode';
    visualizer.setMode('learn');
  });

  btnPerform.addEventListener('click', () => {
    console.log('Perform clicked');
    state.mode = 'perform';
    btnPerform.classList.add('active');
    btnLearn.classList.remove('active');
    modeIndicator.textContent = 'Perform Mode';
    visualizer.setMode('perform');
  });

  // Main sound control - plays Lazgi stems with gesture mixing
  const mixIndicator = document.getElementById('mix-indicator');
  btnSound.addEventListener('click', async () => {
    state.soundEnabled = !state.soundEnabled;
    btnSound.textContent = `Sound: ${state.soundEnabled ? 'On' : 'Off'}`;
    btnSound.classList.toggle('active', state.soundEnabled);

    if (state.soundEnabled) {
      await soundEngine.start();
      await soundEngine.playRecordedMusic();
      mixIndicator.classList.remove('hidden');
    } else {
      soundEngine.stopRecordedMusic();
      soundEngine.stop();
      mixIndicator.classList.add('hidden');
    }
  });

  // Synth layer (Doira rhythm + finger notes)
  btnMusic.addEventListener('click', async () => {
    state.musicPlaying = !state.musicPlaying;
    btnMusic.textContent = `Synth: ${state.musicPlaying ? 'On' : 'Off'}`;
    btnMusic.classList.toggle('active', state.musicPlaying);

    if (state.musicPlaying) {
      // Start sound engine if not already
      await soundEngine.start();
      // Start the Doira rhythm
      soundEngine.startRhythm();
    } else {
      // Stop the rhythm
      soundEngine.stopRhythm();
    }
  });

  // Info modal
  const btnInfo = document.getElementById('btn-info');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const infoModal = document.getElementById('info-modal');

  if (btnInfo && infoModal) {
    btnInfo.addEventListener('click', () => {
      infoModal.classList.remove('hidden');
    });

    btnCloseModal.addEventListener('click', () => {
      infoModal.classList.add('hidden');
    });

    infoModal.addEventListener('click', (e) => {
      if (e.target === infoModal) {
        infoModal.classList.add('hidden');
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Close modal on Escape
    if (e.key === 'Escape' && infoModal && !infoModal.classList.contains('hidden')) {
      infoModal.classList.add('hidden');
      return;
    }

    if (e.key === '1') btnLearn.click();
    if (e.key === '2') btnPerform.click();
    if (e.key === 's') btnSound.click();
    if (e.key === 'm') btnMusic.click();
    if (e.key === 'ArrowRight' && state.mode === 'learn') {
      state.currentTemplate = (state.currentTemplate + 1) % templates.length;
      visualizer.setTemplate(templates[state.currentTemplate]);
    }
    if (e.key === 'ArrowLeft' && state.mode === 'learn') {
      state.currentTemplate = (state.currentTemplate - 1 + templates.length) % templates.length;
      visualizer.setTemplate(templates[state.currentTemplate]);
    }
  });
}

// Wait for MediaPipe to load, then start
function waitForMediaPipe(maxWait = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function check() {
      console.log('Checking for MediaPipe...', 'Hands:', !!window.Hands, 'Pose:', !!window.Pose);

      if (window.Hands) {
        console.log('MediaPipe Hands loaded');
        if (window.Pose) {
          console.log('MediaPipe Pose loaded (arm tracking enabled)');
        } else {
          console.log('MediaPipe Pose not loaded (arm tracking disabled)');
        }
        resolve();
      } else if (Date.now() - start > maxWait) {
        reject(new Error('MediaPipe failed to load. Check Network tab for blocked scripts.'));
      } else {
        setTimeout(check, 500);
      }
    }

    check();
  });
}

// Start the application after MediaPipe is ready
console.log('Waiting for MediaPipe CDN scripts...');
waitForMediaPipe()
  .then(() => init())
  .catch((err) => {
    console.error(err);
    document.getElementById('loading').innerHTML = `
      <div style="color: #ffc107; text-align: center; padding: 20px;">
        <p>Failed to load MediaPipe</p>
        <p style="font-size: 12px; opacity: 0.7; margin-top: 8px;">Check if scripts are blocked by ad-blocker</p>
      </div>
    `;
  });
