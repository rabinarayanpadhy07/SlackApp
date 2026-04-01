import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const otplib = require('otplib');
console.log(Object.keys(otplib));
console.log('authenticator is:', typeof otplib.authenticator);
