import './styles.css';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { startScreenShare, stopScreenShare, setLocalStream, initPeerConnection } from './screenshare.js';

// Firebase configuration and initialization
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

const pc = new RTCPeerConnection(servers);
let localStream = null; // Local stream variable

const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');
const videoIcon = document.getElementById('video-icon');
const micIcon = document.getElementById('mic-icon');
const settingsIcon = document.getElementById('settings-icon');
const settingsPanel = document.getElementById('settings-panel');
const backButton = document.getElementById('back-button');

// Initialize peer connection in screenshare.js
initPeerConnection(pc);

// Set the local stream whenever it's initialized
setLocalStream(localStream);

let isVideoOn = false;

document.addEventListener('DOMContentLoaded', () => {
    // Event listeners for controls
    settingsIcon.addEventListener('click', () => {
        settingsPanel.classList.toggle('open');
    });

    backButton.addEventListener('click', () => {
        settingsPanel.classList.remove('open');
    });

    videoIcon.onclick = async () => {
        const localVideo = document.getElementById('webcamVideo');
        if (isVideoOn) {
            localStream.getVideoTracks().forEach(track => track.stop());
            localVideo.classList.add('hidden');
            videoIcon.classList.remove('active', 'fa-video');
            videoIcon.classList.add('fa-video-slash');
            isVideoOn = false;
        } else {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
            localVideo.srcObject = localStream;
            localVideo.classList.remove('hidden');
            videoIcon.classList.add('active', 'fa-video');
            videoIcon.classList.remove('fa-video-slash');
            isVideoOn = true;

            callButton.disabled = false;
        }

        setLocalStream(localStream); // Update the local stream in screenshare.js
        adjustVideoSizes();
    };

    micIcon.onclick = () => {
        if (!localStream) {
            console.error("Local stream is not initialized. Make sure to start the stream first.");
            return;
        }

        const audioTracks = localStream.getAudioTracks();
        micIcon.classList.toggle('active');
        if (micIcon.classList.contains('active')) {
            micIcon.classList.remove('fa-microphone');
            micIcon.classList.add('fa-microphone-slash');
            audioTracks.forEach(track => track.enabled = false);
        } else {
            micIcon.classList.remove('fa-microphone-slash');
            micIcon.classList.add('fa-microphone');
            audioTracks.forEach(track => track.enabled = true);
        }
    };
});

// Adjust video sizes based on remote stream presence
function adjustVideoSizes() {
    const localVideoBox = document.querySelector('#localVideoBox');
    const remoteVideoBox = document.querySelector('#remoteVideoBox');

    if (remoteStream && remoteStream.getTracks().length > 0) {
        localVideoBox.classList.remove('full-size');
        remoteVideoBox.classList.remove('hidden');
        remoteVideoBox.classList.remove('remote-size');
    } else {
        localVideoBox.classList.add('full-size');
        remoteVideoBox.classList.add('hidden');
        remoteVideoBox.classList.add('remote-size');
    }
}

// Create an offer
callButton.onclick = async () => {
    const callDoc = firestore.collection('calls').doc();
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    callInput.value = callDoc.id; 
    answerButton.disabled = false; 

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
            pc.setRemoteDescription(answerDescription)
                .then(() => {
                    console.log("Remote description set successfully.");
                    adjustVideoSizes();
                })
                .catch(error => console.error("Failed to set remote description:", error));
        }
    });

    answerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate)
                    .then(() => console.log("ICE candidate added successfully"))
                    .catch(error => console.error("Failed to add ICE candidate:", error));
            }
        });
    });

    hangupButton.disabled = false;
};

// Answer the call with the unique ID
answerButton.onclick = async () => {
    try {
        const callId = callInput.value; 
        const callDoc = firestore.collection('calls').doc(callId);
        const answerCandidates = callDoc.collection('answerCandidates');
        const offerCandidates = callDoc.collection('offerCandidates');

        pc.onicecandidate = (event) => {
            event.candidate && answerCandidates.add(event.candidate.toJSON());
        };

        const callData = (await callDoc.get()).data();

        if (!callData) {
            alert("No call data found for the given ID.");
            return;
        }

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
                    pc.addIceCandidate(new RTCIceCandidate(data))
                        .then(() => console.log("ICE candidate added successfully"))
                        .catch(error => console.error("Failed to add ICE candidate:", error));
                }
            });
        });

        adjustVideoSizes();
    } catch (error) {
        console.error("Error answering the call:", error);
    }
};

// Hang up the call
hangupButton.onclick = async () => {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null; 

    pc.close();

    const callId = callInput.value; 
    const callDoc = firestore.collection('calls').doc(callId);
    await callDoc.update({ remoteUserDisconnected: true }); 

    remoteVideo.srcObject = null; 
    document.getElementById('localVideoBox').classList.add('full-size'); 
    document.getElementById('remoteVideoBox').classList.add('hidden'); 

    hangupButton.disabled = true;
    callButton.disabled = false; 
    answerButton.disabled = true; 
};

// Listen for remote user disconnection
const callDoc = firestore.collection('calls').doc(callInput.value);
callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (data?.remoteUserDisconnected) {
        remoteVideo.srcObject = null; 
        document.getElementById('localVideoBox').classList.add('full-size'); 
        document.getElementById('remoteVideoBox').classList.add('hidden'); 
        hangupButton.disabled = true; 
        callButton.disabled = false; 
        answerButton.disabled = true; 
    }
});

// Handle remote track addition
pc.ontrack = (event) => {
    if (!remoteStream) {
        remoteStream = new MediaStream();
    }

    remoteStream.addTrack(event.track);
    document.getElementById('remoteVideo').srcObject = remoteStream;
    adjustVideoSizes(); 
};