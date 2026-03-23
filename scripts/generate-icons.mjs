/**
 * NewShare App Icon Generator
 * Creates all required icon PNG files from SVG templates
 */
import { execSync } from "child_process";
import { writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "../assets/images");

// Main icon SVG - modern gradient design with N + share symbol
const mainIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f3460"/>
      <stop offset="100%" style="stop-color:#533483"/>
    </linearGradient>
    <linearGradient id="nGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e94560"/>
      <stop offset="100%" style="stop-color:#f5a623"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>

  <!-- Subtle inner glow ring -->
  <rect width="1024" height="1024" rx="220" fill="none" stroke="url(#accent)" stroke-width="2" opacity="0.4"/>

  <!-- Decorative circles -->
  <circle cx="820" cy="200" r="180" fill="url(#accent)" opacity="0.15"/>
  <circle cx="200" cy="820" r="140" fill="url(#accent)" opacity="0.1"/>

  <!-- N letterform - bold, modern -->
  <g filter="url(#glow)">
    <!-- Left vertical bar -->
    <rect x="248" y="290" width="110" height="444" rx="16" fill="url(#nGrad)"/>
    <!-- Right vertical bar -->
    <rect x="666" y="290" width="110" height="444" rx="16" fill="url(#nGrad)"/>
    <!-- Diagonal stroke -->
    <polygon points="248,290 358,290 776,734 666,734" fill="url(#nGrad)"/>
  </g>

  <!-- Share dots - top right of N -->
  <g transform="translate(680, 240)" filter="url(#glow)">
    <!-- Center dot -->
    <circle cx="0" cy="0" r="28" fill="#ffffff" opacity="0.95"/>
    <!-- Top-left dot -->
    <circle cx="-72" cy="-52" r="20" fill="#ffffff" opacity="0.7"/>
    <!-- Bottom-left dot -->
    <circle cx="-72" cy="52" r="20" fill="#ffffff" opacity="0.7"/>
    <!-- Connecting lines -->
    <line x1="-52" y1="-40" x2="-20" y2="-8" stroke="#ffffff" stroke-width="6" opacity="0.6" stroke-linecap="round"/>
    <line x1="-52" y1="40" x2="-20" y2="8" stroke="#ffffff" stroke-width="6" opacity="0.6" stroke-linecap="round"/>
  </g>
</svg>`;

// Android foreground icon (slightly smaller content, transparent bg)
const androidForegroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="nGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e94560"/>
      <stop offset="100%" style="stop-color:#f5a623"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- N letterform -->
  <g filter="url(#glow)" transform="translate(512,512) scale(0.85) translate(-512,-512)">
    <rect x="248" y="290" width="110" height="444" rx="16" fill="url(#nGrad)"/>
    <rect x="666" y="290" width="110" height="444" rx="16" fill="url(#nGrad)"/>
    <polygon points="248,290 358,290 776,734 666,734" fill="url(#nGrad)"/>
  </g>

  <!-- Share dots -->
  <g transform="translate(680, 240)" filter="url(#glow)">
    <circle cx="0" cy="0" r="28" fill="#ffffff" opacity="0.95"/>
    <circle cx="-72" cy="-52" r="20" fill="#ffffff" opacity="0.7"/>
    <circle cx="-72" cy="52" r="20" fill="#ffffff" opacity="0.7"/>
    <line x1="-52" y1="-40" x2="-20" y2="-8" stroke="#ffffff" stroke-width="6" opacity="0.6" stroke-linecap="round"/>
    <line x1="-52" y1="40" x2="-20" y2="8" stroke="#ffffff" stroke-width="6" opacity="0.6" stroke-linecap="round"/>
  </g>
</svg>`;

// Android background - solid dark blue
const androidBackgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="820" cy="200" r="180" fill="#0f3460" opacity="0.3"/>
  <circle cx="200" cy="820" r="140" fill="#0f3460" opacity="0.2"/>
</svg>`;

// Android monochrome (white on transparent)
const androidMonochromeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <g transform="translate(512,512) scale(0.85) translate(-512,-512)">
    <rect x="248" y="290" width="110" height="444" rx="16" fill="#ffffff"/>
    <rect x="666" y="290" width="110" height="444" rx="16" fill="#ffffff"/>
    <polygon points="248,290 358,290 776,734 666,734" fill="#ffffff"/>
  </g>
  <g transform="translate(680, 240)">
    <circle cx="0" cy="0" r="28" fill="#ffffff"/>
    <circle cx="-72" cy="-52" r="20" fill="#ffffff" opacity="0.8"/>
    <circle cx="-72" cy="52" r="20" fill="#ffffff" opacity="0.8"/>
    <line x1="-52" y1="-40" x2="-20" y2="-8" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
    <line x1="-52" y1="40" x2="-20" y2="8" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
  </g>
</svg>`;

