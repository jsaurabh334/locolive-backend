import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

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

                {/* Desktop Right Sidebar Placeholder (Future) */}
                <div className="hidden xl:block fixed right-0 top-0 bottom-0 w-80 border-l border-border bg-surface/30 backdrop-blur-sm p-6 overflow-y-auto">
                    {/* Placeholder for "Who to follow", "Trending", or "Chat list" */}
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-sm font-bold text-text-secondary mb-4 uppercase tracking-wider">Suggested for you</h3>
                            {/* Skeletons/Placeholders */}
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-neutral-800" />
                                        <div className="flex-1">
                                            <div className="h-3 w-24 bg-neutral-800 rounded mb-1" />
                                            <div className="h-2 w-16 bg-neutral-800 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden">
                <BottomNav />
            </div>
        </div>
    );
};

export default Layout;
