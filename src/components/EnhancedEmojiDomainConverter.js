import React, { useState, useEffect } from 'react';
import { Copy, ArrowUpDown, Globe, Search, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

const EnhancedEmojiDomainConverter = () => {
  const [emojiInput, setEmojiInput] = useState('');
  const [punycodeInput, setPunycodeInput] = useState('');
  const [emojiOutput, setEmojiOutput] = useState('');
  const [punycodeOutput, setPunycodeOutput] = useState('');
  const [activeTab, setActiveTab] = useState('emoji-to-puny');
  const [copySuccess, setCopySuccess] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  
  // New state for domain availability
  const [availabilityResults, setAvailabilityResults] = useState({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [selectedTLD, setSelectedTLD] = useState('.com');
  const [popularTLDs, setPopularTLDs] = useState([]);

  // API base URL - adjust for your setup
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Fetch popular TLDs on component mount
  useEffect(() => {
    fetchPopularTLDs();
  }, []);

  const fetchPopularTLDs = async () => {
    try {
      const response = await fetch(`${API_BASE}/domains/popular-tlds`);
      const data = await response.json();
      if (data.success) {
        setPopularTLDs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch popular TLDs:', error);
      // Fallback TLDs
      setPopularTLDs([
        { tld: '.com', description: 'Most popular worldwide', price: '$12/year' },
        { tld: '.io', description: 'Popular for tech/startups', price: '$60/year' },
        { tld: '.ai', description: 'AI and tech companies', price: '$180/year' },
        { tld: '.ws', description: 'Many emoji domains available', price: '$30/year' }
      ]);
    }
  };

  // Enhanced conversion functions using backend API
  const convertEmojiToPunycode = async (input) => {
    if (!input.trim()) return '';
    
    try {
      const response = await fetch(`${API_BASE}/conversion/emoji-to-punycode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: input.trim() })
      });
      
      const data = await response.json();
      if (data.success) {
        setValidationMessage(data.data.validation.valid ? 
          'Valid emoji domain format' : 
          data.data.validation.issues.join(', ')
        );
        return data.data.output;
      } else {
        throw new Error(data.message || 'Conversion failed');
      }
    } catch (error) {
      console.error('Conversion error:', error);
      return 'Conversion failed';
    }
  };

  const convertPunycodeToEmoji = async (input) => {
    if (!input.trim()) return '';
    
    try {
      const response = await fetch(`${API_BASE}/conversion/punycode-to-emoji`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: input.trim() })
      });
      
      const data = await response.json();
      if (data.success) {
        return data.data.output;
      } else {
        throw new Error(data.message || 'Conversion failed');
      }
    } catch (error) {
      console.error('Conversion error:', error);
      return 'Conversion failed';
    }
  };

  // Domain availability checking
  const checkDomainAvailability = async (domain) => {
    setCheckingAvailability(true);
    
    try {
      const domainToCheck = domain.includes('.') ? domain : `${domain}${selectedTLD}`;
      
      const response = await fetch(`${API_BASE}/domains/check/${encodeURIComponent(domainToCheck)}`);
      const data = await response.json();
      
      if (data.success) {
        setAvailabilityResults(prev => ({
          ...prev,
          [domainToCheck]: data.data
        }));
      } else {
        throw new Error(data.message || 'Availability check failed');
      }
    } catch (error) {
      console.error('Availability check error:', error);
      setAvailabilityResults(prev => ({
        ...prev,
        [domain]: {
          available: null,
          error: error.message,
          method: 'failed'
        }
      }));
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Handle emoji to punycode conversion
  useEffect(() => {
    if (activeTab === 'emoji-to-puny' && emojiInput) {
      const performConversion = async () => {
        const converted = await convertEmojiToPunycode(emojiInput);
        setPunycodeOutput(converted);
      };
      performConversion();
    } else if (activeTab === 'emoji-to-puny') {
      setPunycodeOutput('');
      setValidationMessage('');
      setAvailabilityResults({});
    }
  }, [emojiInput, activeTab]);

  // Handle punycode to emoji conversion
  useEffect(() => {
    if (activeTab === 'puny-to-emoji' && punycodeInput) {
      const performConversion = async () => {
        const converted = await convertPunycodeToEmoji(punycodeInput);
        setEmojiOutput(converted);
      };
      performConversion();
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

  const getAvailabilityIcon = (result) => {
    if (!result) return null;
    
    if (result.available === true) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (result.available === false) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getAvailabilityText = (result) => {
    if (!result) return '';
    
    if (result.available === true) {
      return 'Available!';
    } else if (result.available === false) {
      return 'Taken';
    } else {
      return 'Unknown';
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
          <p className="text-sm text-gray-500 mt-2">Now with live domain availability checking!</p>
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

            {/* Domain Availability Section */}
            {punycodeOutput && punycodeOutput !== 'Conversion failed' && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-700">Check Domain Availability</h3>
                </div>
                
                {/* TLD Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select TLD (Top Level Domain)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {popularTLDs.slice(0, 6).map((tldInfo) => (
                      <button
                        key={tldInfo.tld}
                        onClick={() => setSelectedTLD(tldInfo.tld)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedTLD === tldInfo.tld
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={`${tldInfo.description} - ${tldInfo.price}`}
                      >
                        {tldInfo.tld}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Check Availability Button */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => checkDomainAvailability(punycodeOutput)}
                    disabled={checkingAvailability}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {checkingAvailability ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {checkingAvailability ? 'Checking...' : 'Check Availability'}
                  </button>
                  
                  <div className="text-sm text-gray-500">
                    Will check: {punycodeOutput}{selectedTLD}
                  </div>
                </div>

                {/* Availability Results */}
                {Object.keys(availabilityResults).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Availability Results:</h4>
                    {Object.entries(availabilityResults).map(([domain, result]) => (
                      <div key={domain} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getAvailabilityIcon(result)}
                          <span className="font-mono text-sm">{domain}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            result.available === true ? 'text-green-600' :
                            result.available === false ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {getAvailabilityText(result)}
                          </span>
                          {result.method && (
                            <span className="text-xs text-gray-400">
                              via {result.method}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

        {/* Enhanced Info Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How It Works</h3>
          <div className="text-blue-800 space-y-2">
            <p>• Emoji domains use Internationalized Domain Names (IDN) technology</p>
            <p>• They're converted to ASCII-compatible punycode format for DNS systems</p>
            <p>• Modern browsers automatically display the emoji version in the address bar</p>
            <p>• Our system checks real-time availability across popular TLDs</p>
            <p>• Perfect for creating memorable, visual brand identities online</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedEmojiDomainConverter;