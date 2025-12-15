# Hono + Better Auth + SQLite

A complete authentication system built with **Hono**, **Better Auth**, and **SQLite** on the **Bun** runtime.

## Features

- ✅ User registration (signup)
- ✅ User login with email/password
- ✅ Session management
- ✅ Logout functionality
- ✅ Get current user endpoint
- ✅ SQLite database with Better Auth
- ✅ TypeScript support

## Project Structure

```
src/
  lib/
    db.ts              # SQLite database connection
    better-auth.ts     # Better Auth configuration
  routes/
    auth.ts            # Authentication routes
  index.ts             # Server entrypoint
.env                   # Environment variables
```

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Create or update `.env` file with your configuration:

```env
# Generate a secure secret: openssl rand -base64 32
AUTH_SECRET=your-super-secret-key-min-32-characters-long-change-this

# SQLite database file path
DATABASE_URL=./auth.db

# App configuration
PORT=3000
BETTER_AUTH_URL=http://localhost:3000
```

**Important**: Change `AUTH_SECRET` to a secure random string (minimum 32 characters).

### 3. Start the Development Server

```bash
bun run dev
```

The server will start at `http://localhost:3000`

## API Endpoints

### 1. **Signup** - Create a new user

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "John Doe"
  }'
```

**Response:**

```json
{
  "message": "User created successfully",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false
  }
}
```

### 2. **Login** - Authenticate user

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

**Response:**

```json
{
  "message": "Login successful",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "..."
}
```

**Note**: Save the `token` from the response for authenticated requests.

### 3. **Get Current User** - Retrieve authenticated user info

```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Cookie: YOUR_COOKIE_HERE"
```

**Response:**

```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "userId": "...",
    "expiresAt": "..."
  }
}
```

### 4. **Logout** - End user session

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Cookie: YOUR_COOKIE_HERE"
```

**Response:**

```json
{
  "message": "Logout successful"
}
```

## Testing the Authentication Flow

### Complete Test Sequence

```bash
# 1. Create a new user
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# 2. Login (save the token from response)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -c cookies.txt

# 3. Get current user (use token or cookies from login)
curl -X GET http://localhost:3000/auth/me \
  -b cookies.txt

# 4. Logout
curl -X POST http://localhost:3000/auth/logout \
  -b cookies.txt
```

## Database

Better Auth automatically creates and manages the following tables in SQLite:

- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth accounts (if configured)
- `verification` - Email verification tokens

The database file will be created at the path specified in `DATABASE_URL` (default: `./auth.db`).

## Development

### Technologies Used

- **Bun** - Fast JavaScript runtime
- **Hono** - Lightweight web framework
- **Better Auth** - Authentication library
- **SQLite** - Embedded database
- **TypeScript** - Type safety

### Scripts

- `bun run dev` - Start development server with hot reload
- `bun run src/index.ts` - Start production server

## Security Notes

1. **Always change `AUTH_SECRET`** in production to a secure random string
2. Enable HTTPS in production
3. Consider enabling `requireEmailVerification` for production use
4. Review CORS settings for your specific deployment
5. The SQLite database file should be backed up regularly

## License

MIT

open http://localhost:3000
