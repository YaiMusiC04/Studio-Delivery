const { Resvg } = require('@resvg/resvg-js')
const { writeFileSync } = require('fs')
const path = require('path')

const P1 = 'M35 19c0-2.062-.367-4.039-1.04-5.868-.46 5.389-3.333 8.157-6.335 6.868-2.812-1.208-.917-5.917-.777-8.164.236-3.809-.012-8.169-6.931-11.794 2.875 5.5.333 8.917-2.333 9.125-2.958.231-5.667-2.542-4.667-7.042-3.238 2.386-3.332 6.402-2.333 9 1.042 2.708-.042 4.958-2.583 5.208-2.84.28-4.418-3.041-2.963-8.333C2.52 10.965 1 14.805 1 19c0 9.389 7.611 17 17 17s17-7.611 17-17z'
const P2 = 'M28.394 23.999c.148 3.084-2.561 4.293-4.019 3.709-2.106-.843-1.541-2.291-2.083-5.291s-2.625-5.083-5.708-6c2.25 6.333-1.247 8.667-3.08 9.084-1.872.426-3.753-.001-3.968-4.007C7.352 23.668 6 26.676 6 30c0 .368.023.73.055 1.09C9.125 34.124 13.342 36 18 36s8.875-1.876 11.945-4.91c.032-.36.055-.722.055-1.09 0-2.187-.584-4.236-1.606-6.001z'

function makeSVG(size) {
  // iOS/Android apply their own rounded-corner mask, so we use a flat square.
  // Flame at 62% of size, centered with slight downward nudge.
  const fw = size * 0.62
  const scale = fw / 36
  const tx = (size - fw) / 2
  const ty = (size - fw) / 2 + size * 0.03
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">',
    '  <defs>',
    '    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
    '      <stop offset="0%" stop-color="#AAFF22"/>',
    '      <stop offset="100%" stop-color="#22CC00"/>',
    '    </linearGradient>',
    '  </defs>',
    '  <rect width="' + size + '" height="' + size + '" fill="url(#bg)"/>',
    '  <g transform="translate(' + tx + ',' + ty + ') scale(' + scale + ')">',
    '    <path fill="white" d="' + P1 + '"/>',
    '    <path fill="white" d="' + P2 + '"/>',
    '  </g>',
    '</svg>',
  ].join('\n')
}

const OUT = path.join(__dirname, 'public')
for (const [size, name] of [[180, 'apple-touch-icon'], [192, 'icon-192'], [512, 'icon-512']]) {
  const svg = makeSVG(size)
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  const png = resvg.render().asPng()
  writeFileSync(path.join(OUT, name + '.png'), png)
  console.log('✓', name + '.png', '(' + size + 'x' + size + ')')
}
