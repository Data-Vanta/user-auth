// src/middlewares/upload.js
const multer = require('multer');
const path = require('path');

/**
 * Creates a multer middleware with custom options for file type and size.
 * @param {object} options - Configuration for the middleware.
 * @param {string[]} options.allowedMimeTypes - An array of allowed MIME types (e.g., ['image/jpeg', 'image/png']).
 * @param {number} options.maxSize - The maximum file size in bytes.
 * @returns {multer} - A configured multer instance.
 */
const createUploadMiddleware = (options) => {
  // Set up storage for uploaded files
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      // Generate a unique filename
      cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
  });

  // Dynamic file filter based on provided options
  const fileFilter = (req, file, cb) => {
    if (options.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const allowedTypes = options.allowedMimeTypes.join(', ');
      cb(new Error(`Invalid file type. Only ${allowedTypes} are allowed.`), false);
    }
  };

  // Return the configured multer instance
  return multer({
    storage,
    limits: {
      fileSize: options.maxSize
    },
    fileFilter
  });
};

module.exports = createUploadMiddleware;