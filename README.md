# Crawlio - Web Crawling & Scraping Service

A powerful, scalable web crawling and scraping service built with Node.js, similar to FireCrawl. Crawlio provides a robust API for extracting data from websites with JavaScript rendering support, subscription management, and enterprise-grade features.

## 🚀 Features

- **Advanced Web Crawling**: Full JavaScript rendering with Playwright
- **Flexible Data Extraction**: Extract text, links, images, meta tags, and structured data
- **Batch Processing**: Crawl multiple URLs concurrently
- **Screenshot Capture**: Take full-page or viewport screenshots
- **Caching System**: Redis-based caching for improved performance
- **Rate Limiting**: Configurable rate limiting and usage tracking
- **Subscription Management**: Stripe integration with multiple pricing tiers
- **API Key Authentication**: Secure API access with JWT and API keys
- **Usage Analytics**: Detailed usage tracking and statistics
- **Docker Support**: Complete containerization with Docker Compose
- **Scalable Architecture**: PostgreSQL for data persistence, Redis for caching

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Crawler       │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (Playwright)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   Redis         │    │   Stripe        │
│   (Database)    │    │   (Cache/Queue) │    │   (Billing)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)
- Stripe account (for billing)

## 🛠️ Installation

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/crawlio.git
   cd crawlio
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Verify installation**
   ```bash
   curl http://localhost:3000/health
   ```

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up databases**
   ```bash
   # Start PostgreSQL and Redis
   # Update DATABASE_URL and REDIS_URL in .env
   ```

3. **Run migrations**
   ```bash
   npm run migrate
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/crawlio
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AWS S3 Configuration (optional)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=crawlio-data

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Crawling Configuration
MAX_CONCURRENT_CRAWLS=10
CRAWL_TIMEOUT=30000
USER_AGENT=Mozilla/5.0 (compatible; Crawlio/1.0; +https://crawlio.com)
```

## 📚 API Documentation

### Authentication

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "first_name": "John",
  "last_name": "Doe"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Crawling

#### Single URL Crawl
```bash
POST /api/crawl/url
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "url": "https://example.com",
  "options": {
    "extractText": true,
    "extractLinks": true,
    "extractImages": true,
    "extractMeta": true,
    "screenshot": true,
    "waitUntil": "networkidle",
    "selectors": {
      "title": "h1",
      "content": ".content"
    }
  }
}
```

#### Batch Crawl
```bash
POST /api/crawl/batch
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "urls": [
    "https://example1.com",
    "https://example2.com",
    "https://example3.com"
  ],
  "options": {
    "concurrency": 5,
    "extractText": true,
    "extractLinks": true
  }
}
```

#### Using API Key
```bash
POST /api/crawl/url
X-API-Key: YOUR_API_KEY
Content-Type: application/json

{
  "url": "https://example.com"
}
```

### User Management

#### Get Profile
```bash
GET /api/user/profile
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get Usage Statistics
```bash
GET /api/user/usage
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get Crawl History
```bash
GET /api/crawl/history?page=1&limit=20
Authorization: Bearer YOUR_JWT_TOKEN
```

### Subscription Management

#### Get Available Plans
```bash
GET /api/subscription/plans
```

#### Create Checkout Session
```bash
POST /api/subscription/create-checkout-session
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "priceId": "price_starter_monthly"
}
```

## 💰 Pricing Plans

| Plan | Price | Monthly Requests | Features |
|------|-------|------------------|----------|
| Free | $0 | 1,000 | Basic crawling, API access, Email support |
| Starter | $29 | 10,000 | Advanced crawling, Priority support, Screenshots, Batch processing |
| Professional | $99 | 50,000 | All Starter features, Custom user agents, Concurrent crawling, Dedicated support |
| Enterprise | $299 | 200,000 | All Professional features, Custom integrations, SLA guarantee, Account manager |

## 🔒 Security Features

- JWT-based authentication
- API key authentication
- Rate limiting
- Input validation
- SQL injection protection
- CORS configuration
- Helmet.js security headers
- Request logging

## 📊 Monitoring & Logging

- Winston-based structured logging
- Request/response logging
- Error tracking
- Performance monitoring
- Health checks
- Usage analytics

## 🚀 Deployment

### Production Deployment

1. **Set up production environment**
   ```bash
   NODE_ENV=production
   # Configure all production environment variables
   ```

2. **Build and deploy with Docker**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Set up reverse proxy (Nginx)**
   ```bash
   # Configure SSL certificates
   # Set up load balancing if needed
   ```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crawlio
spec:
  replicas: 3
  selector:
    matchLabels:
      app: crawlio
  template:
    metadata:
      labels:
        app: crawlio
    spec:
      containers:
      - name: crawlio
        image: your-registry/crawlio:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        # Add other environment variables
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [https://docs.crawlio.com](https://docs.crawlio.com)
- **API Reference**: [https://api.crawlio.com/docs](https://api.crawlio.com/docs)
- **Issues**: [GitHub Issues](https://github.com/yourusername/crawlio/issues)
- **Email**: support@crawlio.com

## 🙏 Acknowledgments

- [Playwright](https://playwright.dev/) for browser automation
- [Cheerio](https://cheerio.js.org/) for HTML parsing
- [Stripe](https://stripe.com/) for payment processing
- [Express.js](https://expressjs.com/) for the web framework
- [PostgreSQL](https://www.postgresql.org/) for the database
- [Redis](https://redis.io/) for caching

---

**Crawlio** - Powerful web crawling made simple 🕷️
