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
          attack: 0.1,
          decay: 0.2,
          sustain: 0.3,
          release: 0.8
        }
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

    this.isStarted = true;
  }

  stop() {
    if (!this.isStarted) return;

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

  stopRhythm() {
    Tone.Transport.stop();
  }

  /**
   * Load and play the recorded Lazgi music from Khorezm
   * Source: archive.org - Bobomurod Hamdamov 2007 Urgench Lazgi
   */
  async playRecordedMusic() {
    if (!this.isStarted) {
      await Tone.start();
    }

    if (this.isPlayingRecorded) {
      this.stopRecordedMusic();
      return;
    }

    // Create player if not exists
    if (!this.recordedPlayer) {
      this.recordedPlayer = new Tone.Player({
        url: '/assets/audio/lazgi-khorezm.mp3',
        loop: true,
        autostart: false,
        volume: -6,
        onload: () => {
          console.log('Lazgi music loaded');
        }
      }).toDestination();
    }

    // Wait for load and play
    await Tone.loaded();
    this.recordedPlayer.start();
    this.isPlayingRecorded = true;
    console.log('Playing recorded Lazgi music');
  }

  stopRecordedMusic() {
    if (this.recordedPlayer && this.isPlayingRecorded) {
      this.recordedPlayer.stop();
      this.isPlayingRecorded = false;
      console.log('Stopped recorded Lazgi music');
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
   * Set volume for recorded music (0-1)
   */
  setRecordedVolume(volume) {
    if (this.recordedPlayer) {
      // Convert 0-1 to decibels (-60 to 0)
      const db = volume === 0 ? -60 : (volume - 1) * 30;
      this.recordedPlayer.volume.value = db;
    }
  }
}
