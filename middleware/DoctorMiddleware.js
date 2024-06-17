const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware for handling authorization of "doctor" role
const DoctorMiddleware = (req, res, next) => {
  try {
    // Extract the token from the request headers
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

    if (!token) {
      // If token is not provided, return an error response
      console.log('Authorization failed. Token not provided.');
      return res.status(401).json({ message: 'Authorization failed: Token not provided' });
    }
    
    // Verify the token using the JWT_KEY from the environment variables
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);

    console.log('Decoded Token:', decodedToken);

    // Check if the decoded token has the "doctor" role
    if (decodedToken.roles && (decodedToken.roles.includes('doctor') || decodedToken.roles.includes('patient')|| decodedToken.roles.includes('secretary')  )) {
      // If the user has the "doctor" role, set user details in the request and proceed to the next middleware or route handler
      req.user = {
        username: decodedToken.username,
        _id: decodedToken._id,
        roles: decodedToken.roles
      };

      console.log('Authorization successful.');
      next(); // Proceed to the next middleware or route handler
    } else {
      // If the user does not have the "doctor" role, return an error response
      console.log('Authorization failed. User does not have the "doctor"  or "patient" or "secretary" role');
      return res.status(401).json({ message: 'Authorization failed: Only doctors or patients or secretaries are allowed' });
    }
  } catch (err) {
    console.error('Error during token verification:', err.message);

    if (err.name === 'TokenExpiredError') {
      // Handle the case where the token has expired
      return res.status(401).json({ message: 'Token expired' });
    } else if (err.name === 'JsonWebTokenError') {
      // Handle the case where the token is invalid
      return res.status(401).json({ message: 'Invalid token' });
    } else {
      // Handle other authentication errors
      console.error('Authentication failed:', err);
      return res.status(401).json({ message: 'Authentication failed' });
    }
  }
};

module.exports = { DoctorMiddleware };
