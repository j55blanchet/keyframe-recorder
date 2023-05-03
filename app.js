const videoFile = document.getElementById('videoFile');
const videoPlayer = document.getElementById('videoPlayer');
const playbackRate = document.getElementById('playbackRate');
const seekBackward = document.getElementById('seekBackward');
const seekForward = document.getElementById('seekForward');
const keyframeName = document.getElementById('keyframeName');
const keyframeLevel = document.getElementById('keyframeLevel');
const captureKeyframe = document.getElementById('captureKeyframe');
const saveKeyframesButton = document.getElementById('saveKeyframes');
const keyframesList = document.getElementById('keyframesList');
const downloadKeyframes = document.getElementById('downloadKeyframes');

let keyframes = [];
let currentLocalStorageKey = null;

function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9_\-]/gi, '_').replace(/_{2,}/g, '_').toLowerCase().substring(0, 255);
}

// Add this helper function in app.js
function waitForEvent(element, event) {
    return new Promise((resolve) => {
        element.addEventListener(event, resolve, { once: true });
    });
}

// Add this new function in app.js
async function loadKeyframesFromLocalStorageKey(key, setName) {
    const keyframesData = JSON.parse(localStorage.getItem(key));
    keyframes = [];

    for (const { name, level, timestamp } of keyframesData) {
        videoPlayer.currentTime = timestamp;
        await waitForEvent(videoPlayer, 'seeked');
        const imageCapture = await captureImage(videoPlayer);
        keyframes.push({ name, level, timestamp, imageCapture });
    }
    videoPlayer.currentTime = 0;

    keyframes.sort((a, b) => a.timestamp - b.timestamp);
    renderKeyframes();

    // Store the key of the loaded keyframes
    currentLocalStorageKey = key;

    const keyframeSetName = document.getElementById('keyframeSetName');
    keyframeSetName.value = setName;
}

// Replace the existing loadKeyframeListsFromStorage function in app.js with this updated version
function loadKeyframeListsFromStorage(videoFileName) {
    const videoFilename = sanitizeFilename(videoFileName);
    const localStorageKeys = Object.keys(localStorage).filter(key => key.startsWith(`keyframes|${videoFilename}|`));
    const cachedKeyframesList = document.getElementById('cachedKeyframesList');
    cachedKeyframesList.innerHTML = '';

    localStorageKeys.forEach(key => {
        const [_, __, setName, timestamp] = key.split('|');
        const item = document.createElement('button');
        item.textContent = `Load keyframes from ${setName} (${timestamp})`;
        item.addEventListener('click', () => loadKeyframesFromLocalStorageKey(key, setName));
        cachedKeyframesList.appendChild(item);
    });
}

// Add this event listener after initializing the DOM elements
videoFile.addEventListener('input', async (e) => {
    if (videoPlayer.src && !confirm('A video has already been loaded. Are you sure you want to load a new video?')) {
        e.target.value = ''; // Reset the input value
        return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const objectURL = URL.createObjectURL(file);
    videoPlayer.src = objectURL;
    keyframes = [];
    renderKeyframes();

    // Load matching keyframe lists from localStorage
    loadKeyframeListsFromStorage(file.name);
});

videoPlayer.addEventListener('timeupdate', () => {
    const minutes = Math.floor(videoPlayer.currentTime / 60);
    const seconds = videoPlayer.currentTime % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
    document.querySelectorAll(".currentTime").forEach(x => x.textContent = formattedTime)
});

playbackRate.addEventListener('change', () => {
    videoPlayer.playbackRate = parseFloat(playbackRate.value);
});

seekBackward.addEventListener('click', () => {
    videoPlayer.currentTime = Math.max(videoPlayer.currentTime - 1/30, 0);
});

seekForward.addEventListener('click', () => {
    videoPlayer.currentTime = Math.min(videoPlayer.currentTime + 1/30, videoPlayer.duration);
});

captureKeyframe.addEventListener('click', async () => {
    const name = keyframeName.value.trim();
    const level = parseInt(keyframeLevel.value, 10);
    const timestamp = videoPlayer.currentTime;

    // Check if there's already a keyframe at the current time
    const existingKeyframe = keyframes.find(keyframe => Math.abs(keyframe.timestamp - timestamp) < 0.01);
    if (existingKeyframe) {
        alert('A keyframe already exists at the current time.');
        return;
    }
    
    if (name === '' || isNaN(level)) {
        alert('Please provide a keyframe name and a valid level (1-7).');
        return;
    }

    const imageCapture = await captureImage(videoPlayer);

    keyframes.push({ name, level, timestamp: timestamp, imageCapture });
    keyframes.sort((a, b) => a.timestamp - b.timestamp);
    renderKeyframes();
});

keyframesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('deleteKeyframe')) {
        const index = parseInt(e.target.dataset.index, 10);
        keyframes.splice(index, 1);
        renderKeyframes();
    }
});

