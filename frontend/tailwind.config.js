/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0E11',
        panel: '#181A20',
        surface: '#1E2329',
        line: '#2B3139',
        mint: '#F0B90B',
        cyan: '#2EBDFF',
        amber: '#F0B90B',
        positive: '#0ECB81',
        negative: '#F6465D',
        muted: '#848E9C',
      },
      boxShadow: {
        panel: '0 8px 24px rgba(0, 0, 0, .18)',
      },
      fontFamily: {
        sans: ['Inter', 'Pretendard', 'Noto Sans KR', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
