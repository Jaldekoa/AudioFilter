# Audio Filter - Chrome Extension

![Audio Filter Preview](screenshots/audio-filter-preview.png "Preview")

## Overview

Audio Filter is a lightweight Chrome extension that allows users to apply audio processing to all audio sources played in the browser. It's particularly useful for late-night browsing, for users who are sensitive to high-frequency sounds, or for those who want to adjust the stereo balance of their audio.

By applying a low-pass filter and stereo panning, the extension can reduce the intensity of high-frequency sounds while also allowing users to adjust the stereo balance, resulting in a more comfortable and customizable listening experience.

## Features

- **Simple Toggle On/Off**: Easily enable or disable the audio filter with a single click
- **Adjustable Cutoff Frequency**: Fine-tune the filter by adjusting the cutoff frequency (from 20 Hz to 20 kHz)
- **Stereo Panning Control**: Adjust the stereo balance of the audio output
- **Real-time Filtering**: Changes apply instantly to all audio and video elements on all tabs
- **Persistent Settings**: Your preferences are saved and applied across browser sessions
- **Low Resource Impact**: Minimal performance impact through efficient audio processing
- **Robust Error Handling**: Graceful recovery from audio processing errors
- **Dynamic Media Support**: Automatically handles dynamically added media elements
- **Fullscreen Mode Support**: Seamless operation in fullscreen mode
- **Cross-Tab Synchronization**: Consistent audio processing across all open tabs

## Installation

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" at the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension is now installed and ready to use

## Usage

1. Click on the Audio Filter icon in your Chrome toolbar to open the popup interface
2. Toggle the switch to enable or disable the filter
3. Use the frequency slider to adjust the cutoff frequency:
   - Lower values (left): Only very low frequencies pass through
   - Higher values (right): Most frequencies pass through
   - Recommended starting point: Around 2000 Hz for a balanced effect
4. Use the pan slider to adjust stereo balance:
   - Center (0): Normal stereo balance
   - Left (-100): Audio shifts to left channel
   - Right (100): Audio shifts to right channel

## How It Works

Audio Filter uses the Web Audio API to create a biquad filter (low-pass filter) and a stereo panner, applying them to all `<audio>` and `<video>` elements on the page. The extension:

1. Intercepts audio output from media elements
2. Routes the audio through a biquad filter node and stereo panner
3. Adjusts the filter's cutoff frequency and pan position based on user settings
4. Delivers the processed audio to the output destination
5. Handles dynamic media elements and state changes automatically

## Technical Details

- Built with vanilla JavaScript
- Uses Chrome's storage API for saving preferences
- Implements the Web Audio API for audio processing
- Runs content scripts that dynamically modify the audio context on each page
- Uses background service worker for cross-tab communication
- Implements robust error handling and recovery mechanisms
- Supports dynamic media element detection and processing
- Handles fullscreen mode transitions seamlessly

## Project Structure

```
audio-filter/
├── background.js      # Background service worker for message handling
├── content.js         # Content script that applies filter to web page audio
├── popup.html         # Extension popup interface markup
├── popup.css          # Styling for the popup interface
├── popup.js           # Logic for the popup UI and user interactions
├── manifest.json      # Extension configuration and permissions
└── icons/             # Extension icons in various sizes
    └── icon128.png    # Primary extension icon
```

## Browser Compatibility

This extension is designed for Chromium-based browsers:
- Google Chrome 88+ (for best Web Audio API support)
- Microsoft Edge 88+ (Chromium-based)
- Brave, Opera, and other Chromium browsers

## Privacy

Audio Filter respects your privacy:
- No data is collected or transmitted
- All processing happens locally in your browser
- No external dependencies or third-party services
- No permissions requested beyond what's necessary for functionality
- No tracking or analytics

## Known Limitations

- Audio processing is applied per-tab
- Some websites may have their own audio processing that could interact with the filter
- Very low cutoff frequencies might affect speech intelligibility
- Extreme pan settings might make some content harder to understand

## Contributing

Contributions are welcome! If you'd like to improve Audio Filter:

1. Fork this repository
2. Create a new branch for your feature (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
