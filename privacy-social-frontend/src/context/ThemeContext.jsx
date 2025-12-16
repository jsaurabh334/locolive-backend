import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
    // Initialize state from local storage or default to 'auto'
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'auto';
        }
        return 'auto';
    });

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove existing class
        root.classList.remove('light', 'dark');

        if (theme === 'system' || theme === 'auto') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
            return;
        }

        root.classList.add(theme);
    }, [theme]);

    // Handle system theme changes when in auto mode
    useEffect(() => {
        if (theme !== 'auto' && theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(mediaQuery.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const value = {
        theme,
        setTheme: (newTheme) => {
            setTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        },
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
