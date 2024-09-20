const settingsIcon = document.getElementById('settings-icon');
const settingsPanel = document.getElementById('settings-panel');
const backButton = document.getElementById('back-button');
const micIcon = document.getElementById('mic-icon');
const videoIcon = document.getElementById('video-icon');

settingsIcon.addEventListener('click', () => {
    console.log("Settings icon clicked"); // Debugging line
    settingsPanel.classList.toggle('open');
});

backButton.addEventListener('click', () => {
    settingsPanel.classList.remove('open');
});

// Toggle mic icon
micIcon.addEventListener('click', () => {
    micIcon.classList.toggle('active');
    if (micIcon.classList.contains('active')) {
        micIcon.classList.remove('fa-microphone');
        micIcon.classList.add('fa-microphone-slash');
    } else {
        micIcon.classList.remove('fa-microphone-slash');
        micIcon.classList.add('fa-microphone');
    }
});

// Toggle video icon
videoIcon.addEventListener('click', () => {
    videoIcon.classList.toggle('active');
    if (videoIcon.classList.contains('active')) {
        videoIcon.classList.remove('fa-video');
        videoIcon.classList.add('fa-video-slash');
    } else {
        videoIcon.classList.remove('fa-video-slash');
        videoIcon.classList.add('fa-video');
    }
});