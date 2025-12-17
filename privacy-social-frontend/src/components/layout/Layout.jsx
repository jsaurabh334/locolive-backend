import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import RightSidebar from './RightSidebar';

const Layout = () => {
    return (
        <div className="min-h-screen bg-background text-text-primary font-sans antialiased selection:bg-primary-500/30">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            {/* md:pl-64 matches sidebar width. pb-16 matches bottom nav height for mobile. */}
            <main className="md:pl-64 lg:pl-72 xl:pr-80 pb-16 md:pb-0 min-h-screen transition-all duration-200 ease-in-out">
                <div className="mx-auto max-w-2xl min-h-screen relative">
                    <Outlet />
                </div>

                <RightSidebar />
            </main>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden">
                <BottomNav />
            </div>
        </div>
    );
};

export default Layout;
