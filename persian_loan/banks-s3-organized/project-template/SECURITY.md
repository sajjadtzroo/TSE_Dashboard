# Security Configuration

## Environment Variables

### Development Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

2. Update the `.env` files with your secure credentials:
   - **NEVER** commit `.env` files to version control
   - Use strong, unique passwords
   - Rotate credentials regularly

### Production Setup

For production deployment, set environment variables through your hosting platform's secure configuration system (NOT in `.env` files):

```bash
MONGO_USERNAME=your_secure_username
MONGO_PASSWORD=your_secure_password_here
DATABASE_NAME=iranian_banks
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
VITE_API_URL=https://api.yourdomain.com
```

## CORS Configuration

The application uses explicit CORS origins for security:

- **Development**: `http://localhost:5173,http://localhost:3000`
- **Production**: Add your actual domain to `CORS_ORIGINS`
- **Codespaces/GitHub**: Automatically supports `*.app.github.dev` and `*.github.dev` via regex

### ⚠️ Never use `CORS_ORIGINS=*` in production

## Docker Compose Security

The application requires explicit environment variables:

```bash
# Development
MONGO_PASSWORD=your_password docker-compose up

# Production (all required)
MONGO_USERNAME=admin \
MONGO_PASSWORD=secure_password \
VITE_API_URL=https://api.yourdomain.com \
CORS_ORIGINS=https://yourdomain.com \
docker-compose -f docker-compose.prod.yml up
```

## Credential Rotation

1. Update `.env` files (never commit them)
2. Restart services:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Security Checklist

- [ ] `.env` files are in `.gitignore`
- [ ] No hardcoded credentials in source code
- [ ] CORS configured with explicit origins
- [ ] MongoDB password is strong (16+ characters)
- [ ] Environment variables set through secure config (not files) in production
- [ ] Regular credential rotation schedule
