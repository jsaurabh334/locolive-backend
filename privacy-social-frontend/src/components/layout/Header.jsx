import { useNavigate } from 'react-router-dom';

const Header = ({ title, rightAction }) => {
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 z-40 w-full bg-surface/80 backdrop-blur-md border-b border-border">
            <div className="flex items-center justify-between px-4 h-14 md:h-16 max-w-7xl mx-auto">
                {/* Left / Title */}
                <div className="flex items-center gap-3">
                    <h1 className="text-lg md:text-xl font-bold text-text-primary truncate">
                        {title || 'Privacy Social'}
                    </h1>
                </div>

                {/* Right Action */}
                <div className="flex items-center gap-2">
                    {rightAction}
                </div>
            </div>
        </header>
    );
};

export default Header;
