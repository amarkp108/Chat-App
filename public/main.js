const socket = io();
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-input');
const messages = document.getElementById('messages');

// Event listener for chat messages
form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (input.value) {
        const msgId = Date.now(); // Unique ID for the message
        const msgData = { msg: input.value, msgId: msgId };
        socket.emit('chat message', msgData); // Send the message with ID
        input.value = '';
    }
});

// Display incoming chat messages
socket.on('chat message', (data) => {
    const item = document.createElement('div');
    item.textContent = data.msg;

    // Determine if the message is from the current user or another user
    if (data.senderId === socket.id) {
        item.className = 'sent-message'; // Class for sent messages
        // Append a "seen" indicator placeholder for sent messages
        const seenIndicator = document.createElement('span');
        seenIndicator.className = 'seen-indicator';
        seenIndicator.textContent = 'Sent'; // Initial state
        item.appendChild(seenIndicator);
    } else {
        item.className = 'received-message'; // Class for received messages
        // Notify the sender that their message has been seen
        socket.emit('seen', { senderId: data.senderId, msgId: data.msgId });
    }

    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight; // Scroll to the bottom
});

// Display the "seen" status for messages
socket.on('message seen', (msgId) => {
    const messageElements = messages.children;
    for (let i = 0; i < messageElements.length; i++) {
        const msgElement = messageElements[i];
        if (msgElement.textContent.includes(msgId)) {
            const seenIndicator = msgElement.querySelector('.seen-indicator');
            if (seenIndicator) {
                seenIndicator.textContent = 'Seen'; // Update to "Seen"
            }
            break;
        }
    }
});

// Sending photo
const photoInput = document.getElementById('photo-input');
const photoBtn = document.getElementById('photo-btn');
photoBtn.addEventListener('click', () => {
    photoInput.click();
});
photoInput.addEventListener('change', () => {
    const file = photoInput.files[0];
    if (file) {
        sendMedia(file, 'image');
    }
});

// Sending video
const videoInput = document.getElementById('video-input');
const videoBtn = document.getElementById('video-btn');
videoBtn.addEventListener('click', () => {
    videoInput.click();
});
videoInput.addEventListener('change', () => {
    const file = videoInput.files[0];
    if (file) {
        sendMedia(file, 'video');
    }
});

// Recording and sending audio
const audioBtn = document.getElementById('audio-btn');
audioBtn.addEventListener('click', async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(mediaStream);
    const audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks);
        sendMedia(audioBlob, 'audio');
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds
});

// Function to send media to the server
function sendMedia(file, mediaType) {
    const formData = new FormData();
    formData.append('media', file, file.name || 'audio-recording.webm');

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Emit the media message to all connected clients
        socket.emit('media', { url: data.fileUrl, type: mediaType, senderId: socket.id });
    })
    .catch(error => console.error('Error uploading media:', error));
}

// Display incoming media messages
socket.on('media', (media) => {
    const item = document.createElement('div');
    if (media.type === 'image') {
        const img = document.createElement('img');
        img.src = media.url;
        img.style.maxWidth = '200px';
        item.appendChild(img);
    } else if (media.type === 'video') {
        const video = document.createElement('video');
        video.src = media.url;
        video.controls = true;
        video.style.maxWidth = '200px';
        item.appendChild(video);
    } else if (media.type === 'audio') {
        const audio = document.createElement('audio');
        audio.src = media.url;
        audio.controls = true;
        item.appendChild(audio);
    }
    item.className = 'media-message'; // Add a class for styling media messages
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight; // Scroll to the bottom
});
