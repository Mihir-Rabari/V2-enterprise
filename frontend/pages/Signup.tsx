// Re-export the real Register component at the /signup route
// This keeps the existing router import (Signup) working while using real API auth
export { default } from './Register';
