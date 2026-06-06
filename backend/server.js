const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { printImage, printRawPdf, getAvailablePrinters } = require('./printer');

const app = express();
const port = 3001;

// Allow all origins and headers, specifically for ngrok
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));

// Setup multer for temporary file uploads
const uploadDir = path.join(__dirname, 'uploads');
const fs = require('fs');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

app.get('/api/printers', async (req, res) => {
    try {
        const printers = await getAvailablePrinters();
        res.json({ success: true, printers });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch printers' });
    }
});

app.post('/api/print', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        
        const colorMode = req.body.colorMode || 'color';
        const printerId = req.body.printerId || 'default';
        console.log(`Received file: ${req.file.path} with mimetype ${req.file.mimetype}, colorMode: ${colorMode}, printer: ${printerId}`);
        
        if (req.file.mimetype === 'application/pdf') {
            await printRawPdf(req.file.path, colorMode, printerId);
        } else {
            await printImage(req.file.path, colorMode, printerId);
        }
        
        res.json({ success: true, message: 'Print job sent successfully' });
    } catch (error) {
        console.error('Error handling print request:', error);
        res.status(500).json({ error: 'Failed to process print job', details: error.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Print backend server running at http://0.0.0.0:${port}`);
});
