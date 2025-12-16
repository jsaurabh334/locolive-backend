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
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9', // Sky blue as primary
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                surface: {
                    DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
                    elevated: 'rgb(var(--color-surface-elevated) / <alpha-value>)',
                    hover: 'rgb(var(--color-surface-hover) / <alpha-value>)',
                },
                text: {
                    primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
                    secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
                    tertiary: 'rgb(var(--color-text-tertiary) / <alpha-value>)',
                },
                border: 'rgb(var(--color-border) / <alpha-value>)',
            },
        },
    },
    plugins: [],
}
