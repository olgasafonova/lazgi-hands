/**
 * Visualizer Module
 *
 * p5.js-based rendering of hand tracking with Ikat-inspired particle effects.
 * Two modes: Learn (template overlay) and Perform (free expression).
 *
 * v18 Ikat features:
 * - Multi-layer medallions (2-5 layers)
 * - Random blur on some layers
 * - Edge wobble (hand-drawn resist lines)
 */

// Ikat color palette - full range from Uzbek textiles
const IKAT_COLORS = [
  [0, 131, 143],    // turquoise
  [183, 28, 28],    // crimson
  [255, 193, 7],    // gold
  [106, 27, 154],   // purple
  [26, 35, 126],    // indigo
  [233, 30, 99],    // magenta
  [46, 125, 50],    // green
  [27, 94, 32],     // dark green
  [0, 150, 136],    // teal green
  [33, 150, 243],   // blue
  [13, 71, 161],    // dark blue
  [3, 169, 244],    // light blue
  [20, 20, 20],     // black
  [250, 250, 250],  // white
];

const BG_COLOR = [10, 10, 10]; // Dark background for hand tracking
const CREAM = [245, 240, 230]; // For center diamonds

// Named colors for hand tracking
const COLORS = {
  turquoise: [0, 131, 143],
  crimson: [183, 28, 28],
  gold: [255, 193, 7],
  green: [46, 125, 50]
};

export class Visualizer {
  constructor({ container, onReady }) {
    this.container = container;
    this.onReady = onReady;
    this.hands = [];
    this.medallions = [];
    this.mode = 'learn';
    this.matchScore = 0;
    this.template = null;
    this.soundEngine = null;
    this.eqSmoothed = new Array(50).fill(0.15);

    this.initP5();
  }

  setSoundEngine(engine) {
    this.soundEngine = engine;
  }

