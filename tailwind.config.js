export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1F2420',
        muted: '#5E675F',
        linen: '#F3F0E8',
        surface: '#FAF8F3',
        herb: {
          DEFAULT: '#4F6B4A',
          deep: '#3A5238',
        },
        sage: '#D8E0D0',
        line: '#DDD8CC',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.28s ease-out forwards',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'typing-dot': 'typingDot 0.56s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        typingDot: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
};
