## Message APP backend

# ESLINT Setup

[ESLINT SETUP arctcles](https://medium.com/@sindhujad6/setting-up-eslint-and-prettier-in-a-node-js-project-f2577ee2126f)

## Google Authentication Integration

This backend now supports Google Sign-In via ID token verification.

### 1) Add environment variable

Set the Google OAuth web client id in your `.env`:

```bash
GOOGLE_CLIENT_ID=your_google_web_client_id
```

### 2) API endpoint

Use the following endpoint:

- `POST /api/v1/users/google`

Request body:

```json
{
  "idToken": "google_id_token_from_frontend"
}
```

### 3) Frontend flow

1. Integrate Google Sign-In in frontend using Google Identity Services.
2. Read the returned `credential` (ID token).
3. Send it to backend endpoint `/api/v1/users/google`.
4. Store returned JWT token from backend like normal sign-in.

### 4) Notes

- If user does not exist, backend auto-creates a user with `authProvider: "google"`.
- If email exists, backend links that user with Google.
- Email/password login is blocked for Google-only users and they should continue with Google.
