const settingsIcon = document.getElementById('settings-icon');
const settingsPanel = document.getElementById('settings-panel');
const backButton = document.getElementById('back-button');
const micIcon = document.getElementById('mic-icon');
const videoIcon = document.getElementById('video-icon');
const user1Video = document.getElementById('webcamVideo'); // Your video
const user2Video = document.getElementById('remoteVideo'); // Placeholder for User 2

// UI and control logic
settingsIcon.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
});

backButton.addEventListener('click', () => {
    settingsPanel.classList.remove('open');
});

// Toggle mic icon
micIcon.addEventListener('click', () => {
    micIcon.classList.toggle('active'); // Toggles the active class
    if (micIcon.classList.contains('active')) {
        micIcon.classList.remove('fa-microphone'); // Change to muted icon
        micIcon.classList.add('fa-microphone-slash');
        // Optionally mute the audio track
        const audioTracks = localStream.getAudioTracks();
        audioTracks.forEach(track => track.enabled = false);
    } else {
        micIcon.classList.remove('fa-microphone-slash'); // Change back to unmuted icon
        micIcon.classList.add('fa-microphone');
        // Optionally unmute the audio track
        const audioTracks = localStream.getAudioTracks();
        audioTracks.forEach(track => track.enabled = true);
    }
});

// Toggle video icon
videoIcon.addEventListener('click', () => {
    videoIcon.classList.toggle('active'); // Toggles the active class
    if (videoIcon.classList.contains('active')) {
        videoIcon.classList.remove('fa-video'); // Change to video off icon
        videoIcon.classList.add('fa-video-slash');
    } else {
        videoIcon.classList.remove('fa-video-slash'); // Change back to video on icon
        videoIcon.classList.add('fa-video');
    }
});