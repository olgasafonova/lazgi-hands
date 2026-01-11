/**
 * Hand Tracking Module
 *
 * Wraps MediaPipe Hands for real-time hand landmark detection.
 * Returns 21 landmarks per hand with x, y, z coordinates.
 *
 * Landmark indices:
 * 0: Wrist
 * 1-4: Thumb (CMC, MCP, IP, TIP)
 * 5-8: Index finger (MCP, PIP, DIP, TIP)
 * 9-12: Middle finger
 * 13-16: Ring finger
 * 17-20: Pinky finger
 */

export class HandTracker {
  constructor({ onResults, videoElement }) {
    this.onResults = onResults;
    this.videoElement = videoElement;
    this.hands = null;
    this.camera = null;
  }

  async start() {
    // Access MediaPipe Hands from window (loaded via CDN)
    const Hands = window.Hands;

    if (!Hands) {
      throw new Error('MediaPipe Hands not loaded.');
    }

    // Initialize MediaPipe Hands
    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults((results) => this.processResults(results));

    // Use native browser camera API
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' }
    });

    this.videoElement.srcObject = stream;
    await this.videoElement.play();

    // Start processing loop
    this.running = true;
    this.processFrame();

    console.log('Hand tracking started');
  }

  async processFrame() {
    if (!this.running) return;

    if (this.videoElement.readyState >= 2) {
      await this.hands.send({ image: this.videoElement });
    }

    requestAnimationFrame(() => this.processFrame());
  }

  processResults(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.onResults([]);
      return;
    }

    const hands = results.multiHandLandmarks.map((landmarks, index) => {
      const handedness = results.multiHandedness[index];

      return {
        landmarks: landmarks,
        handedness: handedness.label, // 'Left' or 'Right'
        confidence: handedness.score,

        // Convenience accessors
        wrist: landmarks[0],
        thumbTip: landmarks[4],
        indexTip: landmarks[8],
        middleTip: landmarks[12],
        ringTip: landmarks[16],
        pinkyTip: landmarks[20],

        // Computed metrics
        palmCenter: this.calculatePalmCenter(landmarks),
        fingerAngles: this.calculateFingerAngles(landmarks),
        wristAngle: this.calculateWristAngle(landmarks)
      };
    });

    this.onResults(hands);
  }

  calculatePalmCenter(landmarks) {
    // Average of wrist and MCP joints
    const indices = [0, 5, 9, 13, 17];
    let x = 0, y = 0, z = 0;

    for (const i of indices) {
      x += landmarks[i].x;
      y += landmarks[i].y;
      z += landmarks[i].z;
    }

    return {
      x: x / indices.length,
      y: y / indices.length,
      z: z / indices.length
    };
  }

  calculateFingerAngles(landmarks) {
    // Calculate bend angle for each finger
    const fingers = {
      thumb: [1, 2, 3, 4],
      index: [5, 6, 7, 8],
      middle: [9, 10, 11, 12],
      ring: [13, 14, 15, 16],
      pinky: [17, 18, 19, 20]
    };

    const angles = {};

    for (const [name, indices] of Object.entries(fingers)) {
      const mcp = landmarks[indices[0]];
      const pip = landmarks[indices[1]];
      const tip = landmarks[indices[3]];

      // Angle between MCP-PIP and PIP-TIP vectors
      const v1 = { x: pip.x - mcp.x, y: pip.y - mcp.y };
      const v2 = { x: tip.x - pip.x, y: tip.y - pip.y };

      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

      angles[name] = Math.acos(dot / (mag1 * mag2 + 0.0001));
    }

    return angles;
  }

  calculateWristAngle(landmarks) {
    // Angle of wrist relative to forearm (approximated)
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];

    return Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x);
  }

  stop() {
    this.running = false;
    if (this.videoElement.srcObject) {
      this.videoElement.srcObject.getTracks().forEach(track => track.stop());
    }
  }
}

/**
 * Landmark reference for Lazgi-specific positions:
 *
 * Trembling wrist: Rapid oscillation of landmarks[0] relative to arm
 * Finger flutter: High-frequency movement of tips (4, 8, 12, 16, 20)
 * "Broken" angles: Sharp bends at PIP joints (6, 10, 14, 18)
 * Sun salutation: Wrist high (low y), palm facing up (z orientation)
 */