downloadKeyframes.addEventListener('click', async () => {
    const zip = new JSZip();
    const keyframeSetName = document.getElementById('keyframeSetName').value.trim() || 'unnamed_set';
    const videoFilename = sanitizeFilename(videoFile.files[0]?.name || 'unnamed_video');

    const keyframesData = [];

    for (const [index, keyframe] of keyframes.entries()) {
        const imgData = await fetch(keyframe.imageCapture).then((res) => res.blob());
        let imgName = sanitizeFilename(keyframe.name);
        imgName = `kf${index+1}-level${keyframe.level}-${imgName}.png`;
        zip.file(imgName, imgData, { base64: true });
        keyframesData.push({
            name: keyframe.name,
            level: keyframe.level,
            timestamp: keyframe.timestamp,
            image: imgName
        });
    }

    zip.file('keyframes.json', JSON.stringify(keyframesData));
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `${videoFilename}_${keyframeSetName}_keyframes.zip`;
    a.click();
});

function renderKeyframes() {
    keyframesList.innerHTML = '';
    keyframes.forEach((keyframe, index) => {
        const item = document.createElement('li');
        item.classList.add('keyframeItem');
        item.dataset.level = keyframe.level;
        item.innerHTML = `
            <strong>${keyframe.name}</strong> (Level: ${keyframe.level}, Time: ${keyframe.timestamp.toFixed(2)}s)<br>
            <img src="${keyframe.imageCapture}" alt="${keyframe.name}" width="160" height="90" style="margin-top: 4px;"><br>
            <button class="deleteKeyframe" data-index="${index}">Delete</button>
        `;
        keyframesList.appendChild(item);
    });
}

function captureImage(videoElement) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            resolve(URL.createObjectURL(blob));
        }, 'image/png');
    });
}

// Add this event listener after initializing the DOM elements
videoPlayer.addEventListener('loadedmetadata', async () => {
    // Capture "start" keyframe
    videoPlayer.currentTime = 0;
    await waitForEvent(videoPlayer, 'seeked');
    const startImageCapture = await captureImage(videoPlayer);
    keyframes.push({ name: 'start', level: 1, timestamp: 0, imageCapture: startImageCapture });

    // Capture "end" keyframe
    videoPlayer.currentTime = videoPlayer.duration;
    await waitForEvent(videoPlayer, 'seeked');

    const endImageCapture = await captureImage(videoPlayer);
    keyframes.push({ name: 'end', level: 1, timestamp: videoPlayer.duration, imageCapture: endImageCapture });

    // Reset video to the beginning
    videoPlayer.currentTime = 0;

    // Render keyframes
    renderKeyframes();
});

function saveKeyframesToLocalStorage() {
    const keyframeSetName = document.getElementById('keyframeSetName').value.trim() || 'unnamed_set';
    const videoFilename = sanitizeFilename(videoFile.files[0]?.name || 'unnamed_video');
    const key_timestamp = currentLocalStorageKey ? currentLocalStorageKey.split('_').pop() : new Date().toISOString().replace(/[:.]/g, '-');
    const key = currentLocalStorageKey || `keyframes|${videoFilename}|${keyframeSetName}|${key_timestamp}`;
    const keyframesData = keyframes.map(({ name, level, timestamp }) => ({ name, level, timestamp }));

    localStorage.setItem(key, JSON.stringify(keyframesData));
    // alert('Keyframes saved to localStorage.');

    // Re-render the cachedKeyframesList content
    loadKeyframeListsFromStorage(videoFilename);
}
saveKeyframesButton.addEventListener('click', saveKeyframesToLocalStorage);

