import './styles.css';
import firebase from 'firebase/app';
import 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyB4BpQYfuGgom3VlUJONNR92weDC5BMJf0",
    authDomain: "fir-rtc-68de1.firebaseapp.com",
    projectId: "fir-rtc-68de1",
    storageBucket: "fir-rtc-68de1.appspot.com",
    messagingSenderId: "266450816523",
    appId: "1:266450816523:web:4259a31e69f908d792410e",
    measurementId: "G-XHC9DY0ZDX"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamVideo = document.getElementById('webcamVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const hangupButton = document.getElementById('hangupButton');
const videoIcon = document.getElementById('video-icon');
const micIcon = document.getElementById('mic-icon');
const micIcon2 = document.getElementById('mic-icon-2');
const screenShareIcon = document.getElementById('screen-share-icon');

// Request permissions for camera, audio, and screen sharing
const requestPermissions = async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        webcamVideo.srcObject = localStream;

        // Automatically enable the video icon after permissions are granted
        videoIcon.disabled = false;

    } catch (error) {
        console.error("Error accessing media devices.", error);
        alert("Could not access camera and microphone. Please check your permissions.");
    }
};

// Automatically request permissions when the page loads
window.onload = requestPermissions;

// Setup media sources when video icon is clicked
videoIcon.onclick = async () => {
    if (localStream) {
        // No need to request permissions again
        return;
    }

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        remoteStream = new MediaStream();

        localStream.getTracks().forEach((track) => {
            pc.addTrack(track, localStream);
        });

        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remoteStream.addTrack(track);
            });
        };

        webcamVideo.srcObject = localStream;
        remoteVideo.srcObject = remoteStream;

        callButton.disabled = false;
        answerButton.disabled = false;
        videoIcon.disabled = true; // Disable video icon after starting webcam
    } catch (error) {
        console.error("Error accessing media devices.", error);
        alert("Could not access camera and microphone. Please check your permissions.");
    }
};

// Mute/Unmute functionality
let isMuted = false;

micIcon.onclick = () => {
    isMuted = !isMuted;
    localStream.getAudioTracks()[0].enabled = !isMuted;

    if (isMuted) {
        micIcon.classList.remove('fa-microphone');
        micIcon.classList.add('fa-microphone-slash');
        micIcon2.classList.remove('fa-microphone');
        micIcon2.classList.add('fa-microphone-slash');
    } else {
        micIcon.classList.remove('fa-microphone-slash');
        micIcon.classList.add('fa-microphone');
        micIcon2.classList.remove('fa-microphone-slash');
        micIcon2.classList.add('fa-microphone');
    }
};

// Screen share functionality
screenShareIcon.onclick = async () => {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStream.getTracks().forEach((track) => {
            pc.addTrack(track, screenStream);
        });

        const remoteStream = new MediaStream();
        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remoteStream.addTrack(track);
            });
        };
        
        remoteVideo.srcObject = remoteStream;
    } catch (error) {
        console.error("Error accessing screen sharing.", error);
        alert("Could not access screen sharing. Please check your permissions.");
    }
};

// Create an offer
callButton.onclick = async () => {
    const callDoc = firestore.collection('calls').doc();
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    callInput.value = callDoc.id;

    pc.onicecandidate = (event) => {
        event.candidate && offerCandidates.add(event.candidate.toJSON());
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
    };

    await callDoc.set({ offer });

    callDoc.onSnapshot((snapshot) => {
        const data = snapshot.data();
        if (!pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDescription);
        }
    });

    answerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate);
            }
        });
    });

    hangupButton.disabled = false;
};

// Answer the call with the unique ID
answerButton.onclick = async () => {
    const callId = callInput.value;
    const callDoc = firestore.collection('calls').doc(callId);
    const answerCandidates = callDoc.collection('answerCandidates');
    const offerCandidates = callDoc.collection('offerCandidates');

    pc.onicecandidate = (event) => {
        event.candidate && answerCandidates.add(event.candidate.toJSON());
    };

    const callData = (await callDoc.get()).data();
    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
    };

    await callDoc.update({ answer });

    offerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                let data = change.doc.data();
                pc.addIceCandidate(new RTCIceCandidate(data));
            }
        });
    });
};