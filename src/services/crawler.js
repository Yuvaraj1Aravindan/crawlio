const { chromium } = require('playwright');
const cheerio = require('cheerio');
const { logger } = require('../utils/logger');
const { getPool } = require('../config/database');
const { cacheSet, cacheGet } = require('../config/redis');

class CrawlerService {
  constructor() {
    this.browser = null;
    this.maxConcurrentCrawls = parseInt(process.env.MAX_CONCURRENT_CRAWLS) || 10;
    this.crawlTimeout = parseInt(process.env.CRAWL_TIMEOUT) || 30000;
    this.userAgent = process.env.USER_AGENT || 'Mozilla/5.0 (compatible; Crawlio/1.0; +https://crawlio.com)';
  }

  async initialize() {
    try {
      this.browser = await chromium.launch({
        headless: true,
        executablePath: '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      logger.info('✅ Playwright browser initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Playwright browser:', error);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed');
    }
  }

  async crawlUrl(url, options = {}) {
    const startTime = Date.now();
    let page = null;
    let context = null;

    try {
      // Check cache first
      const cacheKey = `crawl:${url}:${JSON.stringify(options)}`;
      const cachedResult = await cacheGet(cacheKey);
      if (cachedResult) {
        logger.info(`Cache hit for URL: ${url}`);
        return {
          ...cachedResult,
          cached: true,
          responseTime: Date.now() - startTime
        };
      }

      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL provided');
      }

      // Create browser context with options
      context = await this.browser.newContext({
        userAgent: options.userAgent || this.userAgent,
        viewport: { width: 1920, height: 1080 },
        ...options.browserOptions
      });

      // Create new page
      page = await context.newPage();

      // Set timeout
      page.setDefaultTimeout(this.crawlTimeout);

      // Set extra headers if provided
      if (options.headers) {
        await page.setExtraHTTPHeaders(options.headers);
      }

      // Navigate to URL
      logger.info(`Starting crawl for URL: ${url}`);
      const response = await page.goto(url, {
        waitUntil: options.waitUntil || 'networkidle',
        timeout: this.crawlTimeout
      });

      // Check if page loaded successfully
      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      // Wait for additional time if specified
      if (options.waitFor) {
        await page.waitForTimeout(options.waitFor);
      }

      // Wait for specific selector if provided
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      }

      // Enhanced content waiting for better extraction
      await this.waitForContent(page);

      // Get page content
      const html = await page.content();
      const title = await page.title();
      const finalUrl = page.url();

      // Parse with Cheerio
      const $ = cheerio.load(html);
      
      // Extract data based on options
      const extractedData = this.extractData($, options);

      // Take screenshot if requested
      let screenshot = null;
      if (options.screenshot) {
        screenshot = await page.screenshot({
          fullPage: options.screenshot === 'full' || options.screenshot === true,
          type: 'png'
        });
      }

      // Get metadata
      const metadata = {
        title,
        finalUrl,
        statusCode: response.status(),
        contentType: response.headers()['content-type'],
        contentLength: html.length,
        loadTime: Date.now() - startTime
      };

      const result = {
        success: true,
        url: finalUrl,
        data: extractedData,
        metadata,
        screenshot: screenshot ? screenshot.toString('base64') : null,
        responseTime: Date.now() - startTime
      };

      // Cache the result
      await cacheSet(cacheKey, result, 3600); // Cache for 1 hour

      logger.info(`✅ Crawl completed for ${url} in ${result.responseTime}ms`);
      return result;

    } catch (error) {
      logger.error(`❌ Crawl failed for ${url}:`, error.message);
      return {
        success: false,
        url,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    } finally {
      if (page) await page.close();
      if (context) await context.close();
    }
  }

