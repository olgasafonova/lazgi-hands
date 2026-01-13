/**
 * Lazgi Hands - Main Application
 *
 * Orchestrates hand tracking, visualization, and sound generation
 * for Khorezm Lazgi dance learning and performance.
 */

import { HolisticTracker } from './tracking.js';
import { Visualizer } from './visualizer.js';
import { SoundEngine } from './music.js';
import { templates, getClosestTemplate } from './templates.js';

// Application state
const state = {
  mode: 'learn', // 'learn' | 'perform'
  soundEnabled: false,
  isLoading: true,
  currentHands: null,
  currentPose: null,
  matchScore: 0,
  currentTemplate: 0
};

// Initialize components
let tracker, visualizer, soundEngine;

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

  // Setup holistic tracker (hands + pose combined)
  tracker = new HolisticTracker({
    onResults: handleTrackingResults,
    videoElement: document.getElementById('video-feed')
  });

  // Start tracker (this triggers camera permission)
  try {
    await tracker.start();
    document.getElementById('loading').classList.add('hidden');
    state.isLoading = false;
  } catch (err) {
    console.error('Failed to start tracker:', err);
    document.getElementById('loading').innerHTML = `
      <div style="color: #ffc107; text-align: center; padding: 20px;">
        <p>Camera access required</p>
        <p style="font-size: 12px; opacity: 0.7;">${err.message}</p>
      </div>
    `;
  }
}

/**
 * Handle combined tracking results (hands + pose)
 */
function handleTrackingResults(data) {
  state.currentHands = data.hands;
  state.currentPose = data.pose;

  // Update visualizer with hands
  if (data.hands && data.hands.length > 0) {
    visualizer.updateHands(data.hands);

    // In learn mode, check template matching
    if (state.mode === 'learn') {
      const template = templates[state.currentTemplate];
      state.matchScore = getClosestTemplate(data.hands[0], template);
      visualizer.setMatchScore(state.matchScore);
    }

    // When sound is on, hands affect music
    if (state.soundEnabled && soundEngine) {
      // Find left and right hands
      const leftHand = data.hands.find(h => h.handedness === 'Left');
      const rightHand = data.hands.find(h => h.handedness === 'Right');

      // Left hand controls filter/effects
      if (leftHand) {
        const leftVelocity = calculateHandVelocity(leftHand, 'left');
        soundEngine.updateLeftHand(leftHand, leftVelocity);
      }

      // Right hand controls tempo/rhythm
      if (rightHand) {
        const rightVelocity = calculateHandVelocity(rightHand, 'right');
        soundEngine.updateRightHand(rightHand, rightVelocity);
      }
    }
  } else {
    visualizer.updateHands([]);
  }

  // Update visualizer and sound with pose (arms/shoulders)
  if (data.pose) {
    visualizer.updatePose(data.pose);

    if (state.soundEnabled && soundEngine) {
      soundEngine.updateFromPose(data.pose);
    }
  }
}

// Store previous landmarks for velocity calculation
const prevLandmarks = { left: null, right: null };

function calculateHandVelocity(hand, side) {
  const prev = prevLandmarks[side];

  if (!prev) {
    prevLandmarks[side] = [...hand.landmarks];
    return 0;
  }

  let totalDist = 0;
  for (let i = 0; i < hand.landmarks.length; i++) {
    const curr = hand.landmarks[i];
    const p = prev[i];
    totalDist += Math.sqrt(
      Math.pow(curr.x - p.x, 2) +
      Math.pow(curr.y - p.y, 2)
    );
  }

  prevLandmarks[side] = [...hand.landmarks];
  return Math.min(totalDist / hand.landmarks.length * 100, 1);
}

function setupControls() {
  console.log('Setting up controls...');

  const btnLearn = document.getElementById('btn-learn');
  const btnPerform = document.getElementById('btn-perform');
  const btnSound = document.getElementById('btn-sound');
  const modeIndicator = document.getElementById('mode-indicator');

  if (!btnLearn || !btnPerform || !btnSound) {
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

  // Main sound control - plays Lazgi music
  btnSound.addEventListener('click', async () => {
    state.soundEnabled = !state.soundEnabled;
    btnSound.textContent = `Sound: ${state.soundEnabled ? 'On' : 'Off'}`;
    btnSound.classList.toggle('active', state.soundEnabled);

    if (state.soundEnabled) {
      await soundEngine.start();
      await soundEngine.playRecordedMusic();
    } else {
      soundEngine.stopRecordedMusic();
      soundEngine.stop();
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

// Wait for MediaPipe Holistic to load
function waitForMediaPipe(maxWait = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function check() {
      console.log('Checking for MediaPipe Holistic...', !!window.Holistic);

      if (window.Holistic) {
        console.log('MediaPipe Holistic loaded (hands + pose tracking)');
        resolve();
      } else if (Date.now() - start > maxWait) {
        reject(new Error('MediaPipe Holistic failed to load. Check if scripts are blocked.'));
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
