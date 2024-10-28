import express, {Request, Response} from 'express';
import session from 'express-session';
import passport from 'passport';
import {Profile, Strategy as OpenIDConnectStrategy, VerifyCallback} from 'passport-openidconnect';
import moment from "moment";
import path from "node:path";
import FileStreamRotator from "file-stream-rotator/lib/FileStreamRotator";
import morgan from 'morgan';

import compression from 'compression';
import useragent from 'express-useragent';
import cors from 'cors';

const app = express();

app.use(compression())
app.use(useragent.express())
app.use(cors({origin: '*'}))
app.use(express.json())

let user: any

app.use(
  session({
    secret: 'hansheng',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const baseUrl = 'https://devlogin.redone.com.my/OneLoginHost/core';
const clientId = 'redcash2.web';
const clientSecret = 'MCU84XNYTP5SA9OOS9I1';
const redirectUri = 'https://uat-cep-redcash-2.arkmind-dev.com/redCash/api/v1.0/partner/sso/redirect';
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
      responseMode: 'query',
    },
    (
      issuer: string,
      profile: Profile,
      cb: VerifyCallback
    ) => {
      console.log('profile', profile);
      console.log('issuer', issuer);
      user = profile;
      return cb(null, profile);
    }
  )
);

passport.serializeUser((user: any, done) => {
  console.log('serializeUser', user);
  done(null, user);
});

passport.deserializeUser((obj: any, done) => {
  console.log('deserializeUser', obj);
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
function isAuthenticated(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth');
}

// Protected route
app.get('/', isAuthenticated, (req: any, res) => {
  res.json({
    user: req?.user?.profile,
    accessToken: req?.user?.accessToken,
  });
});

app.get('/profile', isAuthenticated, (req, res) => {
  res.json({
    message: req.user,
  });
});
const logStream = FileStreamRotator.getStream({
  filename: path.join('logs', '%DATE%.log'),
  frequency: 'daily',
  verbose: false,
  date_format: 'YYYY-MM-DD',
});
morgan.token("body", (req: Request, res: Response) => JSON.stringify(req.body));
morgan.token("malaysiaTimezone", (req: Request, res: Response) =>
  moment().format("YYYY-MM-DD, HH:mm:ss")
);
const loggingFormat =
  ":malaysiaTimezone :remote-addr :method :url :status :body";
app.use(morgan(loggingFormat));
app.use(
  morgan(loggingFormat, {
    stream: logStream,
  })
);

// Override console.log to write into the same log file
const originalConsoleLog = console.log;
console.log = function (...args: any[]) {
  originalConsoleLog(...args); // Keep default behavior (console output)
  const logMessage = args
    .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
    .join(' ');
  logStream.write(
    `${moment().format('YYYY-MM-DD, HH:mm:ss')} - LOG: ${logMessage}\n`
  );
};

// Override console.error to log into a file
const errorLogStream = FileStreamRotator.getStream({
  filename: path.join('logs', '%DATE%-error.log'),
  frequency: 'daily',
  verbose: false,
  date_format: 'YYYY-MM-DD',
});
const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  originalConsoleError(...args); // Keep default behavior (console output)
  const logMessage = args
    .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
    .join(" ");
  errorLogStream.write(
    `${moment().format("YYYY-MM-DD, HH:mm:ss")} - ERROR: ${logMessage}\n`
  );
};

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
