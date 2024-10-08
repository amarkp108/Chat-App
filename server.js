const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Setup for multer to handle file uploads
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 } // 10MB limit
}).single('media'); // Accept only one file at a time

app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// Handle media uploads
app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(500).send('Error uploading file');
        }
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ fileUrl });
    });
});

// WebSockets for chat
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    // Handle chat message event
    socket.on('chat message', (data) => {
        // Emit message to everyone
        io.emit('chat message', { id: socket.id, msg: data.msg, msgId: data.msgId, senderId: socket.id });
    });

    // Handle seen event
    socket.on('seen', (data) => {
        // Notify the sender that their message was seen
        socket.to(data.senderId).emit('message seen', data.msgId);
    });

    socket.on('media', (media) => {
        io.emit('media', media); // Send media to everyone
    });
});

// Listen on port 3000 or any specified port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
