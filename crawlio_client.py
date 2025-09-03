#!/usr/bin/env python3
"""
Crawlio API Client - Python program to register user, generate API key, and crawl websites
"""

import requests
import json
import sys
from typing import Optional, Dict, Any

class CrawlioClient:
    def __init__(self, base_url: str = "http://localhost:3002"):
        """
        Initialize the Crawlio API client

        Args:
            base_url: Base URL of the Crawlio API server
        """
        self.base_url = base_url.rstrip('/')
        self.api_key: Optional[str] = None
        self.session = requests.Session()

    def register_user(self, email: str, password: str, first_name: str, last_name: str) -> bool:
        """
        Register a new user and get API key

        Args:
            email: User email
            password: User password
            first_name: User's first name
            last_name: User's last name

        Returns:
            bool: True if registration successful, False otherwise
        """
        url = f"{self.base_url}/api/auth/register"
        payload = {
            "email": email,
            "password": password,
            "first_name": first_name,
            "last_name": last_name
        }

        try:
            print(f"Registering user: {email}")
            response = self.session.post(url, json=payload)
            response.raise_for_status()

            data = response.json()
            self.api_key = data.get('api_key')

            if self.api_key:
                print(f"Registration successful!")
                print(f"API Key: {self.api_key}")
                return True
            else:
                print("Registration failed - no API key received")
                return False

        except requests.exceptions.RequestException as e:
            print(f"Registration failed: {e}")
            if hasattr(e, 'response') and e.response:
                try:
                    error_data = e.response.json()
                    print(f"Error details: {error_data}")
                except:
                    print(f"Response: {e.response.text}")
            return False

    def crawl_url(self, url: str, options: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Crawl a website using the API key

        Args:
            url: URL to crawl
            options: Crawling options (optional)

        Returns:
            dict: Crawl results or None if failed
        """
        if not self.api_key:
            print("No API key available. Please register first.")
            return None

        api_url = f"{self.base_url}/api/crawl/url"
        payload = {
            "url": url
        }

        if options:
            payload["options"] = options

        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key
        }

        try:
            print(f"Crawling: {url}")
            response = self.session.post(api_url, json=payload, headers=headers)
            response.raise_for_status()

            data = response.json()
            print("Crawling completed successfully!")
            return data

        except requests.exceptions.RequestException as e:
            print(f"Crawling failed: {e}")
            if hasattr(e, 'response') and e.response:
                try:
                    error_data = e.response.json()
                    print(f"Error details: {error_data}")
                except:
                    print(f"Response: {e.response.text}")
            return None

    def get_crawl_history(self) -> Optional[Dict[str, Any]]:
        """
        Get crawl history for the current user

        Returns:
            dict: Crawl history or None if failed
        """
        if not self.api_key:
            print("No API key available. Please register first.")
            return None

        url = f"{self.base_url}/api/crawl/history"
        headers = {
            "x-api-key": self.api_key
        }

        try:
            print("Fetching crawl history...")
            response = self.session.get(url, headers=headers)
            response.raise_for_status()

            data = response.json()
            print("History retrieved successfully!")
            return data

        except requests.exceptions.RequestException as e:
            print(f"Failed to get history: {e}")
            return None

def main():
    """
    Main function to demonstrate the Crawlio API client
    """
    print("Crawlio API Client Demo")
    print("=" * 50)

    # Initialize client
    client = CrawlioClient()

    # Step 1: Register user and get API key
    print("\n1. User Registration")
    print("-" * 20)

    # Generate a unique email to avoid conflicts
    import time
    timestamp = int(time.time())
    email = f"testuser_{timestamp}@example.com"

    success = client.register_user(
        email=email,
        password="testpass123",
        first_name="Test",
        last_name="User"
    )

    if not success:
        print("Failed to register user. Exiting...")
        sys.exit(1)

    # Step 2: Crawl Wikipedia
    print("\n2. Website Crawling")
    print("-" * 20)

    crawl_options = {
        "extractText": True,
        "extractLinks": True,
        "extractMeta": True,
        "screenshot": False
    }

    crawl_result = client.crawl_url(
        url="https://www.wikipedia.org/",
        options=crawl_options
    )

    if crawl_result:
        print("\nCrawl Results Summary:")
        print("-" * 25)

        # Print key information
        if 'data' in crawl_result:
            data = crawl_result['data']
            if 'text' in data:
                text_preview = data['text'][:200] + "..." if len(data['text']) > 200 else data['text']
                print(f"Text Preview: {text_preview}")

            if 'sections' in data and data['sections']:
                print(f"Sections Found: {len(data['sections'])}")
                for i, section in enumerate(data['sections'][:3]):  # Show first 3 sections
                    print(f"  {i+1}. {section.get('title', 'Untitled')}")

        if 'metadata' in crawl_result:
            metadata = crawl_result['metadata']
            print(f"Final URL: {metadata.get('finalUrl', 'N/A')}")
            print(f"Load Time: {metadata.get('loadTime', 'N/A')}ms")
            print(f"Content Length: {metadata.get('contentLength', 'N/A')} bytes")

        # Save full results to file
        output_file = f"crawl_result_{timestamp}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(crawl_result, f, indent=2, ensure_ascii=False)
        print(f"\nFull results saved to: {output_file}")

    # Step 3: Get crawl history
    print("\n3. Crawl History")
    print("-" * 15)

    history = client.get_crawl_history()
    if history and 'jobs' in history:
        print(f"Total crawl jobs: {len(history['jobs'])}")
        if history['jobs']:
            latest_job = history['jobs'][0]
            print(f"Latest Job ID: {latest_job.get('job_id', 'N/A')}")
            print(f"Created: {latest_job.get('created_at', 'N/A')}")

    print("\nDemo completed successfully!")
    print(f"Your API Key: {client.api_key}")
    print("\nYou can now use this API key for future requests!")

if __name__ == "__main__":
    main()
