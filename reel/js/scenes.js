/* Storyboard for the "₹1 candy" reel (about 67 seconds, 9:16).
 *
 * Each scene has:
 *   dur    seconds on screen
 *   enter  transition from the previous scene: cut | zoom | whip | pillar | shatter | flash | slideUp | glow
 *   bg     { img: '<file name in assets/ without extension>', fallback: '<procedural background>',
 *            from: {s, x, y, r}, to: {s, x, y, r} }   camera move (scale, offset as a fraction of the frame, rotation in degrees)
 *   fx     timed overlays. Positions are fractions of the frame (x: 0 = left, 1 = right; y: 0 = top, 1 = bottom),
 *          sizes are fractions of the frame width, and t is seconds from the start of the scene.
 *
 * Overlay types: text, counter, pill, sprite, box, marker, burst, flash, dust, subscribe.
 * Text styles: lime (yellow-green gradient), neon (green with outline), white, silver, cyan, yellow.
 * Text animations: type (letter by letter), pop, rise.
 *
 * Edit the text and numbers here to tell any story in the same style.
 */
window.REEL_CONFIG = {
  title: '₹1 Candy That Crushed Coke',
  width: 720,
  height: 1280,
  fps: 30,
  brand: {
    sign: 'DS GROUP', initial: 'S', signColor: '#1b8f3a',
    candy: { label: 'PULSE', tag: 'Kachcha Aam' },
    toffee: { label: 'mango', sub: 'bite' }
  },
  scenes: [
    { // 0:00 wooden table, candy drops in, months counter, ₹1
      dur: 2.5, bg: { img: 'wood', fallback: 'wood', optional: true, from: { s: 1.02 }, to: { s: 1.1, y: 0.01 } },
      fx: [
        { type: 'dust' },
        { type: 'sprite', name: 'candy', anim: 'drop', t: 0, dur: 0.6, x: 0.5, y: 0.48, w: 0.27, rot: -6, fromX: 0.62, fromY: 1.1 },
        { type: 'counter', t: 0.35, dur: 1.1, from: 2, to: 8, suffix: ' Months', style: 'lime', x: 0.52, y: 0.4, size: 0.085, accent: true },
        { type: 'text', text: '₹1', t: 0.9, x: 0.5, y: 0.585, size: 0.075, style: 'silver', anim: 'pop' }
      ]
    },
    { // Coke executive, the big question
      dur: 2.5, enter: 'zoom', bg: { img: '02', fallback: 'sky', from: { s: 1.0, y: 0.02 }, to: { s: 1.2, y: 0.05 } },
      bgOptions: { sign: 'COLA CO.', signColor: '#d6001c' },
      fx: [{ type: 'text', text: '?', t: 1.6, x: 0.47, y: 0.68, size: 0.42, style: 'cyan', anim: 'pop', wobble: true }]
    },
    { // 2015, company HQ, founder name tag
      dur: 4.0, enter: 'whip', bg: { img: '03', fallback: 'sky', from: { s: 1.3, y: 0.12 }, to: { s: 1.04, y: 0 }, ease: 'outCubic' },
      bgOptions: { sign: 'DS GROUP' },
      fx: [
        { type: 'text', text: '2015', t: 0.1, x: 0.5, y: 0.13, size: 0.09, style: 'lime', anim: 'type', cps: 6 },
        { type: 'pill', text: 'RAJIV KUMAR', t: 2.4, x: 0.28, y: 0.625, size: 0.045, bg: '#ffd400' }
      ]
    },
    { dur: 3.6, enter: 'pillar', bg: { img: '04', fallback: 'office', from: { s: 1.05 }, to: { s: 1.18, x: -0.02 } } },
    { dur: 1.2, enter: 'shatter', bg: { img: '05', fallback: 'office', from: { s: 1.05 }, to: { s: 1.12 } } },
    { dur: 1.6, enter: 'whip', bg: { img: '06', fallback: 'logo', from: { s: 1.15, y: 0.08 }, to: { s: 1.15, y: -0.08 } } },
    { dur: 2.6, enter: 'slideUp', bg: { img: '07', fallback: 'office', from: { s: 1.08 }, to: { s: 1.0 } } },
    { // market share counter
      dur: 3.4, enter: 'pillar', bg: { img: 'wood', fallback: 'wood', optional: true, from: { s: 1.04 }, to: { s: 1.1 } },
      fx: [
        { type: 'dust' },
        { type: 'sprite', name: 'toffee', anim: 'pop', t: 0.25, x: 0.5, y: 0.43, w: 0.14, grow: { t: 1.4, to: 1.35 } },
        { type: 'counter', t: 0.3, dur: 1.5, from: 66, to: 86, suffix: '%', style: 'white', x: 0.5, y: 0.6, size: 0.13, grow: { t: 1.6, to: 1.25 } },
        { type: 'text', text: '₹ 0.50', t: 1.4, x: 0.5, y: 0.34, size: 0.07, style: 'neon', anim: 'pop' }
      ]
    },
    {
      dur: 2.1, enter: 'zoom', bg: { img: '08', fallback: 'office', from: { s: 1.1 }, to: { s: 1.0 } },
      fx: [{ type: 'pill', text: '₹1', t: 0.4, x: 0.3, y: 0.2, size: 0.05, bg: 'rgba(20,20,20,.65)', textStyle: 'lime' }]
    },
    { // the scale: 4 grams
      dur: 3.1, enter: 'pillar', bg: { img: '09', fallback: 'office', from: { s: 1.0 }, to: { s: 1.12, y: 0.02 } },
      fx: [
        { type: 'sprite', name: 'candy', anim: 'drop', t: 0.1, dur: 0.8, x: 0.5, y: 0.53, w: 0.3, fromX: 0.5, fromY: -0.2, spin: 1.2 },
        { type: 'text', text: '4 grams', t: 2.2, x: 0.5, y: 0.46, size: 0.08, style: 'lime', anim: 'pop' }
      ]
    },
    { // flavour explosion
      dur: 2.4, enter: 'flash', bg: { img: 'burst', fallback: 'green', optional: true, from: { s: 1.0 }, to: { s: 1.15 } },
      fx: [{ type: 'burst', t: 0.05, dur: 2.3 }]
    },
    { dur: 2.4, enter: 'glow', bg: { img: '11', fallback: 'kitchen', from: { s: 1.12, y: 0.06 }, to: { s: 1.12, y: -0.04 } } },
    { dur: 1.0, enter: 'zoom', bg: { img: '12', fallback: 'kitchen', from: { s: 1.0 }, to: { s: 1.12 } } },
    { dur: 2.0, enter: 'whip', bg: { img: '13', fallback: 'wood', from: { s: 1.05, r: -4 }, to: { s: 1.15, r: 4 } } },
    { dur: 1.0, enter: 'flash', bg: { img: '14', fallback: 'logo', from: { s: 1.2 }, to: { s: 1.05 } } },
    { dur: 2.0, enter: 'whip', bg: { img: '15', fallback: 'office', from: { s: 1.0 }, to: { s: 1.1 } } },
    { // whiteboard: first release in three states
      dur: 4.6, enter: 'pillar', bg: { img: '16', fallback: 'board', from: { s: 1.18, y: 0.08 }, to: { s: 1.02, y: 0 } },
      bgOptions: { board: { title: 'First Release of Pulse', subtitle: 'in three states -', highlight: 'Rajasthan, Gujarat & Delhi',
        steps: ['STARTUP LAUNCH FLOW', 'MARKET RESEARCH', 'FIRST RELEASE', 'MARKETING & DISTRIBUTION', 'SCALE & EXPANSION'] } },
      fx: [{ type: 'marker', onImage: true, t: 0.6, dur: 1.0, x: 0.2, y: 0.19, w: 0.6, h: 0.035 }]
    },
    { dur: 2.4, enter: 'pillar', bg: { img: '17', fallback: 'shop', from: { s: 1.0 }, to: { s: 1.1, y: 0.02 } } },
    { // face to full shot, pulled back
      dur: 3.0, enter: 'zoom', bg: { img: '18', fallback: 'sky', from: { s: 2.4, y: 0.25 }, to: { s: 1.02, y: 0 }, ease: 'outCubic' },
      bgOptions: { sign: 'DS GROUP' }
    },
    { dur: 3.0, enter: 'pillar', bg: { img: '19', fallback: 'office', from: { s: 1.0 }, to: { s: 1.12 } } },
    { // ₹100 crore
      dur: 2.4, enter: 'zoom', bg: { img: '20', fallback: 'office', from: { s: 1.06 }, to: { s: 1.0 } },
      fx: [{ type: 'text', text: '₹100', sub: 'Crore', t: 0.2, x: 0.69, y: 0.63, size: 0.11, subSize: 0.07, style: 'neon', anim: 'pop' }]
    },
    { dur: 2.8, enter: 'shatter', bg: { img: '21', fallback: 'sky', from: { s: 1.0 }, to: { s: 1.16, y: -0.04 } }, bgOptions: { sign: 'COLA CO.', signColor: '#d6001c' } },
    { // shop shelf takeover
      dur: 3.6, enter: 'whip', bg: { img: '22', fallback: 'shop', from: { s: 1.25, y: 0.05 }, to: { s: 1.0 } },
      fx: [
        { type: 'box', onImage: true, t: 0.6, dur: 0.8, x: 0.36, y: 0.1, w: 0.36, h: 0.36 },
        { type: 'counter', t: 1.1, dur: 1.0, from: 28, to: 35, prefix: '+', suffix: ' Lakh', endSuffix: ' Lakhs', style: 'lime', x: 0.5, y: 0.66, size: 0.07, pill: true, pillColor: 'rgba(30,30,30,.55)' }
      ]
    },
    { // 20 million candies
      dur: 3.0, enter: 'zoom', bg: { img: '23', fallback: 'shop', from: { s: 1.15 }, to: { s: 1.0 } },
      fx: [
        { type: 'text', text: '20 Million', t: 0.4, x: 0.37, y: 0.7, size: 0.06, style: 'lime', anim: 'type' },
        { type: 'text', text: 'Candies', t: 0.9, x: 0.6, y: 0.775, size: 0.095, style: 'lime', anim: 'type' }
      ]
    },
    { // ₹10,000+ crore
      dur: 2.8, enter: { type: 'flash', color: '#ffcc33', dur: 0.5 }, bg: { img: '24', fallback: 'sky', from: { s: 1.12 }, to: { s: 1.0 } },
      bgOptions: { sign: 'DS GROUP' },
      fx: [{ type: 'counter', t: 0.3, dur: 1.2, from: 9805, to: 10000, fmt: 'indian', prefix: '₹ ', suffix: '+', sub: 'Crore', subSize: 0.075, style: 'neon', x: 0.5, y: 0.66, size: 0.09 }]
    },
    { // outro: candy + like / subscribe
      dur: 2.8, enter: 'shatter', bg: { img: 'wood', fallback: 'wood', optional: true, from: { s: 1.02 }, to: { s: 1.08 } },
      fx: [
        { type: 'dust' },
        { type: 'sprite', name: 'candy', anim: 'pop', t: 0.15, x: 0.5, y: 0.47, w: 0.36, rot: -4, float: true },
        { type: 'subscribe', t: 0.4, x: 0.5, y: 0.59 }
      ]
    }
  ]
};