  initP5() {
    const self = this;

    new p5((p) => {
      self.p = p;

      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent(self.container);
        p.colorMode(p.RGB);
        p.noStroke();

        if (self.onReady) self.onReady();
      };

      p.draw = () => {
        p.background(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2], 20);

        // Draw equalizer at bottom
        self.drawEqualizer();

        self.updateMedallions();
        self.drawMedallions();

        if (self.mode === 'learn' && self.template) {
          self.drawTemplate();
          self.drawMatchIndicator();
        }

        self.drawHands();
        self.drawConnections();
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
      };
    });
  }

  updateHands(hands) {
    this.hands = hands;

    // Spawn Ikat medallions from fingertips
    for (const hand of hands) {
      const tips = [
        hand.landmarks[4],  // Thumb
        hand.landmarks[8],  // Index
        hand.landmarks[12], // Middle
        hand.landmarks[16], // Ring
        hand.landmarks[20]  // Pinky
      ];

      for (let i = 0; i < tips.length; i++) {
        const tip = tips[i];

        // Spawn rate based on mode
        const spawnChance = this.mode === 'perform' ? 0.25 : 0.12;

        if (this.p.random() < spawnChance) {
          this.spawnMedallion(
            tip.x * this.p.width,
            tip.y * this.p.height
          );
        }
      }
    }
  }

  pickUniqueColors(count) {
    const colors = [];
    const available = [...IKAT_COLORS];

    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = Math.floor(this.p.random(available.length));
      colors.push(available.splice(idx, 1)[0]);
    }

    return colors;
  }

  spawnMedallion(x, y) {
    // Multi-layer medallions (2-5 layers)
    const numLayers = Math.floor(this.p.random(2, 6));
    const colors = this.pickUniqueColors(numLayers);

    // Base dimensions
    const ratio = this.p.random(2, 3.5);
    const baseWidth = this.p.random(40, 80);
    const baseHeight = baseWidth * ratio;

    // Unique seed for wobble pattern
    const wobbleSeed = this.p.random(1000);

    const layers = [];
    for (let i = 0; i < numLayers; i++) {
      const scale = i === 0 ? 1 : this.p.random(0.5, 0.7);
      const prevLayer = i === 0 ? { width: baseWidth, height: baseHeight } : layers[i - 1];

      // Random blur (40% chance)
      const hasBlur = this.p.random() < 0.4;
      const blurAmount = hasBlur ? this.p.random(4, 10) : 0;

      // Wobble intensity varies per layer
      const wobbleAmount = this.p.random(2, 6);

      layers.push({
        width: prevLayer.width * scale,
        height: prevLayer.height * scale,
        color: colors[i],
        offsetX: this.p.random(-2, 2),
        offsetY: this.p.random(-2, 2),
        blur: blurAmount,
        hasBlur: hasBlur,
        wobble: wobbleAmount,
        wobbleOffset: this.p.random(100)
      });
    }

    // 8% chance of center diamond
    const hasCenter = this.p.random() < 0.08;

    this.medallions.push({
      x: x + this.p.random(-10, 10),
      y: y + this.p.random(-10, 10),
      vx: this.p.random(-1, 1),
      vy: this.p.random(-0.5, 1),
      layers: layers,
      hasCenter: hasCenter,
      centerColor: hasCenter ? (this.p.random() < 0.5 ? CREAM : [255, 215, 0]) : null,
      centerBlur: hasCenter && this.p.random() < 0.3,
      wobbleSeed: wobbleSeed,
      life: 1,
      decay: this.p.random(0.008, 0.02)
    });

    // Limit medallions
    if (this.medallions.length > 80) {
      this.medallions.shift();
    }
  }

  updateMedallions() {
    for (let i = this.medallions.length - 1; i >= 0; i--) {
      const m = this.medallions[i];

      m.x += m.vx;
      m.y += m.vy;
      m.vy += 0.02; // Slight gravity
      m.life -= m.decay;

      if (m.life <= 0) {
        this.medallions.splice(i, 1);
      }
    }
  }

  drawMedallions() {
    for (const m of this.medallions) {
      this.drawIkatMedallion(m);
    }
  }

  drawIkatMedallion(m) {
    const alpha = m.life * 255;

    this.p.push();
    this.p.translate(m.x, m.y);

    // Draw layers from outside in
    for (const layer of m.layers) {
      this.p.push();
      this.p.translate(layer.offsetX, layer.offsetY);

      if (layer.hasBlur) {
        this.drawBlurredWobblyMedallion(0, 0, layer.width, layer.height, layer.color, alpha, layer.blur, layer.wobble, m.wobbleSeed + layer.wobbleOffset);
      } else {
        this.drawWobblyMedallion(0, 0, layer.width, layer.height, layer.color, alpha, layer.wobble, m.wobbleSeed + layer.wobbleOffset);
      }
      this.p.pop();
    }

    // Center diamond
    if (m.hasCenter && m.layers.length > 0) {
      const innermost = m.layers[m.layers.length - 1];
      const cw = innermost.width * 0.4;
      const ch = innermost.height * 0.25;

      if (m.centerBlur) {
        for (let b = 3; b >= 0; b--) {
          const expand = b * 2;
          const a = alpha * (0.15 - b * 0.03);
          this.p.fill(m.centerColor[0], m.centerColor[1], m.centerColor[2], a);
          this.drawWobblyDiamond(0, 0, cw + expand, ch + expand, 1.5, m.wobbleSeed + 50);
        }
      }

      this.p.fill(m.centerColor[0], m.centerColor[1], m.centerColor[2], alpha * 0.9);
      this.drawWobblyDiamond(0, 0, cw, ch, 1.5, m.wobbleSeed + 50);
    }

    this.p.pop();
  }

  drawWobblyDiamond(cx, cy, w, h, wobbleAmt, seed) {
    const steps = 12;
    this.p.beginShape();

    // Top to right
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = cx + t * (w / 2);
      const y = cy - (h / 2) * (1 - t);
      const wobble = this.p.noise(seed + i * 0.3) * wobbleAmt - wobbleAmt / 2;
      this.p.vertex(x + wobble, y + wobble * 0.5);
    }

    // Right to bottom
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = cx + (w / 2) * (1 - t);
      const y = cy + (h / 2) * t;
      const wobble = this.p.noise(seed + 20 + i * 0.3) * wobbleAmt - wobbleAmt / 2;
      this.p.vertex(x + wobble, y + wobble * 0.5);
    }

    // Bottom to left
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = cx - t * (w / 2);
      const y = cy + (h / 2) * (1 - t);
      const wobble = this.p.noise(seed + 40 + i * 0.3) * wobbleAmt - wobbleAmt / 2;
      this.p.vertex(x + wobble, y + wobble * 0.5);
    }

    // Left to top
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = cx - (w / 2) * (1 - t);
      const y = cy - (h / 2) * t;
      const wobble = this.p.noise(seed + 60 + i * 0.3) * wobbleAmt - wobbleAmt / 2;
      this.p.vertex(x + wobble, y + wobble * 0.5);
    }

    this.p.endShape(this.p.CLOSE);
  }

  drawBlurredWobblyMedallion(cx, cy, w, h, baseColor, alpha, blurAmount, wobbleAmt, seed) {
    const blurPasses = 4;
    for (let b = blurPasses; b >= 0; b--) {
      const expand = b * blurAmount * 0.5;
      const blurAlpha = alpha * (0.12 - b * 0.025);
      this.drawWobblyMedallion(cx, cy, w + expand, h + expand * 1.5, baseColor, blurAlpha, wobbleAmt, seed);
    }

    this.drawWobblyMedallion(cx, cy, w, h, baseColor, alpha, wobbleAmt, seed);
  }

  drawWobblyMedallion(cx, cy, w, h, baseColor, alpha, wobbleAmt, seed) {
    const stripeW = 3;
    const numStripes = Math.ceil(w / stripeW) + 2;

    for (let i = -numStripes / 2; i <= numStripes / 2; i++) {
      const stripeX = i * stripeW;
      if (Math.abs(stripeX) > w / 2 + stripeW) continue;

      const stripeBrightness = (i % 2 === 0) ? 0 : 15;
      const abrash = Math.sin(i * 1.7 + w * 0.1) * 12;

      this.p.fill(
        Math.min(255, Math.max(0, baseColor[0] + stripeBrightness + abrash)),
        Math.min(255, Math.max(0, baseColor[1] + stripeBrightness + abrash)),
        Math.min(255, Math.max(0, baseColor[2] + stripeBrightness + abrash)),
        alpha
      );

      const t = Math.abs(stripeX) / (w / 2 + 1);
      const stripeH = h * Math.pow(1 - t, 0.6);

      if (stripeH > 2) {
        // Wobble each vertex
        const wobbleTop = this.p.noise(seed + i * 0.5) * wobbleAmt - wobbleAmt / 2;
        const wobbleRight = this.p.noise(seed + i * 0.5 + 10) * wobbleAmt - wobbleAmt / 2;
        const wobbleBottom = this.p.noise(seed + i * 0.5 + 20) * wobbleAmt - wobbleAmt / 2;
        const wobbleLeft = this.p.noise(seed + i * 0.5 + 30) * wobbleAmt - wobbleAmt / 2;

        this.p.beginShape();
        this.p.vertex(cx + stripeX + wobbleTop, cy - stripeH / 2 + wobbleTop * 0.3);
        this.p.vertex(cx + stripeX + stripeW / 2 + wobbleRight, cy + wobbleRight * 0.3);
        this.p.vertex(cx + stripeX + wobbleBottom, cy + stripeH / 2 + wobbleBottom * 0.3);
        this.p.vertex(cx + stripeX - stripeW / 2 + wobbleLeft, cy + wobbleLeft * 0.3);
        this.p.endShape(this.p.CLOSE);
      }
    }
  }

  drawHands() {
    for (const hand of this.hands) {
      const color = hand.handedness === 'Left' ? COLORS.turquoise : COLORS.crimson;

      // Draw landmarks
      for (let i = 0; i < hand.landmarks.length; i++) {
        const lm = hand.landmarks[i];
        const x = lm.x * this.p.width;
        const y = lm.y * this.p.height;

        // Larger circles for fingertips
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const size = isTip ? 12 : 6;

        this.p.fill(color[0], color[1], color[2], 200);
        this.p.ellipse(x, y, size);

        // Glow effect
        this.p.fill(color[0], color[1], color[2], 50);
        this.p.ellipse(x, y, size * 2);
      }
    }
  }

  drawConnections() {
    this.p.strokeWeight(2);

    for (const hand of this.hands) {
      const color = hand.handedness === 'Left' ? COLORS.turquoise : COLORS.crimson;
      this.p.stroke(color[0], color[1], color[2], 150);

      // Finger connections
      const fingers = [
        [0, 1, 2, 3, 4],       // Thumb
        [0, 5, 6, 7, 8],       // Index
        [0, 9, 10, 11, 12],    // Middle
        [0, 13, 14, 15, 16],   // Ring
        [0, 17, 18, 19, 20],   // Pinky
        [5, 9, 13, 17]         // Palm
      ];

      for (const finger of fingers) {
        this.p.beginShape();
        this.p.noFill();
        for (const idx of finger) {
          const lm = hand.landmarks[idx];
          this.p.vertex(lm.x * this.p.width, lm.y * this.p.height);
        }
        this.p.endShape();
      }
    }

    this.p.noStroke();
  }

  drawTemplate() {
    if (!this.template) return;

    this.p.push();
    this.p.translate(this.p.width / 2, this.p.height / 2);
    this.p.scale(0.4);

    // Draw template landmarks as ghost outline
    this.p.stroke(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2], 100);
    this.p.strokeWeight(2);
    this.p.noFill();

    for (const lm of this.template.landmarks) {
      const x = (lm.x - 0.5) * this.p.width;
      const y = (lm.y - 0.5) * this.p.height;
      this.p.ellipse(x, y, 20);
    }

    this.p.pop();

    // Template name
    this.p.fill(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
    this.p.textSize(14);
    this.p.textAlign(this.p.CENTER);
    this.p.text(this.template.name, this.p.width / 2, 100);
    this.p.textSize(12);
    this.p.fill(255, 255, 255, 150);
    this.p.text(this.template.description, this.p.width / 2, 120);
  }

  drawMatchIndicator() {
    // Circular progress indicator
    const cx = this.p.width / 2;
    const cy = this.p.height - 140;
    const radius = 30;

    // Background circle
    this.p.noFill();
    this.p.stroke(50);
    this.p.strokeWeight(4);
    this.p.arc(cx, cy, radius * 2, radius * 2, 0, this.p.TWO_PI);

    // Progress arc
    const progress = this.matchScore * this.p.TWO_PI;
    const color = this.matchScore > 0.7 ? COLORS.green :
                  this.matchScore > 0.4 ? COLORS.gold : COLORS.crimson;
    this.p.stroke(color[0], color[1], color[2]);
    this.p.arc(cx, cy, radius * 2, radius * 2, -this.p.HALF_PI, -this.p.HALF_PI + progress);

    // Percentage text
    this.p.noStroke();
    this.p.fill(255);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.textSize(14);
    this.p.text(Math.round(this.matchScore * 100) + '%', cx, cy);
  }

  setMode(mode) {
    this.mode = mode;
    this.medallions = []; // Clear medallions on mode change
  }

  setMatchScore(score) {
    this.matchScore = score;
  }

  setTemplate(template) {
    this.template = template;
  }

  drawEqualizer() {
    if (!this.soundEngine) return;

    const fftData = this.soundEngine.getFFTData();
    if (!fftData) return;

    // Dense overlapping medallions like a horizontal ikat strip
    const medallionCount = 50;
    const totalWidth = this.p.width + 100; // Extend past edges
    const spacing = totalWidth / medallionCount;
    const bottomY = this.p.height - 90;

    for (let i = 0; i < medallionCount; i++) {
      // Map to FFT bins (wrap around)
      const fftIndex = i % 32;
      const target = fftData[fftIndex] || 0;
      this.eqSmoothed[i] = this.eqSmoothed[i] * 0.85 + target * 0.15;

      const value = Math.max(0.15, this.eqSmoothed[i]); // Minimum size so they're always visible

      // Varied sizes like v18
      const baseWidth = 50 + value * 60 + Math.sin(i * 0.7) * 15;
      const ratio = 2 + value + Math.sin(i * 1.3) * 0.5;
      const baseHeight = baseWidth * ratio;

      // Position - tight spacing with random offset like mouse drawing
      const x = -50 + i * spacing + Math.sin(i * 2.1) * 8;
      const y = bottomY + Math.sin(i * 1.7) * 10;

      // Pick colors cycling through palette
      const color1 = IKAT_COLORS[i % IKAT_COLORS.length];
      const color2 = IKAT_COLORS[(i + 4) % IKAT_COLORS.length];

      const alpha = 180 + value * 75;
      const wobbleAmt = 2 + value * 4;
      const seed = i * 73.7; // Fixed seed per medallion for stability

      // Number of layers varies
      const numLayers = 2 + Math.floor(value * 2);
      const hasBlur = (i % 3 === 0) && value > 0.2;
      const hasCenter = value > 0.4 && (i % 5 === 0);

      this.p.push();
      this.p.translate(x, y);

      // Draw layers from outside in
      for (let layer = 0; layer < numLayers; layer++) {
        const layerScale = 1 - layer * 0.25;
        const layerColor = layer === 0 ? color1 : color2;
        const layerAlpha = alpha * (1 - layer * 0.15);
        const w = baseWidth * layerScale;
        const h = baseHeight * layerScale;

        if (hasBlur && layer === 0) {
          this.drawBlurredWobblyMedallion(0, 0, w, h, layerColor, layerAlpha * 0.7, 5, wobbleAmt, seed + layer * 20);
        } else {
          this.drawWobblyMedallion(0, 0, w, h, layerColor, layerAlpha, wobbleAmt, seed + layer * 20);
        }
      }

      // Center diamond
      if (hasCenter) {
        const innermost = baseWidth * (1 - (numLayers - 1) * 0.25);
        this.p.fill(CREAM[0], CREAM[1], CREAM[2], alpha * 0.9);
        const cw = innermost * 0.3;
        const ch = baseHeight * 0.08;
        this.p.beginShape();
        this.p.vertex(0, -ch / 2);
        this.p.vertex(cw / 2, 0);
        this.p.vertex(0, ch / 2);
        this.p.vertex(-cw / 2, 0);
        this.p.endShape(this.p.CLOSE);
      }

      this.p.pop();
    }
  }
}
