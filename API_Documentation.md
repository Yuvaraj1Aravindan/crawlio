# Crawlio API Documentation

**Generated on:** September 3, 2025  
**Application:** Crawlio - Web Crawling & Scraping Service  
**Version:** 1.0.0  

## Overview

This document provides a comprehensive list of all APIs available in the Crawlio application, including their purposes, functionality status, and frontend connectivity.

## API Endpoints

### Health Check

#### GET /health
**Purpose:**  
Checks the health status of the application, including uptime, environment, and timestamp.

**Functionality Status:** ✅ Working  
- Tested successfully with curl  
- Returns JSON with status, timestamp, uptime, and environment  

**Frontend Connection:** ❌ Not connected  
- No frontend calls to this endpoint  

---

### Authentication APIs

#### POST /api/auth/register
**Purpose:**  
Registers a new user account with email, password, first name, and last name. Creates API key and JWT token.

**Functionality Status:** ✅ Working  
- Tested successfully  
- Returns user data, API key, and JWT token  

**Frontend Connection:** ❌ Not connected  
- Registration likely handled through separate UI components not in the main page  

#### POST /api/auth/login
**Purpose:**  
Authenticates user with email and password, returns JWT token and user data.

**Functionality Status:** ✅ Working  
- Tested successfully  
- Returns user data and JWT token  

**Frontend Connection:** ❌ Not connected  
- Login likely handled through separate auth components  

#### GET /api/auth/profile
**Purpose:**  
Retrieves the authenticated user's profile information.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to return user profile data  

**Frontend Connection:** ❌ Not connected  

#### POST /api/auth/regenerate-api-key
**Purpose:**  
Generates a new API key for the authenticated user.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to return new API key  

**Frontend Connection:** ❌ Not connected  

#### POST /api/auth/change-password
**Purpose:**  
Changes the password for the authenticated user.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to update password  

**Frontend Connection:** ❌ Not connected  

#### POST /api/auth/logout
**Purpose:**  
Logs out the authenticated user (client-side token invalidation).

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to handle logout  

**Frontend Connection:** ❌ Not connected  

---

### Crawling APIs

#### POST /api/crawl/rag
**Purpose:**  
Performs Retrieval-Augmented Generation (RAG) processing on crawled content, extracting summaries and entities.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to process crawled data with AI/ML  

**Frontend Connection:** ❌ Not connected  

#### POST /api/crawl/url
**Purpose:**  
Crawls a single URL and extracts data based on specified options (text, links, images, metadata, screenshots).

**Functionality Status:** ✅ Working  
- Tested successfully with example.com  
- Returns job ID, success status, metadata, and extracted data  
- Supports JavaScript rendering via Playwright  

**Frontend Connection:** ✅ Connected  
- Main crawling functionality in frontend  
- Used in the primary crawl form on index.js  

#### POST /api/crawl/batch
**Purpose:**  
Crawls multiple URLs concurrently and returns batch results.

**Functionality Status:** ✅ Working  
- Tested successfully with multiple URLs  
- Returns summary and individual results  
- Supports concurrent processing  

**Frontend Connection:** ❌ Not connected  
- Batch functionality not implemented in current frontend  

#### GET /api/crawl/job/:jobId
**Purpose:**  
Retrieves the status and results of a specific crawl job.

**Functionality Status:** ✅ Working  
- Tested successfully  
- Returns job details, status, and results  

**Frontend Connection:** ❌ Not connected  
- Job status checking not implemented in current frontend  

#### GET /api/crawl/history
**Purpose:**  
Retrieves the crawl history for the authenticated user.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to return list of past crawls  

**Frontend Connection:** ❌ Not connected  

#### DELETE /api/crawl/job/:jobId
**Purpose:**  
Deletes a specific crawl job and its results.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to remove job data  

**Frontend Connection:** ❌ Not connected  

#### GET /api/crawl/stats
**Purpose:**  
Retrieves crawling statistics for the authenticated user.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to return usage statistics  

**Frontend Connection:** ❌ Not connected  

---

### User Management APIs

