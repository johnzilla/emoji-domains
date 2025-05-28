const express = require('express');
const { body, validationResult } = require('express-validator');
const punycode = require('punycode');
const winston = require('winston');

const router = express.Router();

// Logger for this module
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'conversion-routes' }
});

// Validation middleware
const validateConversionInput = [
  body('input')
    .isLength({ min: 1, max: 500 })
    .withMessage('Input must be between 1 and 500 characters')
    .trim()
];

// Utility functions
const containsEmoji = (str) => {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(str);
};

const validateDomainFormat = (domain) => {
  const issues = [];
  
  if (/\s/.test(domain)) {
    issues.push('Domains cannot contain spaces');
  }
  
  if (/[<>:"\\|?*]/.test(domain)) {
    issues.push('Contains invalid characters for domains');
  }
  
  if (domain.length > 63) {
    issues.push('Domain name too long (max 63 characters)');
  }
  
  return {
    valid: issues.length === 0,
    issues: issues
  };
};

// POST /api/conversion/emoji-to-punycode
router.post('/emoji-to-punycode', validateConversionInput, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { input } = req.body;

  try {
    logger.info(`Converting emoji to punycode: ${input}`);

    // Validate domain format
    const validation = validateDomainFormat(input);
    
    // Convert to punycode
    let punycode_result;
    let conversion_method;

    try {
      // Method 1: Direct punycode conversion
      punycode_result = punycode.toASCII(input);
      conversion_method = 'punycode';
    } catch (punycodeError) {
      try {
        // Method 2: URL-based conversion (fallback)
        const url = new URL(`http://${input}`);
        punycode_result = url.hostname;
        conversion_method = 'url';
      } catch (urlError) {
        throw new Error('Failed to convert emoji to punycode');
      }
    }

    // Additional analysis
    const analysis = {
      contains_emoji: containsEmoji(input),
      character_count: input.length,
      punycode_length: punycode_result.length,
      estimated_dns_compatible: validation.valid,
      conversion_method: conversion_method
    };

    res.json({
      success: true,
      data: {
        input: input,
        output: punycode_result,
        validation: validation,
        analysis: analysis,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error(`Emoji to punycode conversion failed:`, error);
    res.status(500).json({
      error: 'Conversion failed',
      message: error.message
    });
  }
});

// POST /api/conversion/punycode-to-emoji
router.post('/punycode-to-emoji', validateConversionInput, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { input } = req.body;

  try {
    logger.info(`Converting punycode to emoji: ${input}`);

    let emoji_result;
    let conversion_method;
    let domain_parts = [];

    // Handle full domains (with TLD)
    let processInput = input.toLowerCase().trim();
    
    // Remove protocol if present
    processInput = processInput.replace(/^https?:\/\//, '');
    
    // Split into parts
    const parts = processInput.split('.');
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (part.startsWith('xn--')) {
        try {
          // Convert punycode part to unicode
          const decoded = punycode.toUnicode(part);
          domain_parts.push(decoded);
          conversion_method = 'punycode';
        } catch (error) {
          // If punycode conversion fails, keep original
          domain_parts.push(part);
        }
      } else {
        // Keep non-punycode parts as-is
        domain_parts.push(part);
      }
    }

    emoji_result = domain_parts.join('.');

    // Analysis
    const analysis = {
      input_format: input.includes('xn--') ? 'punycode' : 'standard',
      parts_processed: parts.length,
      punycode_parts: parts.filter(p => p.startsWith('xn--')).length,
      contains_emoji: containsEmoji(emoji_result),
      conversion_method: conversion_method || 'none'
    };

    res.json({
      success: true,
      data: {
        input: input,
        output: emoji_result,
        analysis: analysis,
        domain_parts: domain_parts,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error(`Punycode to emoji conversion failed:`, error);
    res.status(500).json({
      error: 'Conversion failed',
      message: error.message
    });
  }
});

// POST /api/conversion/bulk - Bulk conversion endpoint
router.post('/bulk', async (req, res) => {
  const { inputs, direction } = req.body;

  if (!Array.isArray(inputs) || inputs.length === 0) {
    return res.status(400).json({
      error: 'Must provide array of inputs'
    });
  }

  if (inputs.length > 50) {
    return res.status(400).json({
      error: 'Maximum 50 conversions per request'
    });
  }

  if (!['emoji-to-punycode', 'punycode-to-emoji'].includes(direction)) {
    return res.status(400).json({
      error: 'Direction must be "emoji-to-punycode" or "punycode-to-emoji"'
    });
  }

  try {
    logger.info(`Bulk conversion: ${inputs.length} items, direction: ${direction}`);

    const results = [];

    for (const input of inputs) {
      try {
        let output;
        
        if (direction === 'emoji-to-punycode') {
          output = punycode.toASCII(input);
        } else {
          // Handle punycode to emoji
          const parts = input.toLowerCase().split('.');
          const convertedParts = parts.map(part => {
            return part.startsWith('xn--') ? punycode.toUnicode(part) : part;
          });
          output = convertedParts.join('.');
        }

        results.push({
          input: input,
          output: output,
          success: true,
          error: null
        });

      } catch (error) {
        results.push({
          input: input,
          output: null,
          success: false,
          error: error.message
        });
      }
    }

    const summary = {
      total: inputs.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };

    res.json({
      success: true,
      data: {
        results: results,
        summary: summary,
        direction: direction,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error(`Bulk conversion failed:`, error);
    res.status(500).json({
      error: 'Bulk conversion failed',
      message: error.message
    });
  }
});

// GET /api/conversion/stats - Get conversion statistics
router.get('/stats', (req, res) => {
  // In a real app, this would pull from a database
  const mockStats = {
    total_conversions: 15420,
    emoji_to_punycode: 8930,
    punycode_to_emoji: 6490,
    popular_emojis: [
      { emoji: '🏠', count: 1205 },
      { emoji: '🚀', count: 987 },
      { emoji: '💡', count: 856 },
      { emoji: '🌟', count: 743 },
      { emoji: '🎯', count: 621 }
    ],
    daily_average: 127,
    peak_hour: '14:00-15:00 UTC'
  };

  res.json({
    success: true,
    data: mockStats
  });
});

module.exports = router;