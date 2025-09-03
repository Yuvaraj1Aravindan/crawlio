#!/usr/bin/env python3
"""
Simple Crawlio API Client Example - Using existing API key
"""

import requests
import json
import sys

def crawl_with_api_key(api_key: str, url: str, base_url: str = "http://localhost:3002"):
    """
    Crawl a website using an existing API key

    Args:
        api_key: Your Crawlio API key
        url: URL to crawl
        base_url: Crawlio API base URL
    """
    api_url = f"{base_url}/api/crawl/url"
    payload = {
        "url": url,
        "options": {
            "extractText": True,
            "extractLinks": True,
            "extractMeta": True,
            "screenshot": False
        }
    }

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key
    }

    try:
        print(f"Crawling: {url}")
        response = requests.post(api_url, json=payload, headers=headers)
        response.raise_for_status()

        data = response.json()
        print("Crawling completed successfully!")

        # Print summary
        if 'data' in data and 'text' in data['data']:
            text_preview = data['data']['text'][:200] + "..."
            print(f"Text Preview: {text_preview}")

        if 'metadata' in data:
            metadata = data['metadata']
            print(f"Final URL: {metadata.get('finalUrl', 'N/A')}")
            print(f"Load Time: {metadata.get('loadTime', 'N/A')}ms")

        return data

    except requests.exceptions.RequestException as e:
        print(f"❌ Crawling failed: {e}")
        return None

def main():
    """
    Example usage with existing API key
    """
    # Replace with your actual API key
    API_KEY = "YOUR_API_KEY_HERE"
    TARGET_URL = "https://www.wikipedia.org/"

    if API_KEY == "YOUR_API_KEY_HERE":
        print("❌ Please replace YOUR_API_KEY_HERE with your actual API key")
        print("Get your API key by running: python crawlio_client.py")
        sys.exit(1)

    print("Simple Crawlio API Client")
    print("=" * 40)

    result = crawl_with_api_key(API_KEY, TARGET_URL)

    if result:
        # Save results
        import time
        timestamp = int(time.time())
        filename = f"simple_crawl_{timestamp}.json"

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        print(f"Results saved to: {filename}")
        print("Crawl completed successfully!")

if __name__ == "__main__":
    main()
