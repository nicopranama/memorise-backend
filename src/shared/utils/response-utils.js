export const successResponse = (res, statusCode = 200, { message = 'Success', data = {} } = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (res, statusCode = 500, message = 'An error occurred', details = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(Object.keys(details).length > 0 && { details }),
  });
};

export const createdResponse = (res, message = 'Resource created', data = {}) => {
  return successResponse(res, 201, { message, data }); 
};

export const clientErrorResponse = (res, message = 'Bad request', errors = [], statusCode = 400) => {
  return errorResponse(res, statusCode, message, { errors });
};

export const unauthorizedResponse = (res, message = 'Unauthorized') => {
  return errorResponse(res, 401, message);
};

export const forbiddenResponse = (res, message = 'Forbidden') => {
  return errorResponse(res, 403, message);
};

export const notFoundResponse = (res, message = 'Not found') => {
  return errorResponse(res, 404, message);
};

export const serverErrorResponse = (res, error = null, message = 'Internal server error') => {
  const details = error && process.env.NODE_ENV === 'development' ? { error: error.message || error } : {};
  return errorResponse(res, 500, message, details);
};