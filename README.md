# 🐤 Flappy Bird

A feature-rich, high-performance HTML5 Canvas arcade game built with native high refresh rate support, Web Audio synth sound effects, particle effects, dynamic difficulty, skin customization, and a sleek custom blue-slate color palette (`#192145`, `#3F5FAE`, `#64A1D4`, `#92C9DF`, `#D8DDDD`).

## 🚀 Key Features

* **High Refresh Rate Native Engine**: Uses `requestAnimationFrame` with delta-time (`dt`) physics scaling to match any monitor refresh rate (60Hz, 120Hz, 144Hz, 240Hz, 360Hz+) while maintaining consistent physics speed.
* **Web Audio Synthesizer**: Zero-dependency retro sound effects (flap swoosh, point chime, star bonus sound, collision thud) synthesized in real time via the Web Audio API.
* **Refined Blue-Slate Aesthetics**: Custom 5-color palette featuring dark navy backgrounds, slate & sky blue pipes, ice blue glows, and silver highlights.
* **Collectibles & Score**: Floating star bonus items spawn in pipe gaps for extra points.
* **Skin Customization**: Choose between **Azure Bird**, **Golden Flapper**, and **Silver Wing**.
* **Difficulty Levels**: **Easy**, **Classic**, and **Hard** modes with adaptive gap sizes and scroll speeds.
* **Medals & High Scores**: Track best score in `localStorage` and earn Bronze, Silver, Gold, or Platinum medals.

## 🕹️ How to Play Locally

### Option 1: Open Directly in Browser (Easiest)
```powershell
Start-Process index.html
```

### Option 2: Run a Local Python Web Server
```powershell
python -m http.server 8000
```
Then visit `http://localhost:8000`.
