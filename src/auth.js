import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { collections } from './schema.js';

export function setupPassport() {
  passport.serializeUser((user, done) => {
    done(null, {
      id: user._id?.toString?.() || user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    });
  });

  // Przy każdym żądaniu pobieramy świeży dokument użytkownika, żeby zmiany roli
  // / przypisanego kierownika (panel „Użytkownicy") działały bez ponownego logowania.
  passport.deserializeUser(async (sessionUser, done) => {
    try {
      const { getDb } = await import('./db.js');
      const db = await getDb();
      const fresh = await db.collection(collections.users).findOne({ email: sessionUser.email });
      done(null, fresh || sessionUser);
    } catch (err) {
      done(null, sessionUser);
    }
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const fullName = profile.displayName || 'Użytkownik';
          const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;

          if (!email) {
            return done(new Error('Brak maila z Google'));
          }

          if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
            return done(new Error('Ten mail nie należy do dozwolonej domeny firmowej'));
          }

          const { getDb } = await import('./db.js');
          const db = await getDb();

          const existingUser = await db.collection(collections.users).findOne({ email });

          let role = existingUser?.role || 'user';

          // Bootstrapowy admin; pozostałe role (manager) nadaje admin w panelu „Użytkownicy".
          if (email === `k.woch@${allowedDomain}`) {
            role = 'admin';
          }

          const update = {
            $set: {
              email,
              fullName,
              role,
              isActive: true,
              googleId: profile.id,
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          };

          await db.collection(collections.users).updateOne(
            { email },
            update,
            { upsert: true }
          );

          const user = await db.collection(collections.users).findOne({ email });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  return passport;
}

export function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({ message: 'Brak autoryzacji' });
}

export function requireAdmin(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }

  return res.status(403).json({ message: 'Brak uprawnień administratora' });
}

export function requireManager(req, res, next) {
  const role = req.user?.role;
  if (req.isAuthenticated && req.isAuthenticated() && (role === 'manager' || role === 'admin')) {
    return next();
  }

  return res.status(403).json({ message: 'Brak uprawnień kierownika' });
}