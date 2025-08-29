import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from './index.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Passport configuration for Google OAuth 2.0
 * Handles user authentication via Google OAuth
 */

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    logger.error('Error deserializing user:', error);
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        logger.info(`Google OAuth attempt for user: ${profile.emails[0].value}`);

        // Check if user already exists
        let user = await User.findOne({
          $or: [
            { googleId: profile.id },
            { email: profile.emails[0].value }
          ]
        });

        if (user) {
          // Update existing user with Google ID if not present
          if (!user.googleId) {
            user.googleId = profile.id;
            user.isVerified = true;
            await user.save();
          }
          
          logger.info(`Existing user logged in: ${user.email}`);
          return done(null, user);
        }

        // Create new user
        user = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          avatar: profile.photos[0]?.value,
          isVerified: true,
          provider: 'google',
          role: 'user', // Default role
        });

        await user.save();
        logger.info(`New user created via Google OAuth: ${user.email}`);
        
        return done(null, user);
      } catch (error) {
        logger.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

export default passport;
