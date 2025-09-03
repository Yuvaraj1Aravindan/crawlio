# Crawlio API Client

A Python client for interacting with the Crawlio web crawling API.

## Features

- User registration with automatic API key generation
- Website crawling with customizable options
- Crawl history retrieval
- JSON result export
- Error handling and retry logic

## Prerequisites

- Python 3.6+
- Running Crawlio backend server (default: http://localhost:3002)

## Installation

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage

Run the demo script:
```bash
python crawlio_client.py
```

This will:
1. Register a new user with a unique email
2. Generate an API key automatically
3. Crawl https://www.wikipedia.org/
4. Display crawl results summary
5. Save full results to a JSON file
6. Show crawl history

### Using the Client Programmatically

```python
from crawlio_client import CrawlioClient

# Initialize client
client = CrawlioClient()  # Uses http://localhost:3002 by default

# Register user and get API key
success = client.register_user(
    email="your-email@example.com",
    password="your-password",
    first_name="Your",
    last_name="Name"
)

if success:
    # Crawl a website
    result = client.crawl_url(
        url="https://example.com",
        options={
            "extractText": True,
            "extractLinks": True,
            "extractMeta": True,
            "screenshot": False
        }
    )

    # Get crawl history
    history = client.get_crawl_history()

    print(f"Your API Key: {client.api_key}")
```

## API Endpoints Used

- `POST /api/auth/register` - User registration
- `POST /api/crawl/url` - Single URL crawling
- `GET /api/crawl/history` - Crawl history

## Configuration

You can customize the base URL:

```python
client = CrawlioClient(base_url="http://your-server:3002")
```

## Output

The script generates:
- Console output with progress and results
- JSON file with full crawl results (`crawl_result_[timestamp].json`)

## Error Handling

The client includes comprehensive error handling for:
- Network connection issues
- API authentication failures
- Invalid responses
- Server errors

## Security Notes

- API keys are 32-character random strings
- Store your API key securely
- Never commit API keys to version control
- Use HTTPS in production environments</content>
<parameter name="filePath">/home/yuvaraj/Projects/crawlio/README.md
