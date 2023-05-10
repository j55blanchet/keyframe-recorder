# Keyframe Recorder

This is a simple tool to record keyframes from a video. It was designed to help
with identifying key poses in dance videos, but it can be used for any kind of
video.

## Approach

This is implemented in the simplest, most portable way possible. It uses vanilla
html / css / js, and runs entirely in the browser, with minimal dependencies.

You can access the tool at <https://julien.studio/keyframe-recorder/>.

## Usage

1. Upload the video you want to keyframe using the "choose file" button. Note: this is a purely client-side SPA app, so your video never leaves your computer.

    * Once you select the video, the first and last frame are automatically selected as keyframes.

2. Capture keyframes:

    * Use the video controls to navigate to the frame you want to keyframe.
    * *Recommended:* Pause the video.
    * *Optional:* Enter a name for the keyframe.
    * *Optional:* Use the dropdown to select an "importance" level (the meaning of this can be up to you.)
    * Click the "capture keyframe" button to capture the current frame as a keyframe.
    * Repeat this step for any keyframes you want to capture.

3. Save keyframes
    * Once you have captured all the keyframes you want, click the "Download Keyframes" button.
        * This will download a zip file containing a json file with the keyframe names & image paths, as well as images for each keyframe you captured.
    * You can also enter a name for the set of keyframes and click the "cache keyframes" button. This will save the keyframes into the localstorage of your browser. Note that this is not a permanent storage solution, and the keyframes will be lost if you clear your browser cache. They will also not be accessible to other browsers or devices.