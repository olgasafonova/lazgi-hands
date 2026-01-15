/**
 * Sound Engine Module
 *
 * Generates music responding to hand movements using Tone.js.
 * Uses scales and rhythms inspired by Central Asian music.
 *
 * Maqam-inspired scales:
 * - Segah (similar to Phrygian)
 * - Chargah (similar to major)
 * - Bayat (minor-ish)
 */

// Central Asian-inspired scale (Segah-like: E F G# A B C D E)
const SCALE = ['E3', 'F3', 'G#3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G#4', 'A4', 'B4'];

// Pentatonic for simpler mapping
const PENTATONIC = ['E3', 'G3', 'A3', 'B3', 'D4', 'E4', 'G4', 'A4', 'B4', 'D5'];

export class SoundEngine {
  constructor() {
    this.isStarted = false;
    this.synths = {};
    this.effects = {};
    this.lastNotes = {};
    this.drone = null;
    this.recordedPlayer = null;
    this.isPlayingRecorded = false;
    this.rhythmPart = null;
    this.doira = null;
    this.baseTempo = 100; // BPM
    this.fft = null;
    this.fftData = new Float32Array(64);

    // Music player
    this.musicPlayer = null;
    this.musicVolume = 1;
  }

  async start() {
    if (this.isStarted) return;

    await Tone.start();
    console.log('Audio started');

    // Create synths for each finger
    const fingerNames = ['thumb', 'index', 'middle', 'ring', 'pinky'];

    for (const name of fingerNames) {
      this.synths[name] = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.05,
          decay: 0.15,
          sustain: 0.4,
          release: 0.5
        },
        volume: -6
      });
    }

    // Effects chain
    this.effects.reverb = new Tone.Reverb({
      decay: 3,
      wet: 0.4
    }).toDestination();

    this.effects.delay = new Tone.FeedbackDelay({
      delayTime: '8n',
      feedback: 0.3,
      wet: 0.2
    }).connect(this.effects.reverb);

    this.effects.filter = new Tone.Filter({
      frequency: 2000,
      type: 'lowpass'
    }).connect(this.effects.delay);

    // Connect synths to effects
    for (const synth of Object.values(this.synths)) {
      synth.connect(this.effects.filter);
    }

    // Drone bass (optional, low hum)
    this.drone = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 2, decay: 0, sustain: 1, release: 2 }
    }).toDestination();
    this.drone.volume.value = -20;

    // Start drone on root note
    this.drone.triggerAttack('E2');

    // Setup Doira (frame drum) rhythm (but don't start yet)
    this.setupRhythm();
    this.rhythmPart.stop();
    Tone.Transport.stop();

    // Setup FFT analyzer for visualizer
    this.fft = new Tone.FFT(64);
    Tone.Destination.connect(this.fft);

    this.isStarted = true;
  }

  /**
   * Start the Doira rhythm pattern
   */
  startRhythm() {
    if (this.rhythmPart) {
      this.rhythmPart.start(0);
      Tone.Transport.start();
      console.log('Doira rhythm started');
    }
  }

  /**
   * Stop the Doira rhythm pattern
   */
  stopRhythm() {
    if (this.rhythmPart) {
      this.rhythmPart.stop();
      Tone.Transport.stop();
      console.log('Doira rhythm stopped');
    }
  }

  /**
   * Get current FFT frequency data for visualization
   * Returns array of values from 0-1
   */
  getFFTData() {
    if (!this.fft) return this.fftData;

    const values = this.fft.getValue();
    for (let i = 0; i < values.length; i++) {
      // Convert from dB (-100 to 0) to 0-1 range
      const db = values[i];
      this.fftData[i] = Math.max(0, Math.min(1, (db + 100) / 100));
    }
    return this.fftData;
  }

  setupRhythm() {
    // Doira sounds - low "dum" and high "tak"
    this.doira = {
      dum: new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }
      }).toDestination(),

      tak: new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 }
      }).toDestination(),

      rim: new Tone.MetalSynth({
        frequency: 400,
        envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
        harmonicity: 3.1,
        modulationIndex: 16,
        resonance: 4000,
        octaves: 1
      }).toDestination()
    };

    this.doira.dum.volume.value = -4;
    this.doira.tak.volume.value = -10;
    this.doira.rim.volume.value = -16;

    // Traditional Lazgi 6/8 pattern
    // DUM . tak tak DUM tak | DUM . tak tak DUM tak
    const pattern = [
      { time: '0:0:0', type: 'dum' },
      { time: '0:0:2', type: 'tak' },
      { time: '0:1:0', type: 'tak' },
      { time: '0:1:2', type: 'dum' },
      { time: '0:2:0', type: 'tak' },
      { time: '0:2:2', type: 'rim' },
      { time: '0:3:0', type: 'dum' },
      { time: '0:3:2', type: 'tak' },
      { time: '1:0:0', type: 'tak' },
      { time: '1:0:2', type: 'dum' },
      { time: '1:1:0', type: 'tak' },
      { time: '1:1:2', type: 'rim' },
    ];

    this.rhythmPart = new Tone.Part((time, event) => {
      if (event.type === 'dum') {
        this.doira.dum.triggerAttackRelease('C2', '16n', time);
      } else if (event.type === 'tak') {
        this.doira.tak.triggerAttackRelease('16n', time);
      } else if (event.type === 'rim') {
        this.doira.rim.triggerAttackRelease('C6', '32n', time);
      }
    }, pattern);

    this.rhythmPart.loop = true;
    this.rhythmPart.loopEnd = '2m';

    // Set tempo and start
    Tone.Transport.bpm.value = this.baseTempo;
    this.rhythmPart.start(0);
    Tone.Transport.start();
  }

  stop() {
    if (!this.isStarted) return;

    // Stop rhythm
    if (this.rhythmPart) {
      this.rhythmPart.stop();
      Tone.Transport.stop();
    }

    // Release all notes
    for (const synth of Object.values(this.synths)) {
      synth.triggerRelease();
    }

    if (this.drone) {
      this.drone.triggerRelease();
    }

    this.isStarted = false;
  }

  /**
   * Update sound based on hand movement data
   *
   * @param {number} velocity - Overall hand movement speed (0-1)
   * @param {number} spread - How spread apart fingers are (0-1)
   * @param {Array} landmarks - Raw landmark positions
   */
  updateFromHand(velocity, spread, landmarks) {
    if (!this.isStarted) return;

    // Map velocity to filter cutoff
    const filterFreq = 200 + velocity * 4000;
    this.effects.filter.frequency.rampTo(filterFreq, 0.1);

    // Map spread to reverb wet
    this.effects.reverb.wet.rampTo(spread * 0.6, 0.2);

    // Trigger notes based on fingertip positions
    const tips = [
      { name: 'thumb', idx: 4 },
      { name: 'index', idx: 8 },
      { name: 'middle', idx: 12 },
      { name: 'ring', idx: 16 },
      { name: 'pinky', idx: 20 }
    ];

    for (const { name, idx } of tips) {
      const tip = landmarks[idx];

      // Map y position to scale note (higher = higher pitch)
      const noteIndex = Math.floor((1 - tip.y) * PENTATONIC.length);
      const note = PENTATONIC[Math.max(0, Math.min(noteIndex, PENTATONIC.length - 1))];

      // Only trigger if note changed and there's enough movement
      if (note !== this.lastNotes[name] && velocity > 0.1) {
        this.synths[name].triggerAttackRelease(note, '8n');
        this.lastNotes[name] = note;
      }
    }

    // Special: wrist height affects drone volume
    const wristY = landmarks[0].y;
    const droneVol = -30 + (1 - wristY) * 15; // -30 to -15 dB
    this.drone.volume.rampTo(droneVol, 0.3);

    // Only adjust tempo for synthesized sounds (not recorded music)
    if (!this.isPlayingRecorded) {
      const targetTempo = 80 + velocity * 100;
      const heightTempo = 80 + (1 - wristY) * 80;
      const combinedTempo = (targetTempo + heightTempo) / 2;
      Tone.Transport.bpm.rampTo(combinedTempo, 0.3);
    }

  }

  /**
   * Left hand controls filter and delay effects
   * - Hand height: filter cutoff frequency
   * - Hand spread: delay wet amount
   * - Velocity: filter resonance
   */
  updateLeftHand(hand, velocity) {
    if (!this.isStarted) return;

    // Hand height controls filter cutoff (higher hand = brighter sound)
    const height = 1 - hand.palmCenter.y;
    const filterFreq = 200 + height * 4000;
    if (this.effects.filter) {
      this.effects.filter.frequency.rampTo(filterFreq, 0.1);
    }

    // Finger spread controls delay
    const spread = hand.fingerSpread || 0;
    if (this.effects.delay) {
      this.effects.delay.wet.rampTo(spread * 0.4, 0.2);
    }
  }

  /**
   * Right hand controls reverb and spatial effects
   * - Hand height: reverb amount
   * - Hand x position: stereo pan (future)
   * - Velocity: intensity boost
   */
  updateRightHand(hand, velocity) {
    if (!this.isStarted) return;

    // Hand height controls reverb
    const height = 1 - hand.palmCenter.y;
    if (this.effects.reverb) {
      this.effects.reverb.wet.rampTo(height * 0.6, 0.2);
    }

    // Velocity adds energy (could modulate playback rate in future)
    // For now, velocity affects filter Q or resonance
  }

  /**
   * Pose (arms/shoulders) controls overall intensity
   * - Arms spread: stereo width / spatial
   * - Both arms up: energy boost
   * - Arm height: volume dynamics
   */
  updateFromPose(pose) {
    if (!this.isStarted || !pose) return;

    // Arms spread controls overall reverb space
    if (this.effects.reverb) {
      const baseReverb = this.effects.reverb.wet.value;
      const spreadBoost = pose.armsSpread * 0.3;
      this.effects.reverb.wet.rampTo(Math.min(baseReverb + spreadBoost, 0.8), 0.3);
    }

    // Both arms up opens up the filter completely
    if (pose.bothArmsUp && this.effects.filter) {
      this.effects.filter.frequency.rampTo(8000, 0.2);
    }

    // Shoulder movement could affect something subtle
    // (left for future enhancement)
  }

  /**
   * Trigger a specific note (for template match rewards)
   */
  playReward() {
    if (!this.isStarted) return;

    const chord = ['E4', 'G#4', 'B4'];
    const synth = new Tone.PolySynth().toDestination();
    synth.volume.value = -10;
    synth.triggerAttackRelease(chord, '2n');
  }

  /**
   * Play a traditional Lazgi rhythm pattern
   */
  playRhythm() {
    if (!this.isStarted) return;

    const kick = new Tone.MembraneSynth().toDestination();
    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
    }).toDestination();

    kick.volume.value = -10;
    snare.volume.value = -15;

    // Doira-inspired pattern (Uzbek frame drum)
    // "DUM tak tak DUM tak" pattern
    const pattern = [
      { time: '0:0', drum: 'kick' },
      { time: '0:1', drum: 'snare' },
      { time: '0:2', drum: 'snare' },
      { time: '0:3', drum: 'kick' },
      { time: '1:0', drum: 'snare' },
      { time: '1:1', drum: 'kick' },
      { time: '1:2', drum: 'snare' },
      { time: '1:3', drum: 'snare' }
    ];

    const part = new Tone.Part((time, event) => {
      if (event.drum === 'kick') {
        kick.triggerAttackRelease('C2', '8n', time);
      } else {
        snare.triggerAttackRelease('8n', time);
      }
    }, pattern);

    part.loop = true;
    part.loopEnd = '2m';
    part.start(0);

    Tone.Transport.start();
  }

  /**
   * Load and play Lazgi music
   * Source: Gulsanam Mamazoitova - Lazgi
   */
  async playRecordedMusic() {
    await Tone.start();

    // Already playing, don't restart
    if (this.isPlayingRecorded) {
      return;
    }

    // Setup FFT if not exists (for visualization)
    if (!this.fft) {
      this.fft = new Tone.FFT(64);
    }

    // Create music player if not exists
    if (!this.musicPlayer) {
      this.musicPlayer = new Tone.Player({
        url: './assets/audio/gulsanam-lazgi.mp3',
        loop: true,
        autostart: false,
        volume: -6,
        onload: () => {
          console.log('Lazgi music loaded');
        }
      }).toDestination();

      this.musicPlayer.connect(this.fft);
    }

    await Tone.loaded();
    this.musicPlayer.start();
    this.isPlayingRecorded = true;
    console.log('Playing Gulsanam Mamazoitova - Lazgi');
  }

  stopRecordedMusic() {
    if (this.isPlayingRecorded) {
      if (this.musicPlayer) this.musicPlayer.stop();
      this.isPlayingRecorded = false;
      console.log('Stopped Lazgi music');
    }
  }

  toggleRecordedMusic() {
    if (this.isPlayingRecorded) {
      this.stopRecordedMusic();
    } else {
      this.playRecordedMusic();
    }
    return this.isPlayingRecorded;
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume) {
    this.musicVolume = volume;
    if (this.musicPlayer) {
      const db = volume === 0 ? -60 : -6 + (volume - 1) * 20;
      this.musicPlayer.volume.value = db;
    }
  }
}
