import React, { useState, useEffect } from 'react';
import { Copy, ArrowUpDown, Globe, Search } from 'lucide-react';

const EmojiDomainConverter = () => {
  const [emojiInput, setEmojiInput] = useState('');
  const [punycodeInput, setPunycodeInput] = useState('');
  const [emojiOutput, setEmojiOutput] = useState('');
  const [punycodeOutput, setPunycodeOutput] = useState('');
  const [activeTab, setActiveTab] = useState('emoji-to-puny');
  const [copySuccess, setCopySuccess] = useState('');
  const [validationMessage, setValidationMessage] = useState('');

  // Proper punycode decoder implementation
  const punycodeDecoder = {
    base: 36,
    tMin: 1,
    tMax: 26,
    skew: 38,
    damp: 700,
    initialBias: 72,
    initialN: 128,
    delimiter: '-',

    adapt: function(delta, numPoints, firstTime) {
      let k = 0;
      delta = firstTime ? Math.floor(delta / this.damp) : delta >> 1;
      delta += Math.floor(delta / numPoints);
      for (; delta > ((this.base - this.tMin) * this.tMax) >> 1; k += this.base) {
        delta = Math.floor(delta / (this.base - this.tMin));
      }
      return Math.floor(k + (this.base - this.tMin + 1) * delta / (delta + this.skew));
    },

    decode: function(input) {
      const output = [];
      const inputLength = input.length;
      let i = 0;
      let n = this.initialN;
      let bias = this.initialBias;

      let basic = input.lastIndexOf(this.delimiter);
      if (basic < 0) {
        basic = 0;
      }

      for (let j = 0; j < basic; ++j) {
        if (input.charCodeAt(j) >= 0x80) {
          throw new Error('Invalid input');
        }
        output.push(input.charCodeAt(j));
      }

      for (let index = basic > 0 ? basic + 1 : 0; index < inputLength;) {
        const oldi = i;
        let w = 1;
        for (let k = this.base; ; k += this.base) {
          if (index >= inputLength) {
            throw new Error('Invalid input');
          }

          const digit = input.charCodeAt(index++);
          const digitValue = digit - 48 < 10 ? digit - 22 : digit - 65 < 26 ? digit - 65 : digit - 97 < 26 ? digit - 97 : this.base;

          if (digitValue >= this.base) {
            throw new Error('Invalid input');
          }

          i += digitValue * w;
          const t = k <= bias ? this.tMin : (k >= bias + this.tMax ? this.tMax : k - bias);

          if (digitValue < t) {
            break;
          }

          const baseMinusT = this.base - t;
          if (w > Math.floor((0x7FFFFFFF - i) / baseMinusT)) {
            throw new Error('Overflow');
          }

          w *= baseMinusT;
        }

        const out = output.length + 1;
        bias = this.adapt(i - oldi, out, oldi === 0);

        if (Math.floor(i / out) > 0x7FFFFFFF - n) {
          throw new Error('Overflow');
        }

        n += Math.floor(i / out);
        i %= out;

        output.splice(i++, 0, n);
      }

      return String.fromCodePoint(...output);
    }
  };

  // Enhanced punycode conversion using browser APIs
  const convertEmojiToPunycode = (input) => {
    if (!input.trim()) return '';
    
    try {
      // Use URL constructor for proper IDN conversion
      const url = new URL(`http://${input.trim()}`);
      return url.hostname;
    } catch (error) {
      // Fallback method
      try {
        const encoded = encodeURIComponent(input.trim());
        return `xn--${encoded.replace(/%/g, '').toLowerCase()}`;
      } catch (fallbackError) {
        return null;
      }
    }
  };

  const convertPunycodeToEmoji = (input) => {
    if (!input.trim()) return '';
    
    try {
      let domain = input.trim().toLowerCase();
      
      // Handle full domain (remove protocol if present)
      domain = domain.replace(/^https?:\/\//, '');
      
      // Extract the domain part if it has TLD
      const parts = domain.split('.');
      let punycodepart = parts[0];
      
      // Handle xn-- format
      if (punycodepart.startsWith('xn--')) {
        const encoded = punycodepart.slice(4);
        const decoded = punycodeDecoder.decode(encoded);
        
        // Reconstruct full domain if there were other parts
        if (parts.length > 1) {
          return decoded + '.' + parts.slice(1).join('.');
        }
        return decoded;
      }
      
      // If not punycode format, return as-is
      return domain;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  };

  // Validate emoji for domain use
  const validateEmojiForDomain = (emoji) => {
    if (!emoji.trim()) return { valid: true, message: '' };
    
    // Check for common issues
    const hasSpace = /\s/.test(emoji);
    const hasInvalidChars = /[<>:"\\|?*]/.test(emoji);
    const tooLong = emoji.length > 63;
    
    if (hasSpace) return { valid: false, message: 'Domains cannot contain spaces' };
    if (hasInvalidChars) return { valid: false, message: 'Contains invalid characters for domains' };
    if (tooLong) return { valid: false, message: 'Domain name too long (max 63 characters)' };
    
    return { valid: true, message: 'Valid emoji domain format' };
  };

  // Handle emoji to punycode conversion
  useEffect(() => {
    if (activeTab === 'emoji-to-puny' && emojiInput) {
      const converted = convertEmojiToPunycode(emojiInput);
      setPunycodeOutput(converted || 'Conversion failed');
      
      const validation = validateEmojiForDomain(emojiInput);
      setValidationMessage(validation.message);
    } else if (activeTab === 'emoji-to-puny') {
      setPunycodeOutput('');
      setValidationMessage('');
    }
  }, [emojiInput, activeTab]);

  // Handle punycode to emoji conversion
  useEffect(() => {
    if (activeTab === 'puny-to-emoji' && punycodeInput) {
      const converted = convertPunycodeToEmoji(punycodeInput);
      setEmojiOutput(converted || 'Conversion failed');
    } else if (activeTab === 'puny-to-emoji') {
      setEmojiOutput('');
    }
  }, [punycodeInput, activeTab]);

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(`${type} copied!`);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const quickEmojiInsert = (emoji) => {
    if (activeTab === 'emoji-to-puny') {
      setEmojiInput(prev => prev + emoji);
    }
  };

  const popularEmojis = ['🏠', '🚀', '💡', '🌟', '🎯', '🔥', '💎', '🌈', '⚡', '🎨', '🎵', '🍕', '☕', '🎮', '📱', '💻'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Globe className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">Emoji Domain Converter</h1>
          </div>
          <p className="text-lg text-gray-600">Convert between emoji domains and punycode format</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white rounded-lg p-1 mb-6 shadow-sm">
          <button
            onClick={() => setActiveTab('emoji-to-puny')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
              activeTab === 'emoji-to-puny'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-blue-500'
            }`}
          >
            Emoji → Punycode
          </button>
          <button
            onClick={() => setActiveTab('puny-to-emoji')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
              activeTab === 'puny-to-emoji'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-blue-500'
            }`}
          >
            Punycode → Emoji
          </button>
        </div>

        {/* Emoji to Punycode Tab */}
        {activeTab === 'emoji-to-puny' && (
          <div className="space-y-6">
            {/* Quick Emoji Insert */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Insert Popular Emojis</h3>
              <div className="flex flex-wrap gap-2">
                {popularEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => quickEmojiInsert(emoji)}
                    className="text-2xl p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Emoji Domain
              </label>
              <textarea
                value={emojiInput}
                onChange={(e) => setEmojiInput(e.target.value)}
                placeholder="🏠🌟 or 🚀💡🎯"
                className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-2xl resize-none"
              />
              {validationMessage && (
                <p className={`mt-2 text-sm ${validationMessage.includes('Valid') ? 'text-green-600' : 'text-red-600'}`}>
                  {validationMessage}
                </p>
              )}
            </div>

            {/* Output Section */}
            {punycodeOutput && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Punycode Result
                  </label>
                  <button
                    onClick={() => copyToClipboard(punycodeOutput, 'Punycode')}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg font-mono text-lg break-all">
                  {punycodeOutput}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Punycode to Emoji Tab */}
        {activeTab === 'puny-to-emoji' && (
          <div className="space-y-6">
            {/* Input Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Punycode Domain
              </label>
              <input
                type="text"
                value={punycodeInput}
                onChange={(e) => setPunycodeInput(e.target.value)}
                placeholder="xn--ls8h or domain.xn--ls8h"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
            </div>

            {/* Output Section */}
            {emojiOutput && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Emoji Result
                  </label>
                  <button
                    onClick={() => copyToClipboard(emojiOutput, 'Emoji')}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-2xl break-all">
                  {emojiOutput}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Copy Success Message */}
        {copySuccess && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
            {copySuccess}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How It Works</h3>
          <div className="text-blue-800 space-y-2">
            <p>• Emoji domains use Internationalized Domain Names (IDN) technology</p>
            <p>• They're converted to ASCII-compatible punycode format for DNS systems</p>
            <p>• Modern browsers automatically display the emoji version in the address bar</p>
            <p>• Perfect for creating memorable, visual brand identities online</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmojiDomainConverter;