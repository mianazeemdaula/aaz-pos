/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0fdfa',
                    100: '#ccfbf1',
                    200: '#99f6e4',
                    300: '#5eead4',
                    400: '#14b8a6',
                    500: '#0d9488',
                    600: '#0f766e',
                    700: '#115e59',
                    800: '#134e4a',
                    900: '#0c3c38',
                },
                secondary: {
                    50: '#f5f3fc',
                    100: '#eae5f8',
                    200: '#d5ccf1',
                    300: '#b8a7e5',
                    400: '#9679d6',
                    500: '#7050c2',
                    600: '#5438a0',
                    700: '#3f2a7c',
                    800: '#281c59',
                    900: '#1a1040',
                },
                brand: {
                    teal: '#0f766e',
                    'light-teal': '#0d9488',
                    green: '#10b981',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
