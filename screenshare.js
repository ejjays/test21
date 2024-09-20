const webcamVideo = document.getElementById('webcamVideo');
const screenShareIcon = document.getElementById('screen-share-icon');
let localStream = null; // Ensure that this is accessible
let isScreenSharing = false; // Track screen sharing state
let pc; // Peer connection from main.js (to be passed in)

// Function to initialize the peer connection
export function initPeerConnection(peerConnection) {
    pc = peerConnection;
}

// Function to start screen sharing
export async function startScreenShare() {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStream.getTracks().forEach(track => {
            // Remove current video track from the peer connection
            if (localStream) {
                localStream.getVideoTracks().forEach(videoTrack => {
                    pc.removeTrack(pc.getSenders().find(s => s.track === videoTrack));
                });
            }
            // Add the new screen share track
            pc.addTrack(track, screenStream);
        });

        webcamVideo.srcObject = screenStream; // Show screen share in local video box
        isScreenSharing = true;
        screenShareIcon.classList.add('active');
        screenShareIcon.classList.remove('fa-desktop');
        screenShareIcon.classList.add('fa-stop-circle'); // Change icon to indicate sharing is active

        // Listen for track ending to stop sharing
        screenStream.getTracks()[0].addEventListener('ended', stopScreenShare);
    } catch (error) {
        console.error("Error starting screen share:", error);
        alert("Screen sharing failed: " + error.message); // Show an alert with the error message
    }
}

// Function to stop screen sharing
export function stopScreenShare() {
    isScreenSharing = false;
    screenShareIcon.classList.remove('active');
    screenShareIcon.classList.remove('fa-stop-circle');
    screenShareIcon.classList.add('fa-desktop'); // Change icon back to desktop

    // Restore the original local video stream
    if (localStream) {
        webcamVideo.srcObject = localStream;
    }
}

// Add click event listener for screen sharing icon
screenShareIcon.onclick = () => {
    if (!isScreenSharing) {
        startScreenShare();
    } else {
        stopScreenShare();
    }
};

// Function to set the local stream
export function setLocalStream(stream) {
    localStream = stream;
}
