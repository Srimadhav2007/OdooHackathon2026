const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        message: 'Authorization header required'
      });
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        message: 'Invalid authorization format'
      });
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET
    );

    req.user = payload;

    next();

  } catch (err) {
    if (
      err.name === 'JsonWebTokenError' ||
      err.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        message: 'Invalid or expired access token'
      });
    }

    next(err);
  }
}

module.exports = {
  authenticate
};