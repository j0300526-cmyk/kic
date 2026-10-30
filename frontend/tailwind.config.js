/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07111f',
        panel: '#0d1929',
        line: '#1d3047',
        mint: '#64f5c2',
        cyan: '#55c8ff',
        amber: '#f6c85f',
      },
      boxShadow: {
        panel: '0 20px 55px rgba(0, 0, 0, .24)',
      },
      fontFamily: {
        sans: ['Inter', 'Pretendard', 'Noto Sans KR', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
