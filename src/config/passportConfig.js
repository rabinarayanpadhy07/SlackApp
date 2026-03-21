import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import User from '../schema/user.js';
import { 
    GOOGLE_CALLBACK_URL, 
    GOOGLE_CLIENT_ID, 
    GOOGLE_CLIENT_SECRET} from './serverConfig.js';

passport.use(
    new GoogleStrategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: GOOGLE_CALLBACK_URL,
            passReqToCallback: true
        },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                // Check if user already exists
                let user = await User.findOne({ googleId: profile.id });
                if (user) {
                    return done(null, user);
                }

                // If not, check if user with same email exists
                user = await User.findOne({ email: profile.emails[0].value });
                if (user) {
                    // Update user with googleId
                    user.googleId = profile.id;
                    await user.save();
                    return done(null, user);
                }

                // If no user exists, create one
                const newUser = await User.create({
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    username: profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
                    isVerified: true // Google users are verified
                });

                return done(null, newUser);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

export default passport;
