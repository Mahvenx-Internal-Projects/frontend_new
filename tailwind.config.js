export default {
  content: ['./index.html','./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:'#eef2ff', 100:'#e0e7ff', 200:'#c7d2fe',
          300:'#a5b4fc', 400:'#818cf8', 500:'#6366f1',
          600:'#4f46e5', 700:'#4338ca', 800:'#3730a3', 900:'#312e81'
        }
      },
      fontFamily: { sans: ['Inter var','Inter','system-ui','sans-serif'] },
    animation: { marquee: 'marquee 20s linear infinite' },
    keyframes: { marquee: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(-100%)' } } }
    }
  }
}
