// Every visual constant measured from the reference reel lives here.
// Measured on the 720x1280 original; values below are scaled for the 1080x1920 render.
import {loadFont} from '@remotion/google-fonts/Poppins';

const {fontFamily} = loadFont('normal', {weights: ['700', '800', '900'], subsets: ['latin']});

export const FONT = fontFamily; // Poppins: geometric sans, matches the caption + headline glyphs

export const COLORS = {
  orange: '#FF6600', // sampled median RGB(253,100,0) from "year", "sell!", "six", phone number
  orangeLight: '#FF9A3C', // light end of the house-icon gradient
  white: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.45)',
};

export const CAPTION = {
  size: 110, // ~74px font-size on the 720-wide original ("give" = 170px wide)
  weight: 800,
  y: 0.575, // centre of the word, as a fraction of frame height (chest level)
  letterSpacing: '-0.01em',
  shadow: '0 4px 14px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.35)',
  popFrames: 4, // scale 0.82 -> 1.0 on each new word
};

export const HEADLINE = {
  weight: 900,
  letterSpacing: '-0.045em',
  lineHeight: 0.86,
  enterFrames: 8, // vertical stretch + vertical motion blur reveal
  exitFrames: 8, // drift up + vertical blur + fade
  stagger: 3, // frames between lines when several enter together
};

// Base colour grade applied to the footage (punchy, saturated office look)
export const GRADE = 'saturate(1.18) contrast(1.06) brightness(1.02)';
