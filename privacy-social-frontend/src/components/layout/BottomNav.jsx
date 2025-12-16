import { Link, useLocation } from 'react-router-dom';

const BottomNavItem = ({ to, icon, label, isActive }) => (
    <Link
        to={to}
        className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${isActive ? 'text-primary-500 scale-110' : 'text-text-tertiary hover:text-text-primary'
            }`}
    >
        <div className={`w-6 h-6 transition-transform duration-300 ${isActive ? '-translate-y-0.5' : ''}`}>
            {icon}
        </div>
        {isActive && (
            <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary-500 opacity-80 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
        )}
    </Link>
);

const BottomNav = () => {
    const { pathname } = useLocation();

    const navItems = [
        {
            to: '/',
            label: 'Home',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
            )
        },
        {
            to: '/explore',
            label: 'Explore',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
            )
        },
        {
            to: '/create-story',
            label: 'Post',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            )
        },
        {
            to: '/connections',
            label: 'Friends',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
            )
        },
        {
            to: '/profile',
            label: 'Profile',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
            )
        }
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-black/30 backdrop-blur-xl border-t border-white/20 dark:border-white/10 z-50 pb-safe transition-all duration-300">
            <div className="grid grid-cols-5 h-full relative">
                {/* Active Indicator Background - Optional enhancement could go here */}
                {navItems.map((item) => (
                    <BottomNavItem
                        key={item.to}
                        {...item}
                        isActive={pathname === item.to}
                    />
                ))}
            </div>
        </nav>
    );
};

export default BottomNav;
