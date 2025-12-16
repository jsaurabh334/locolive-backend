import MapComponent from '../features/map/MapComponent';

import StoryRail from '../features/feed/StoryRail';

const Home = () => {
    return (
        <div className="h-screen w-full flex flex-col bg-background overflow-hidden transition-colors duration-300">
            {/* Main Content Area (Map) */}
            <div className="flex-1 relative">
                <div className="absolute top-0 left-0 w-full z-20 pt-4 bg-gradient-to-b from-background/90 to-transparent pb-8 pointer-events-none">
                    <div className="flex justify-between items-center px-4 mb-2 pointer-events-auto">
                        <h1 className="text-xl font-bold text-text-primary drop-shadow-sm">Discovery</h1>
                    </div>
                    <div className="pointer-events-auto">
                        <StoryRail />
                    </div>
                </div>
                <MapComponent />
            </div>
        </div>
    );
};

export default Home;
