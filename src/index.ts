import express from 'express';
import session from 'express-session';
import passport from 'passport';
import {Profile, Strategy as OpenIDConnectStrategy, VerifyCallback} from 'passport-openidconnect';

const app = express();

app.use(
  session({
    secret: 'your-session-secret', // Replace with a secure random string
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const baseUrl = 'https://devlogin.redone.com.my/OneLoginHost/core';
const clientId = 'redcash2.web';
const clientSecret = 'WZMNES9MZWDR7KEABM7A';
const redirectUri = 'https://uat-cep-redcash.arkmind-dev.com/redCash/api/v1.0/partner/sso/redirect';
const defaultScopes = 'openid profile';
const issuerHost = baseUrl;

passport.use(
  'oidc',
  new OpenIDConnectStrategy(
    {
      issuer: issuerHost,
      authorizationURL: `${baseUrl}/connect/authorize`,
      tokenURL: `${baseUrl}/connect/token`,
      userInfoURL: `${baseUrl}/connect/userinfo`,
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: redirectUri,
      scope: defaultScopes,
    },
    (
      issuer: string,
      profile: Profile,
      cb: VerifyCallback
    ) => {
      // Store user and tokens in session
      // req.session.user = profile;
      // req.session.accessToken = accessToken;
      // req.session.refreshToken = refreshToken;
      console.log('profile', profile);
      console.log('issuer', issuer);
      return cb(null, profile);
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((obj: any, done) => {
  done(null, obj);
});

// Route to initiate authentication
app.get('/auth', passport.authenticate('oidc'));

// Callback route
app.get(
  '/callback',
  passport.authenticate('oidc', {
    successRedirect: '/',
    failureRedirect: '/auth/error',
  })
);

// Error route
app.get('/auth/error', (req, res) => {
  res.send('Authentication Error');
});

// Middleware to check authentication
function isAuthenticated(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth');
}

// Protected route
app.get('/', isAuthenticated, (req, res) => {
  res.send(`Hello!`);
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