  extractData($, options) {
    const data = {};

    // Extract text content with better processing for RAG
    if (options.extractText) {
      // Remove script and style elements
      $('script, style, noscript').remove();
      
      // Extract text with semantic structure
      const textContent = this.extractStructuredText($);
      data.text = textContent.fullText;
      data.textChunks = textContent.chunks;
      data.sections = textContent.sections;
    }

    // Extract specific selectors
    if (options.selectors) {
      data.elements = {};
      for (const [key, selector] of Object.entries(options.selectors)) {
        const elements = $(selector);
        data.elements[key] = elements.map((i, el) => {
          const $el = $(el);
          return {
            text: $el.text().trim(),
            html: $el.html(),
            attributes: $el.attr()
          };
        }).get();
      }
    }

    // Extract links with better text extraction
    if (options.extractLinks) {
      data.links = $('a[href]').map((i, el) => {
        const $el = $(el);
        let text = $el.text().trim();
        
        // If no text, try to get alt text from images
        if (!text) {
          const img = $el.find('img').first();
          if (img.length) {
            text = img.attr('alt') || img.attr('title') || '';
          }
        }
        
        // If still no text, try aria-label
        if (!text) {
          text = $el.attr('aria-label') || '';
        }
        
        return {
          text: this.cleanText(text),
          href: $el.attr('href'),
          title: $el.attr('title'),
          ariaLabel: $el.attr('aria-label')
        };
      }).get().filter(link => link.text.length > 0 || link.href.startsWith('http'));
    }

    // Extract images with better metadata
    if (options.extractImages) {
      data.images = $('img[src]').map((i, el) => {
        const $el = $(el);
        const src = $el.attr('src');
        
        // Skip data URLs and very small images
        if (src && !src.startsWith('data:') && src.length > 10) {
          return {
            src: src,
            alt: this.cleanText($el.attr('alt') || ''),
            title: this.cleanText($el.attr('title') || ''),
            width: $el.attr('width'),
            height: $el.attr('height'),
            loading: $el.attr('loading'),
            className: $el.attr('class')
          };
        }
        return null;
      }).get().filter(img => img !== null);
    }

    // Extract meta tags with enhanced data for RAG
    if (options.extractMeta) {
      data.meta = {};
      data.schema = {};
      
      // Extract meta tags
      $('meta').each((i, el) => {
        const $el = $(el);
        const name = $el.attr('name') || $el.attr('property');
        const content = $el.attr('content');
        if (name && content) {
          data.meta[name] = content;
        }
      });

      // Extract Open Graph data
      data.openGraph = {};
      $('meta[property^="og:"]').each((i, el) => {
        const $el = $(el);
        const property = $el.attr('property').replace('og:', '');
        const content = $el.attr('content');
        if (content) {
          data.openGraph[property] = content;
        }
      });

      // Extract Twitter Card data
      data.twitterCard = {};
      $('meta[name^="twitter:"]').each((i, el) => {
        const $el = $(el);
        const name = $el.attr('name').replace('twitter:', '');
        const content = $el.attr('content');
        if (content) {
          data.twitterCard[name] = content;
        }
      });

      // Extract schema.org structured data
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const content = $(el).html();
          const parsed = JSON.parse(content);
          if (parsed['@type']) {
            data.schema[parsed['@type']] = parsed;
          }
        } catch (error) {
          // Skip invalid JSON
        }
      });
    }

    // Extract JSON-LD structured data
    if (options.extractStructuredData) {
      data.structuredData = [];
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const content = $(el).html();
          const parsed = JSON.parse(content);
          data.structuredData.push(parsed);
        } catch (error) {
          // Skip invalid JSON
        }
      });
    }

    return data;
  }

  async waitForContent(page) {
    // Wait for common content selectors
    const contentSelectors = [
      'main', 'article', '.content', '.main-content', '#content', 
      'body', 'h1', 'h2', 'p', '.hero', '.banner', '.container'
    ];

    for (const selector of contentSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        // Found a content selector, wait a bit more for dynamic content
        await page.waitForTimeout(1000);
        break;
      } catch (error) {
        // Continue to next selector
      }
    }

    // Wait for any dynamic content to load
    try {
      await page.waitForFunction(() => {
        const textContent = document.body.textContent || '';
        return textContent.length > 100; // Ensure we have substantial content
      }, { timeout: 5000 });
    } catch (error) {
      // Continue even if timeout
    }

    // Additional wait for JavaScript-heavy sites
    await page.waitForTimeout(3000);

    // Try to scroll to trigger lazy loading
    try {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
        return new Promise(resolve => setTimeout(resolve, 1000));
      });
    } catch (error) {
      // Continue even if scroll fails
    }
  }

  extractStructuredText($) {
    const sections = [];
    const chunks = [];
    let fullText = '';

    // Clean up the HTML before processing
    $('script, style, noscript, iframe, nav, footer, .nav, .footer, .sidebar, .ad, .advertisement').remove();

    // Extract main content areas with priority
    const contentSelectors = [
      'main', 'article', '.content', '.main-content', '#content', '#main', 
      '.post-content', '.entry-content', '.hero', '.banner', '.container'
    ];

    let mainContent = null;
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        mainContent = element;
        break;
      }
    }

    // If no main content found, use body but exclude navigation
    if (!mainContent) {
      mainContent = $('body');
      mainContent.find('nav, .nav, .navigation, header, .header, .menu, .navbar').remove();
    }

    // If still no substantial content, try a different approach
    if (mainContent.text().trim().length < 200) {
      // Try to find any content with substantial text
      const allElements = $('*').filter(function() {
        const text = $(this).text().trim();
        return text.length > 50 && !$(this).find('*').length; // Leaf nodes with substantial text
      });
      
      if (allElements.length > 0) {
        mainContent = $('<div>').append(allElements);
      }
    }

    // Extract headings and their content
    const headings = mainContent.find('h1, h2, h3, h4, h5, h6');
    let currentSection = { title: 'Introduction', content: '', level: 0 };

    mainContent.children().each((i, element) => {
      const $el = $(element);
      const tagName = $el.prop('tagName').toLowerCase();
      let text = $el.text().trim();

      // Clean up text formatting
      text = this.cleanText(text);
      
      if (text.length === 0) return;

      // Check if it's a heading
      if (tagName.match(/^h[1-6]$/)) {
        // Save previous section
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          title: text,
          content: '',
          level: parseInt(tagName.charAt(1)),
          id: $el.attr('id') || null
        };
      } else {
        // Add content to current section
        if (currentSection.content) {
          currentSection.content += '\n\n';
        }
        currentSection.content += text;
      }

      // Add to full text
      if (fullText) fullText += '\n\n';
      fullText += text;
    });

    // Add the last section
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }

    // Create semantic chunks for RAG
    const chunkSize = 1000; // characters per chunk
    const overlap = 200; // overlap between chunks

    for (let i = 0; i < fullText.length; i += chunkSize - overlap) {
      const chunk = fullText.slice(i, i + chunkSize);
      if (chunk.trim()) {
        chunks.push({
          text: chunk.trim(),
          startIndex: i,
          endIndex: Math.min(i + chunkSize, fullText.length)
        });
      }
    }

    return {
      fullText: this.cleanText(fullText.trim()),
      chunks: chunks.map(chunk => ({
        ...chunk,
        text: this.cleanText(chunk.text)
      })),
      sections: sections.map(section => ({
        ...section,
        title: this.cleanText(section.title),
        content: this.cleanText(section.content)
      }))
    };
  }

  cleanText(text) {
    if (!text) return '';
    
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive newlines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Clean up bullet points and lists
      .replace(/^\s*[-•*]\s*/gm, '• ')
      // Remove leading/trailing whitespace
      .trim()
      // Normalize quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Clean up common formatting issues
      .replace(/\s+([.,!?])/g, '$1')
      .replace(/([.,!?])\s*([A-Z])/g, '$1 $2');
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  async crawlMultiple(urls, options = {}) {
    const results = [];
    const concurrency = Math.min(options.concurrency || this.maxConcurrentCrawls, urls.length);

    // Process URLs in batches
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(url => this.crawlUrl(url, options));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            url: batch[index],
            error: result.reason.message
          });
        }
      });
    }

    return results;
  }
}

module.exports = CrawlerService;
