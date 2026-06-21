const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const path = require('path');

// Serve frontend public static files safely
app.use('/public', express.static(path.join(__dirname, '../../frontend/public')));

// Explicitly serve specific files from frontend root
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/index.html')));
app.get('/map', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/map.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/admin.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/login.html')));
app.get('/service-worker.js', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/service-worker.js')));
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/manifest.json')));

// Routes
app.use('/api', apiRoutes);

module.exports = app;
