const express = require('express');
const { body, param, validationResult } = require('express-validator');
const whois = require('whois');
const dns = require('dns').promises;
const punycode = require('punycode');
const axios = require('axios');
const winston = require('winston');

const router = express.Router();

// Logger for this module
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'domain-routes' }
});

// Utility function to convert emoji to punycode
const convertEmojiToPunycode = (domain) => {
  try {
    // Remove any protocol if present
    domain = domain.replace(/^https?:\/\//, '');
    
    // Split domain and TLD
    const parts = domain.split('.');
    const domainPart = parts[0];
    const tld = parts.slice(1).join('.');
    
    // Convert emoji part to punycode
    const punycoded = punycode.toASCII(domainPart);
    
    return tld ? `${punycoded}.${tld}` : punycoded;
  } catch (error) {
    throw new Error(`Failed to convert domain to punycode: ${error.message}`);
  }
};

// Utility function to check if domain contains emoji
const containsEmoji = (str) => {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(str);
};

// Enhanced domain availability checker
const checkDomainAvailability = async (domain) => {
  const result = {
    domain: domain,
    available: null,
    error: null,
    method: 'unknown',
    details: {},
    checkedAt: new Date().toISOString()
  };

  try {
    // Convert to punycode if contains emoji
    const asciiDomain = containsEmoji(domain) ? convertEmojiToPunycode(domain) : domain;
    
    // Method 1: DNS lookup (fastest)
    try {
      const addresses = await dns.resolve4(asciiDomain);
      if (addresses && addresses.length > 0) {
        result.available = false;
        result.method = 'dns';
        result.details.dnsRecords = addresses;
        return result;
      }
    } catch (dnsError) {
      // DNS error might mean domain is available or DNS issues
      result.details.dnsError = dnsError.code;
    }

    // Method 2: WHOIS lookup (more reliable but slower)
    try {
      const whoisData = await new Promise((resolve, reject) => {
        whois.lookup(asciiDomain, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      // Parse WHOIS data for availability indicators
      const whoisLower = whoisData.toLowerCase();
      const availableIndicators = [
        'no match',
        'not found',
        'no entries found',
        'domain available',
        'not registered',
        'no data found'
      ];
      
      const registeredIndicators = [
        'creation date',
        'registered',
        'registrar:',
        'name server',
        'status: active'
      ];

      const hasAvailableIndicator = availableIndicators.some(indicator => 
        whoisLower.includes(indicator)
      );
      
      const hasRegisteredIndicator = registeredIndicators.some(indicator => 
        whoisLower.includes(indicator)
      );

      if (hasAvailableIndicator && !hasRegisteredIndicator) {
        result.available = true;
        result.method = 'whois';
        result.details.whoisSummary = 'Domain appears available';
      } else if (hasRegisteredIndicator) {
        result.available = false;
        result.method = 'whois';
        result.details.whoisSummary = 'Domain is registered';
        
        // Extract useful registration info
        const creationMatch = whoisData.match(/creation date?:?\s*(.+)/i);
        const registrarMatch = whoisData.match(/registrar:?\s*(.+)/i);
        
        if (creationMatch) result.details.creationDate = creationMatch[1].trim();
        if (registrarMatch) result.details.registrar = registrarMatch[1].trim();
      } else {
        result.available = null;
        result.method = 'whois';
        result.details.whoisSummary = 'Unable to determine availability';
      }

    } catch (whoisError) {
      result.error = `WHOIS lookup failed: ${whoisError.message}`;
      result.details.whoisError = whoisError.message;
    }

    return result;

  } catch (error) {
    result.error = error.message;
    return result;
  }
};

// Validation middleware
const validateDomain = [
  param('domain')
    .isLength({ min: 1, max: 253 })
    .withMessage('Domain must be between 1 and 253 characters')
    .matches(/^[a-zA-Z0-9\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}.-]+$/u)
    .withMessage('Invalid domain format'),
];

const validateBulkDomains = [
  body('domains')
    .isArray({ min: 1, max: 10 })
    .withMessage('Must provide 1-10 domains in array format'),
  body('domains.*')
    .isLength({ min: 1, max: 253 })
    .withMessage('Each domain must be between 1 and 253 characters')
];

// GET /api/domains/check/:domain - Check single domain availability
router.get('/check/:domain', validateDomain, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { domain } = req.params;
  
  try {
    logger.info(`Checking availability for domain: ${domain}`);
    const result = await checkDomainAvailability(domain);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error(`Domain check failed for ${domain}:`, error);
    res.status(500).json({
      error: 'Domain availability check failed',
      message: error.message
    });
  }
});

// POST /api/domains/bulk-check - Check multiple domains
router.post('/bulk-check', validateBulkDomains, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { domains } = req.body;
  
  try {
    logger.info(`Bulk checking ${domains.length} domains`);
    
    // Check all domains in parallel with concurrency limit
    const results = await Promise.allSettled(
      domains.map(domain => checkDomainAvailability(domain))
    );

    const processedResults = results.map((result, index) => ({
      domain: domains[index],
      ...(result.status === 'fulfilled' ? result.value : {
        available: null,
        error: result.reason?.message || 'Unknown error',
        method: 'failed'
      })
    }));

    res.json({
      success: true,
      data: {
        results: processedResults,
        summary: {
          total: domains.length,
          available: processedResults.filter(r => r.available === true).length,
          taken: processedResults.filter(r => r.available === false).length,
          errors: processedResults.filter(r => r.available === null).length
        }
      }
    });

  } catch (error) {
    logger.error('Bulk domain check failed:', error);
    res.status(500).json({
      error: 'Bulk domain check failed',
      message: error.message
    });
  }
});

// GET /api/domains/popular-tlds - Get popular TLDs for emoji domains
router.get('/popular-tlds', (req, res) => {
  const popularTlds = [
    { tld: '.com', description: 'Most popular worldwide', price: '$12/year' },
    { tld: '.io', description: 'Popular for tech/startups', price: '$60/year' },
    { tld: '.ai', description: 'AI and tech companies', price: '$180/year' },
    { tld: '.ws', description: 'Many emoji domains available', price: '$30/year' },
    { tld: '.la', description: 'Short and memorable', price: '$25/year' },
    { tld: '.me', description: 'Personal branding', price: '$20/year' },
    { tld: '.co', description: 'Business alternative to .com', price: '$25/year' },
    { tld: '.app', description: 'Mobile apps and tech', price: '$18/year' }
  ];

  res.json({
    success: true,
    data: popularTlds
  });
});

// GET /api/domains/suggest/:emoji - Get domain suggestions for emoji
router.get('/suggest/:emoji', async (req, res) => {
  const { emoji } = req.params;
  
  if (!containsEmoji(emoji)) {
    return res.status(400).json({
      error: 'Input must contain emoji characters'
    });
  }

  try {
    const tlds = ['.com', '.io', '.ai', '.ws', '.la', '.me', '.co', '.app'];
    const suggestions = [];

    // Generate variations
    const variations = [
      emoji, // Just the emoji
      emoji + emoji, // Double emoji
      emoji + '🌟', // With star
      emoji + '💎', // With diamond
      '🚀' + emoji, // With rocket prefix
    ];

    for (const variation of variations) {
      for (const tld of tlds) {
        const domain = variation + tld;
        suggestions.push({
          domain,
          punycode: convertEmojiToPunycode(domain),
          estimated_price: '$12-180/year',
          priority: variation === emoji ? 'high' : 'medium'
        });
      }
    }

    res.json({
      success: true,
      data: {
        input: emoji,
        suggestions: suggestions.slice(0, 20) // Limit to 20 suggestions
      }
    });

  } catch (error) {
    logger.error(`Suggestion generation failed for ${emoji}:`, error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      message: error.message
    });
  }
});

module.exports = router;