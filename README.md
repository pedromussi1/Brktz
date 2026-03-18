# Brktz

A tournament-style bracket quiz platform. Create, play, and share bracket quizzes across categories like K-Pop, Gaming, Anime, Entertainment, Food, and more. Players narrow down choices round by round until a champion emerges.

**[Live Demo](https://brktz-production.up.railway.app/)**

## Features

- **Tournament Brackets** — Play quizzes in a bracket/elimination format, picking favorites each round until one champion remains
- **Quiz Creation** — Create custom bracket quizzes with images, videos, or text items
- **Categories** — Browse quizzes by K-Pop, Gaming, Entertainment, Food, Anime, and more
- **Leaderboards** — Track which items win the most tournaments with champion statistics
- **Social Features** — Like, bookmark, and comment on quizzes
- **User Profiles** — Public profiles with quiz history and created quizzes
- **Search** — Search across quizzes, creators, and categories
- **User Authentication** — Sign up and sign in with optional email verification
- **Admin System** — Admin moderation and management tools
- **File Uploads** — Upload custom images and thumbnails for quiz items
- **Contact Form** — Built-in messaging for user feedback
- **Dark Mode** — Built-in dark theme UI

## Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Express.js
- **Database:** SQLite3 (better-sqlite3 with WAL mode)
- **Authentication:** JWT + bcrypt password hashing
- **Security:** Helmet, CORS, express-rate-limit
- **File Uploads:** Multer
- **Email:** Nodemailer for verification and contact forms
- **Deployment:** Railway

## Run Locally

```bash
npm install
npm start
```

The server starts on [http://localhost:3000](http://localhost:3000) by default.

Create a `.env` file for optional configuration:

```
JWT_SECRET=your-secret-key
SMTP_HOST=smtp.example.com
SMTP_USER=user@example.com
SMTP_PASS=password
ADMIN_EMAIL=admin@example.com
```

## Deploy

Configured for [Railway](https://railway.app/) deployment with the included `Procfile` and `railway.json`.

## License

MIT
