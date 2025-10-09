const express = require('express');
const router = express.Router();

const authRoutes = require('./auth/auth.route');
const userRoutes = require('./user/user.route');
const fileRoutes = require('./file/file.route');
const processRoutes = require('./process/process.route');

// All auth-related routes will be prefixed with /auth
router.use('/auth', authRoutes);

// All user-related routes will be prefixed with /users
router.use('/user', userRoutes);

// ALL file-related routes will be prefixed with /file
router.use('/file', fileRoutes);

// ALL process-file-related routes will be prefixed with /process
router.use('/process', processRoutes);

module.exports = router;