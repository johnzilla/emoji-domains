# Emoji Domains Backend API

Backend API service for emoji domain availability checking and punycode conversion.

## 🚀 Quick Start

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Environment setup:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start development server:**
```bash
npm run dev
```

4. **Test the API:**
```bash
curl http://localhost:3001/health
```

## 📡 API Endpoints

### Health Check
```
GET /health
```
Returns server health status and uptime.

### Domain Availability
```
GET /api/domains/check/:domain
```
Check if a single domain is available.

**Example:**
```bash
curl "http://localhost:3001/api/domains/check/🏠.com"
```

### Bulk Domain Check
```
POST /api/domains/bulk-check
Content-Type: application/json

{
  "domains": ["🏠.com", "🚀.io", "💡.ai"]
}
```

### Domain Suggestions
```
GET /api/domains/suggest/:emoji
```
Get domain suggestions for a given emoji.

### Conversion Services
```
POST /api/conversion/emoji-to-punycode
POST /api/conversion/punycode-to-emoji
POST /api/conversion/bulk

Content-Type: application/json
{
  "input": "🏠🌟"
}
```

### Popular TLDs
```
GET /api/domains/popular-tlds
```
Get list of popular TLDs for emoji domains.

## 🔧 Configuration

Key environment variables:

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGINS` - Allowed CORS origins
- `RATE_LIMIT_MAX_REQUESTS` - Rate limit per IP

## 🏗️ Architecture

```
backend/
├── server.js              # Main server file
├── routes/
│   ├── domains.js         # Domain availability routes
│   └── conversion.js      # Conversion routes
├── middleware/            # Custom middleware
├── utils/                 # Utility functions
├── tests/                 # Test files
└── logs/                  # Log files
```

## 🔒 Security Features

- **Helmet.js** - Security headers
- **Rate limiting** - Prevent abuse
- **Input validation** - Sanitize all inputs
- **CORS protection** - Controlled cross-origin access
- **Error handling** - No information leakage

## 📊 Monitoring

- **Winston logging** - Structured logging
- **Health check endpoint** - Uptime monitoring
- **Error tracking** - Comprehensive error logs

## 🚀 Deployment

### Docker
```bash
npm run docker:build
npm run docker:run
```

### PM2
```bash
npm install pm2 -g
pm2 start server.js --name emoji-domains-api
```

### Environment Variables for Production
```bash
NODE_ENV=production
PORT=3001
CORS_ORIGINS=https://yourdomain.com
```

## 📝 Development

### Run Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Development with Auto-reload
```bash
npm run dev
```

## 🔄 Integration with Frontend

Update your React app's API calls to use this backend:

```javascript
// In your React components
const checkDomainAvailability = async (domain) => {
  const response = await fetch(`http://localhost:3001/api/domains/check/${domain}`);
  return response.json();
};
```

## 📈 Future Enhancements

- [ ] Database integration for caching results
- [ ] User authentication and API keys
- [ ] Registrar API integrations (Namecheap, GoDaddy)
- [ ] Domain registration functionality
- [ ] Payment processing
- [ ] Email notifications
- [ ] Analytics dashboard