#### GET /api/user/profile
**Purpose:**  
Retrieves the authenticated user's profile information.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to return user profile data  

**Frontend Connection:** ❌ Not connected  

#### PUT /api/user/profile
**Purpose:**  
Updates the authenticated user's profile information.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to update user data  

**Frontend Connection:** ❌ Not connected  

#### GET /api/user/usage
**Purpose:**  
Retrieves the current usage statistics for the authenticated user.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to return usage metrics  

**Frontend Connection:** ❌ Not connected  

#### GET /api/user/usage/history
**Purpose:**  
Retrieves the usage history for the authenticated user.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to return historical usage data  

**Frontend Connection:** ❌ Not connected  

#### GET /api/user/subscription
**Purpose:**  
Retrieves the subscription information for the authenticated user.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to return subscription details  

**Frontend Connection:** ❌ Not connected  

#### DELETE /api/user/account
**Purpose:**  
Deletes the authenticated user's account.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to remove user account  

**Frontend Connection:** ❌ Not connected  

---

### Subscription Management APIs

#### GET /api/subscription/plans
**Purpose:**  
Retrieves available subscription plans.

**Functionality Status:** ❓ Not tested  
- Public endpoint  
- Expected to return plan details  

**Frontend Connection:** ❌ Not connected  

#### POST /api/subscription/create-checkout-session
**Purpose:**  
Creates a Stripe checkout session for subscription purchase.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to integrate with Stripe for payments  

**Frontend Connection:** ❌ Not connected  

#### POST /api/subscription/create-portal-session
**Purpose:**  
Creates a Stripe customer portal session for subscription management.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to allow subscription management  

**Frontend Connection:** ❌ Not connected  

#### POST /api/subscription/cancel
**Purpose:**  
Cancels the authenticated user's subscription.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to cancel active subscription  

**Frontend Connection:** ❌ Not connected  

#### POST /api/subscription/reactivate
**Purpose:**  
Reactivates a cancelled subscription for the authenticated user.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to reactivate subscription  

**Frontend Connection:** ❌ Not connected  

#### GET /api/subscription/invoices
**Purpose:**  
Retrieves invoices for the authenticated user.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to return invoice history  

**Frontend Connection:** ❌ Not connected  

#### POST /api/subscription/upgrade
**Purpose:**  
Upgrades the authenticated user's subscription plan.

**Functionality Status:** ❓ Not tested  
- Requires authentication  
- Expected to change subscription tier  

**Frontend Connection:** ❌ Not connected  

---

### Webhook APIs

#### POST /api/webhook/stripe
**Purpose:**  
Handles Stripe webhook events for subscription and payment processing.

**Functionality Status:** ❓ Not tested  
- Public endpoint for Stripe webhooks  
- Expected to process payment events  

**Frontend Connection:** ❌ Not connected  
- Webhooks are server-to-server communications  

---

## Authentication Methods

The APIs support two authentication methods:

1. **JWT Token**: Use `Authorization: Bearer <token>` header
2. **API Key**: Use `x-api-key: <api_key>` header

## Rate Limiting

- All `/api/` endpoints are rate-limited
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables

## Error Handling

- APIs return appropriate HTTP status codes
- Error responses include error messages in JSON format
- Authentication errors return 401 status
- Validation errors return 400 status

## Frontend Integration

Currently, only the `/api/crawl/url` endpoint is integrated with the frontend. The main page (`pages/index.js`) provides a form to input URLs and options, then calls this API to perform crawling and display results.

Other APIs appear to be backend-only or require additional frontend components for user management, subscriptions, and authentication.

## Testing Status Summary

- ✅ **Fully Tested and Working**: 4 endpoints
- ❓ **Not Tested**: 25 endpoints
- **Total Endpoints**: 29

## Recommendations

1. Implement comprehensive frontend components for authentication and user management
2. Add frontend support for batch crawling and job management
3. Test all untested endpoints for complete functionality verification
4. Implement proper error handling and loading states in frontend
5. Add API documentation generation (e.g., Swagger/OpenAPI)

---

*This document was generated based on code analysis and limited testing. For production use, comprehensive testing of all endpoints is recommended.*
