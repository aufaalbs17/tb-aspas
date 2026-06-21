const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const authController = require('../controllers/authController');

// Auth routes (public)
router.post('/auth/login', authController.login);

// Define API routes
router.post('/routes/interactive', routeController.getInteractiveRoute);
router.get('/haltes', routeController.getHaltes);
// Protected CRUD routes (perlu JWT)
router.post('/haltes', authController.verifyToken, routeController.createHalte);
router.put('/haltes/:id', authController.verifyToken, routeController.updateHalte);
router.delete('/haltes/:id', authController.verifyToken, routeController.deleteHalte);

module.exports = router;
