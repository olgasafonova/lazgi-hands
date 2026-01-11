/**
 * Lazgi Hand Position Templates
 *
 * Each template defines a target hand configuration for learning mode.
 * Landmarks are normalized coordinates (0-1).
 *
 * Based on Khorezm Lazgi movement vocabulary:
 * - Sun salutation (raised palm)
 * - Trembling wrist positions
 * - "Broken" angular poses
 */

export const templates = [
  {
    id: 'sun-salutation',
    name: 'Sun Salutation',
    description: 'Arm raised, palm toward the sun',
    category: 'opening',
    landmarks: generateSunSalutation()
  },
  {
    id: 'trembling-flame',
    name: 'Trembling Flame',
    description: 'Wrist bent, fingers spread like fire',
    category: 'trembling',
    landmarks: generateTremblingFlame()
  },
  {
    id: 'broken-angle',
    name: 'Broken Angle',
    description: 'Angular wrist, bent fingers - Khorezm style',
    category: 'broken',
    landmarks: generateBrokenAngle()
  },
  {
    id: 'finger-flutter',
    name: 'Finger Flutter',
    description: 'Fingers spread and slightly curved',
    category: 'trembling',
    landmarks: generateFingerFlutter()
  },
  {
    id: 'closed-lotus',
    name: 'Closed Lotus',
    description: 'Fingertips together, palm cupped',
    category: 'transition',
    landmarks: generateClosedLotus()
  }
];

/**
 * Generate idealized landmark positions for each pose.
 * These are approximations; refine with actual video frame extraction.
 */

function generateSunSalutation() {
  // Open palm facing up, fingers spread
  return [
    { x: 0.5, y: 0.8 },   // 0: Wrist

    // Thumb (slightly to the side)
    { x: 0.35, y: 0.75 }, // 1
    { x: 0.28, y: 0.65 }, // 2
    { x: 0.22, y: 0.55 }, // 3
    { x: 0.18, y: 0.45 }, // 4: Thumb tip

    // Index finger (pointing up-left)
    { x: 0.42, y: 0.65 }, // 5
    { x: 0.38, y: 0.50 }, // 6
    { x: 0.35, y: 0.35 }, // 7
    { x: 0.32, y: 0.20 }, // 8: Index tip

    // Middle finger (pointing up)
    { x: 0.50, y: 0.62 }, // 9
    { x: 0.50, y: 0.45 }, // 10
    { x: 0.50, y: 0.28 }, // 11
    { x: 0.50, y: 0.12 }, // 12: Middle tip

    // Ring finger (pointing up-right)
    { x: 0.58, y: 0.65 }, // 13
    { x: 0.62, y: 0.50 }, // 14
    { x: 0.65, y: 0.35 }, // 15
    { x: 0.68, y: 0.20 }, // 16: Ring tip

    // Pinky (pointing right)
    { x: 0.65, y: 0.72 }, // 17
    { x: 0.72, y: 0.60 }, // 18
    { x: 0.78, y: 0.50 }, // 19
    { x: 0.82, y: 0.42 }  // 20: Pinky tip
  ];
}

function generateTremblingFlame() {
  // Wrist bent, fingers spread upward like flames
  return [
    { x: 0.5, y: 0.85 },

    { x: 0.32, y: 0.78 },
    { x: 0.25, y: 0.68 },
    { x: 0.22, y: 0.55 },
    { x: 0.20, y: 0.42 },

    { x: 0.40, y: 0.68 },
    { x: 0.38, y: 0.52 },
    { x: 0.36, y: 0.36 },
    { x: 0.35, y: 0.22 },

    { x: 0.50, y: 0.65 },
    { x: 0.50, y: 0.48 },
    { x: 0.50, y: 0.32 },
    { x: 0.50, y: 0.15 },

    { x: 0.60, y: 0.68 },
    { x: 0.62, y: 0.52 },
    { x: 0.64, y: 0.36 },
    { x: 0.66, y: 0.22 },

    { x: 0.68, y: 0.75 },
    { x: 0.74, y: 0.62 },
    { x: 0.78, y: 0.50 },
    { x: 0.82, y: 0.38 }
  ];
}

function generateBrokenAngle() {
  // Angular "broken" pose characteristic of Khorezm
  return [
    { x: 0.5, y: 0.75 },

    // Thumb bent inward
    { x: 0.42, y: 0.68 },
    { x: 0.38, y: 0.58 },
    { x: 0.40, y: 0.50 },
    { x: 0.45, y: 0.45 },

    // Index sharply bent
    { x: 0.45, y: 0.60 },
    { x: 0.42, y: 0.48 },
    { x: 0.48, y: 0.40 },
    { x: 0.55, y: 0.38 },

    // Middle with angle
    { x: 0.52, y: 0.58 },
    { x: 0.52, y: 0.45 },
    { x: 0.58, y: 0.38 },
    { x: 0.65, y: 0.35 },

    // Ring bent
    { x: 0.58, y: 0.60 },
    { x: 0.60, y: 0.50 },
    { x: 0.65, y: 0.45 },
    { x: 0.72, y: 0.42 },

    // Pinky curved
    { x: 0.65, y: 0.65 },
    { x: 0.70, y: 0.58 },
    { x: 0.75, y: 0.55 },
    { x: 0.80, y: 0.52 }
  ];
}

function generateFingerFlutter() {
  // Spread fingers, slight curve for flutter motion
  return [
    { x: 0.5, y: 0.82 },

    { x: 0.30, y: 0.72 },
    { x: 0.22, y: 0.60 },
    { x: 0.18, y: 0.48 },
    { x: 0.15, y: 0.38 },

    { x: 0.38, y: 0.65 },
    { x: 0.32, y: 0.48 },
    { x: 0.28, y: 0.32 },
    { x: 0.25, y: 0.18 },

    { x: 0.50, y: 0.62 },
    { x: 0.50, y: 0.42 },
    { x: 0.50, y: 0.25 },
    { x: 0.50, y: 0.08 },

    { x: 0.62, y: 0.65 },
    { x: 0.68, y: 0.48 },
    { x: 0.72, y: 0.32 },
    { x: 0.75, y: 0.18 },

    { x: 0.70, y: 0.72 },
    { x: 0.78, y: 0.60 },
    { x: 0.82, y: 0.48 },
    { x: 0.85, y: 0.38 }
  ];
}

function generateClosedLotus() {
  // Fingertips together, palm cupped
  return [
    { x: 0.5, y: 0.85 },

    { x: 0.40, y: 0.78 },
    { x: 0.38, y: 0.68 },
    { x: 0.42, y: 0.58 },
    { x: 0.48, y: 0.52 },

    { x: 0.45, y: 0.70 },
    { x: 0.44, y: 0.58 },
    { x: 0.46, y: 0.46 },
    { x: 0.50, y: 0.38 },

    { x: 0.50, y: 0.68 },
    { x: 0.50, y: 0.55 },
    { x: 0.50, y: 0.42 },
    { x: 0.50, y: 0.32 },

    { x: 0.55, y: 0.70 },
    { x: 0.56, y: 0.58 },
    { x: 0.54, y: 0.46 },
    { x: 0.50, y: 0.38 },

    { x: 0.60, y: 0.75 },
    { x: 0.62, y: 0.65 },
    { x: 0.58, y: 0.55 },
    { x: 0.52, y: 0.48 }
  ];
}

/**
 * Calculate match score between detected hand and template.
 * Returns 0-1 where 1 is perfect match.
 */
export function getClosestTemplate(hand, template) {
  if (!hand || !template) return 0;

  let totalDistance = 0;
  const landmarks = hand.landmarks;

  for (let i = 0; i < 21; i++) {
    const detected = landmarks[i];
    const target = template.landmarks[i];

    // Euclidean distance
    const dx = detected.x - target.x;
    const dy = detected.y - target.y;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }

  // Normalize: average distance per landmark, invert for score
  const avgDistance = totalDistance / 21;

  // 0.05 = perfect, 0.3 = very wrong
  const score = Math.max(0, 1 - avgDistance / 0.25);

  return score;
}

/**
 * Find best matching template from all templates
 */
export function findBestMatch(hand) {
  let bestScore = 0;
  let bestTemplate = null;

  for (const template of templates) {
    const score = getClosestTemplate(hand, template);
    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template;
    }
  }

  return { template: bestTemplate, score: bestScore };
}
