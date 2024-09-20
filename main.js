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

const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');
const videoIcon = document.getElementById('video-icon');
const micIcon = document.getElementById('mic-icon');

let isVideoOn = false;

function adjustVideoSizes() {
    const localVideoBox = document.querySelector('#localVideoBox');
    const remoteVideoBox = document.querySelector('#remoteVideoBox');

    // Check if remote stream is active
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

videoIcon.onclick = async () => {
    if (isVideoOn) {
        localStream.getVideoTracks().forEach(track => track.stop());
        webcamVideo.srcObject = null;
        videoIcon.classList.remove('active');
        videoIcon.classList.remove('fa-video');
        videoIcon.classList.add('fa-video-slash');
        isVideoOn = false; // Video is off
    } else {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        webcamVideo.srcObject = localStream;
        videoIcon.classList.add('active');
        videoIcon.classList.remove('fa-video-slash');
        videoIcon.classList.add('fa-video');
        isVideoOn = true; // Video is on
    }
    adjustVideoSizes(); // Adjust sizes after toggling video
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

// Create an offer
callButton.onclick = async () => {
    const callDoc = firestore.collection('calls').doc();
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    callInput.value = callDoc.id; // Set the call ID for the input field

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
            adjustVideoSizes(); // Adjust sizes after setting remote description
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
    const callId = callInput.value; // Get the call ID from input
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

    adjustVideoSizes(); // Adjust sizes after answering the call
};

// Handle remote track addition
pc.ontrack = (event) => {
    if (!remoteStream) {
        remoteStream = new MediaStream();
    }
    remoteStream.addTrack(event.track);
    document.getElementById('remoteVideo').srcObject = remoteStream;
    adjustVideoSizes(); // Adjust sizes when a remote track is added
};