// Favicon SVG (simple, readable at small size)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
    <linearGradient id="nGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e94560"/>
      <stop offset="100%" style="stop-color:#f5a623"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)"/>
  <!-- N letterform (simplified for small size) -->
  <rect x="14" y="16" width="8" height="32" rx="2" fill="url(#nGrad)"/>
  <rect x="42" y="16" width="8" height="32" rx="2" fill="url(#nGrad)"/>
  <polygon points="14,16 22,16 50,48 42,48" fill="url(#nGrad)"/>
</svg>`;

// Splash icon SVG (centered, with extra padding)
const splashIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="nGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e94560"/>
      <stop offset="100%" style="stop-color:#f5a623"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <!-- N letterform -->
  <g filter="url(#glow)">
    <rect x="100" y="120" width="56" height="272" rx="10" fill="url(#nGrad)"/>
    <rect x="356" y="120" width="56" height="272" rx="10" fill="url(#nGrad)"/>
    <polygon points="100,120 156,120 412,392 356,392" fill="url(#nGrad)"/>
  </g>
  <!-- Share dots -->
  <g transform="translate(360, 100)" filter="url(#glow)">
    <circle cx="0" cy="0" r="16" fill="#ffffff" opacity="0.95"/>
    <circle cx="-40" cy="-30" r="12" fill="#ffffff" opacity="0.7"/>
    <circle cx="-40" cy="30" r="12" fill="#ffffff" opacity="0.7"/>
    <line x1="-28" y1="-22" x2="-14" y2="-6" stroke="#ffffff" stroke-width="4" opacity="0.6" stroke-linecap="round"/>
    <line x1="-28" y1="22" x2="-14" y2="6" stroke="#ffffff" stroke-width="4" opacity="0.6" stroke-linecap="round"/>
  </g>
</svg>`;

// Write SVG files
const svgFiles = {
  "icon.svg": mainIconSvg,
  "android-icon-foreground.svg": androidForegroundSvg,
  "android-icon-background.svg": androidBackgroundSvg,
  "android-icon-monochrome.svg": androidMonochromeSvg,
  "favicon.svg": faviconSvg,
  "splash-icon.svg": splashIconSvg,
};

for (const [filename, content] of Object.entries(svgFiles)) {
  writeFileSync(join(assetsDir, filename), content);
  console.log(`✓ Written ${filename}`);
}

// Convert SVG to PNG using available tool
function convertSvgToPng(svgPath, pngPath, width, height) {
  // Try rsvg-convert first, then inkscape, then convert (ImageMagick)
  const commands = [
    `rsvg-convert -w ${width} -h ${height} "${svgPath}" -o "${pngPath}"`,
    `inkscape --export-type=png --export-width=${width} --export-height=${height} --export-filename="${pngPath}" "${svgPath}"`,
    `convert -background none -resize ${width}x${height} "${svgPath}" "${pngPath}"`,
    `magick -background none -resize ${width}x${height} "${svgPath}" "${pngPath}"`,
  ];

  for (const cmd of commands) {
    try {
      execSync(cmd, { stdio: "pipe" });
      console.log(`✓ Converted ${svgPath} -> ${pngPath} (${width}x${height})`);
      return true;
    } catch {
      // Try next command
    }
  }
  console.error(`✗ Could not convert ${svgPath} to PNG. Install rsvg-convert, inkscape, or imagemagick.`);
  return false;
}

const conversions = [
  ["icon.svg", "icon.png", 1024, 1024],
  ["android-icon-foreground.svg", "android-icon-foreground.png", 1024, 1024],
  ["android-icon-background.svg", "android-icon-background.png", 1024, 1024],
  ["android-icon-monochrome.svg", "android-icon-monochrome.png", 1024, 1024],
  ["favicon.svg", "favicon.png", 64, 64],
  ["splash-icon.svg", "splash-icon.png", 512, 512],
];

let allConverted = true;
for (const [svgFile, pngFile, w, h] of conversions) {
  const ok = convertSvgToPng(join(assetsDir, svgFile), join(assetsDir, pngFile), w, h);
  if (!ok) allConverted = false;
}

if (allConverted) {
  console.log("\n✅ All icons generated successfully!");
} else {
  console.log("\n⚠️  Some icons could not be converted. Install rsvg-convert: sudo apt-get install librsvg2-bin");
}
