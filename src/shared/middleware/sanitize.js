import mongoSanitize from 'express-mongo-sanitize';

const sanitize = mongoSanitize.sanitize;

export const sanitizeRequest = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      sanitize(req.body);
    }

    if (req.params && typeof req.params === 'object') {
      sanitize(req.params);
    }

    if (req.query && typeof req.query === 'object') {
      Object.keys(req.query).forEach((key) => {
        if (/\$/.test(key) || /\./.test(key)) {
          delete req.query[key];
        }
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};
