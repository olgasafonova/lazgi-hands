/**
 * Holistic Tracking Module
 *
 * Uses MediaPipe Holistic for combined hand + pose tracking.
 * Provides 543 landmarks: 33 pose + 21 per hand + 468 face (unused).
 *
 * Hand landmark indices (per hand):
 * 0: Wrist
 * 1-4: Thumb (CMC, MCP, IP, TIP)
 * 5-8: Index finger (MCP, PIP, DIP, TIP)
 * 9-12: Middle finger
 * 13-16: Ring finger
 * 17-20: Pinky finger
 *
 * Pose landmark indices (relevant):
 * 11: left_shoulder, 12: right_shoulder
 * 13: left_elbow, 14: right_elbow
 * 15: left_wrist, 16: right_wrist
 */

export class HolisticTracker {
  constructor({ onResults, videoElement }) {
    this.onResults = onResults;
    this.videoElement = videoElement;
    this.holistic = null;
    this.running = false;
  }

  async start() {
    const Holistic = window.Holistic;

    if (!Holistic) {
      throw new Error('MediaPipe Holistic not loaded.');
    }

    this.holistic = new Holistic({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/${file}`
    });

    this.holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      refineFaceLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.holistic.onResults((results) => this.processResults(results));

    // Use native browser camera API
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' }
    });

    this.videoElement.srcObject = stream;
    await this.videoElement.play();

    this.running = true;
    this.processFrame();

    console.log('Holistic tracking started (hands + pose)');
  }

  async processFrame() {
    if (!this.running) return;

    try {
      if (this.videoElement.readyState >= 2) {
        await this.holistic.send({ image: this.videoElement });
      }
    } catch (err) {
      console.warn('Tracking frame error:', err.message);
    }

    // Always continue the loop even if there's an error
    requestAnimationFrame(() => this.processFrame());
  }

  processResults(results) {
    try {
      const data = {
        hands: [],
        pose: null
      };

      // Process left hand
      if (results.leftHandLandmarks) {
        data.hands.push(this.processHand(results.leftHandLandmarks, 'Left'));
      }

      // Process right hand
      if (results.rightHandLandmarks) {
        data.hands.push(this.processHand(results.rightHandLandmarks, 'Right'));
      }

      // Process pose (arms and shoulders)
      if (results.poseLandmarks) {
        data.pose = this.processPose(results.poseLandmarks);
      }

      this.onResults(data);
    } catch (err) {
      console.warn('Error processing tracking results:', err.message);
      // Send empty data to keep visualizer responsive
      this.onResults({ hands: [], pose: null });
    }
  }

  processHand(landmarks, handedness) {
    return {
      landmarks: landmarks,
      handedness: handedness,
      confidence: 1.0,

      // Convenience accessors
      wrist: landmarks[0],
      thumbTip: landmarks[4],
      indexTip: landmarks[8],
      middleTip: landmarks[12],
      ringTip: landmarks[16],
      pinkyTip: landmarks[20],

      // Computed metrics
      palmCenter: this.calculatePalmCenter(landmarks),
      fingerSpread: this.calculateFingerSpread(landmarks),
      wristAngle: this.calculateWristAngle(landmarks)
    };
  }

  processPose(landmarks) {
    return {
      left: {
        shoulder: landmarks[11],
        elbow: landmarks[13],
        wrist: landmarks[15],
        armAngle: this.calculateArmAngle(landmarks[11], landmarks[13], landmarks[15]),
        armHeight: 1 - landmarks[15].y,
        shoulderHeight: 1 - landmarks[11].y
      },
      right: {
        shoulder: landmarks[12],
        elbow: landmarks[14],
        wrist: landmarks[16],
        armAngle: this.calculateArmAngle(landmarks[12], landmarks[14], landmarks[16]),
        armHeight: 1 - landmarks[16].y,
        shoulderHeight: 1 - landmarks[12].y
      },
      // Overall metrics
      bothArmsUp: (1 - landmarks[15].y) > 0.5 && (1 - landmarks[16].y) > 0.5,
      armsSpread: Math.abs(landmarks[15].x - landmarks[16].x),
      shoulderWidth: Math.abs(landmarks[11].x - landmarks[12].x),
      torsoTilt: landmarks[11].y - landmarks[12].y // positive = leaning right
    };
  }

  calculatePalmCenter(landmarks) {
    const indices = [0, 5, 9, 13, 17];
    let x = 0, y = 0, z = 0;

    for (const i of indices) {
      x += landmarks[i].x;
      y += landmarks[i].y;
      z += landmarks[i].z;
    }

    return { x: x / 5, y: y / 5, z: z / 5 };
  }

  calculateFingerSpread(landmarks) {
    // Distance between index and pinky tips
    const index = landmarks[8];
    const pinky = landmarks[20];
    const dx = index.x - pinky.x;
    const dy = index.y - pinky.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  calculateWristAngle(landmarks) {
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    return Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x);
  }

  calculateArmAngle(shoulder, elbow, wrist) {
    const v1 = { x: shoulder.x - elbow.x, y: shoulder.y - elbow.y };
    const v2 = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    return Math.acos(dot / (mag1 * mag2 + 0.0001));
  }

  stop() {
    this.running = false;
    if (this.videoElement.srcObject) {
      this.videoElement.srcObject.getTracks().forEach(track => track.stop());
    }
  }
}


/**
 * Legacy Hand Tracking Module (kept for compatibility)
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


/**
 * Pose Tracker Module
 *
 * Wraps MediaPipe Pose for arm tracking.
 * Returns 33 landmarks including shoulders, elbows, wrists.
 *
 * Arm landmark indices:
 * 11: left_shoulder, 12: right_shoulder
 * 13: left_elbow, 14: right_elbow
 * 15: left_wrist, 16: right_wrist
 */

export class PoseTracker {
  constructor({ onResults, videoElement }) {
    this.onResults = onResults;
    this.videoElement = videoElement;
    this.pose = null;
  }

  async start() {
    const Pose = window.Pose;

    if (!Pose) {
      console.warn('MediaPipe Pose not loaded, arm tracking disabled');
      return false;
    }

    this.pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.pose.onResults((results) => this.processResults(results));

    this.running = true;
    console.log('Pose tracking initialized');
    return true;
  }

  async sendFrame(videoElement) {
    if (!this.pose || !this.running) return;
    await this.pose.send({ image: videoElement });
  }

  processResults(results) {
    if (!results.poseLandmarks) {
      this.onResults(null);
      return;
    }

    const landmarks = results.poseLandmarks;

    // Extract arm data
    const arms = {
      left: {
        shoulder: landmarks[11],
        elbow: landmarks[13],
        wrist: landmarks[15],
        // Computed metrics
        armAngle: this.calculateArmAngle(landmarks[11], landmarks[13], landmarks[15]),
        armHeight: 1 - landmarks[15].y, // 0 = down, 1 = up
        armSpread: Math.abs(landmarks[15].x - 0.5) * 2 // 0 = center, 1 = edge
      },
      right: {
        shoulder: landmarks[12],
        elbow: landmarks[14],
        wrist: landmarks[16],
        armAngle: this.calculateArmAngle(landmarks[12], landmarks[14], landmarks[16]),
        armHeight: 1 - landmarks[16].y,
        armSpread: Math.abs(landmarks[16].x - 0.5) * 2
      },
      // Overall metrics
      bothArmsUp: (1 - landmarks[15].y) > 0.6 && (1 - landmarks[16].y) > 0.6,
      armsSpread: Math.abs(landmarks[15].x - landmarks[16].x),
      symmetry: 1 - Math.abs((1 - landmarks[15].y) - (1 - landmarks[16].y))
    };

    this.onResults(arms);
  }

  calculateArmAngle(shoulder, elbow, wrist) {
    // Angle at elbow
    const v1 = { x: shoulder.x - elbow.x, y: shoulder.y - elbow.y };
    const v2 = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    return Math.acos(dot / (mag1 * mag2 + 0.0001));
  }

  stop() {
    this.running = false;
  }
}
