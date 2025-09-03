#!/usr/bin/env python3

from crawlio_client import CrawlioClient

def main():
    client = CrawlioClient()
    
    # Use the API key from earlier run
    client.api_key = "0IsGoeQuG0jpWgG5ehwPkRMDWgmfyzjv"
    
    print("Crawling https://www.wikipedia.org/ using existing API key...")
    
    crawl_options = {
        "extractText": True,
        "extractLinks": True,
        "extractMeta": True,
        "screenshot": False
    }
    
    result = client.crawl_url("https://www.wikipedia.org/", options=crawl_options)
    
    if result:
        print("Crawl successful!")
        if 'data' in result:
            data = result['data']
            if 'text' in data:
                text_preview = data['text'][:200] + "..." if len(data['text']) > 200 else data['text']
                print(f"Text Preview: {text_preview}")
            if 'sections' in data and data['sections']:
                print(f"Sections Found: {len(data['sections'])}")
        if 'metadata' in result:
            metadata = result['metadata']
            print(f"Final URL: {metadata.get('finalUrl', 'N/A')}")
            print(f"Load Time: {metadata.get('loadTime', 'N/A')}ms")
            print(f"Content Length: {metadata.get('contentLength', 'N/A')} bytes")
    else:
        print("Crawl failed")

if __name__ == "__main__":
    main()
