/**
 * Middleware to handle card image fields
 * Removes imageFront/imageBack from body if files are uploaded
 * This prevents validator from validating URLs that won't be used
 */
export const handleCardImages = (req, res, next) => {
  if (req.files) {
    if (req.files.imageFront && req.files.imageFront[0]) {
      delete req.body.imageFront;
    }
    
    if (req.files.imageBack && req.files.imageBack[0]) {
      delete req.body.imageBack;
    }
  }
  
  next();
};

