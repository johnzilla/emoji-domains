import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmojiDomainConverter from '../EmojiDomainConverter';

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe('EmojiDomainConverter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the main heading', () => {
    render(<EmojiDomainConverter />);
    expect(screen.getByText('Emoji Domain Converter')).toBeInTheDocument();
  });

  test('renders both tab buttons', () => {
    render(<EmojiDomainConverter />);
    expect(screen.getByText('Emoji → Punycode')).toBeInTheDocument();
    expect(screen.getByText('Punycode → Emoji')).toBeInTheDocument();
  });

  test('emoji to punycode tab is active by default', () => {
    render(<EmojiDomainConverter />);
    const emojiTab = screen.getByText('Emoji → Punycode');
    expect(emojiTab).toHaveClass('bg-blue-500');
  });

  test('switching tabs works correctly', () => {
    render(<EmojiDomainConverter />);
    const punycodeTab = screen.getByText('Punycode → Emoji');
    
    fireEvent.click(punycodeTab);
    
    expect(punycodeTab).toHaveClass('bg-blue-500');
    expect(screen.getByText('Emoji → Punycode')).not.toHaveClass('bg-blue-500');
  });

  test('quick emoji insert buttons are present', () => {
    render(<EmojiDomainConverter />);
    expect(screen.getByText('🏠')).toBeInTheDocument();
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('💡')).toBeInTheDocument();
  });

  test('emoji input field accepts input', () => {
    render(<EmojiDomainConverter />);
    const input = screen.getByPlaceholderText('🏠🌟 or 🚀💡🎯');
    
    fireEvent.change(input, { target: { value: '🏠' } });
    
    expect(input.value).toBe('🏠');
  });

  test('punycode input field accepts input when on punycode tab', () => {
    render(<EmojiDomainConverter />);
    
    // Switch to punycode tab
    fireEvent.click(screen.getByText('Punycode → Emoji'));
    
    const input = screen.getByPlaceholderText('xn--ls8h or domain.xn--ls8h');
    fireEvent.change(input, { target: { value: 'xn--ls8h' } });
    
    expect(input.value).toBe('xn--ls8h');
  });

  test('quick emoji insert adds emoji to input', () => {
    render(<EmojiDomainConverter />);
    const input = screen.getByPlaceholderText('🏠🌟 or 🚀💡🎯');
    const houseButton = screen.getByText('🏠');
    
    fireEvent.click(houseButton);
    
    expect(input.value).toBe('🏠');
  });

  test('validation message appears for invalid input', async () => {
    render(<EmojiDomainConverter />);
    const input = screen.getByPlaceholderText('🏠🌟 or 🚀💡🎯');
    
    fireEvent.change(input, { target: { value: 'emoji with spaces' } });
    
    await waitFor(() => {
      expect(screen.getByText('Domains cannot contain spaces')).toBeInTheDocument();
    });
  });

  test('copy functionality works', async () => {
    render(<EmojiDomainConverter />);
    const input = screen.getByPlaceholderText('🏠🌟 or 🚀💡🎯');
    
    fireEvent.change(input, { target: { value: '🏠' } });
    
    // Wait for conversion and copy button to appear
    await waitFor(() => {
      const copyButton = screen.getByText('Copy');
      expect(copyButton).toBeInTheDocument();
    });
    
    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  test('info section is displayed', () => {
    render(<EmojiDomainConverter />);
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText(/Emoji domains use Internationalized Domain Names/)).toBeInTheDocument();
  });

  test('handles empty input gracefully', () => {
    render(<EmojiDomainConverter />);
    const input = screen.getByPlaceholderText('🏠🌟 or 🚀💡🎯');
    
    fireEvent.change(input, { target: { value: '' } });
    
    // Should not crash or show error messages for empty input
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });
});