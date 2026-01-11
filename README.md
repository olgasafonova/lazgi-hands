# Lazgi Hands

Interactive visualization of Khorezm Lazgi dance hand movements with real-time tracking, visual effects, and generative music.

## The Concept

An algorithm teaches dance from the land where algorithms were born.

Muhammad ibn Musa al-Khwarizmi (c. 780-850 CE) was born in Khorezm, an ancient civilization in what is now Uzbekistan. His Latinized name gave us the word "algorithm." This project uses algorithms to visualize and teach Lazgi, the traditional dance of his homeland.

## Features

- **Hand tracking** via MediaPipe (21 landmarks per hand)
- **Learn mode** - Match your hands to template positions
- **Perform mode** - Free expression with particle trails
- **Generative music** - Sounds respond to hand movement
- **Ikat-inspired visuals** - Colors and patterns from Uzbek textiles

## Quick Start

```bash
cd ~/Projects/lazgi-hands
npm install
npm run dev
```

Open http://localhost:5173 in Chrome (requires webcam).

## Controls

| Key | Action |
|-----|--------|
| `1` | Learn mode |
| `2` | Perform mode |
| `S` | Toggle sound |
| `←` `→` | Cycle templates (learn mode) |

## Tech Stack

- **MediaPipe Hands** - Real-time hand landmark detection
- **p5.js** - Creative coding / visualization
- **Tone.js** - Web audio synthesis
- **Vite** - Development server

All free and open source.

## Project Structure

```
lazgi-hands/
├── index.html          # Main page
├── src/
│   ├── app.js          # Orchestration
│   ├── tracking.js     # MediaPipe integration
│   ├── visualizer.js   # p5.js particles & rendering
│   ├── templates.js    # Hand position templates
│   └── music.js        # Tone.js sound generation
├── assets/
│   ├── templates/      # JSON hand position data
│   ├── audio/          # Lazgi music samples
│   └── patterns/       # Ikat pattern references
└── docs/
    └── RESEARCH.md     # Background research
```

## Lazgi Movement Vocabulary

The dance follows a sequential awakening:

1. Static pose - arm raised toward the Sun
2. Fingers - first to tremble
3. Wrists - rapid vibration (the word "lazgi" means "tremble")
4. Arms, shoulders, neck, torso, legs

Key characteristics:
- Wrist trembling like flames or sunshine rays
- "Broken" angular poses (characteristic of Khorezm)
- Finger flutter and snapping

## Visual Style

Colors from Uzbek Ikat textiles (Atlas/Adras):
- Indigo, crimson, gold, turquoise, purple, green
- Blurred edges mimicking the resist-dye technique

## Roadmap

- [ ] Extract real hand positions from reference videos
- [ ] Add more templates for complete movement vocabulary
- [ ] Integrate authentic Lazgi music samples
- [ ] Improve template matching algorithm
- [ ] Add tutorial flow with progression
- [ ] Mobile support

## References

- [Voices on Central Asia - Lazgi](https://voicesoncentralasia.org/khorezm-lazgi-the-sunniest-dance-on-earth/)
- [UNESCO - Khorezm Dance Lazgi](http://ich.uz/en/ich-of-uzbekistan/elements-under-consideration/507-khoresm-dances-consideration)
- [Alesouk - Uzbek Ikat Textiles](https://alesouk.com/the-most-beautiful-textiles-in-the-world-are-uzbek-ikat-and-suzani-glossary-of-uzbek-fabrics/)

## License

MIT
