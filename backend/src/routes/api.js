const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

// Define API routes
router.post('/routes/interactive', routeController.getInteractiveRoute);
router.get('/haltes', routeController.getHaltes);

module.exports = router;
