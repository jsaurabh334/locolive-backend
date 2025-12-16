import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useLocation } from '../../context/LocationContext';
import { useTheme } from '../../context/ThemeContext';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in React Leaflet with Webpack/Vite
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const RecenterMap = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng]);
    }, [lat, lng, map]);
    return null;
};

const MapComponent = () => {
    const { location, error, permissionStatus } = useLocation();
    const { theme } = useTheme();
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (error) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-surface text-text-secondary p-4 text-center">
                <div>
                    <p className="mb-2">Location access is required.</p>
                    <p className="text-sm text-red-500">{error.message}</p>
                </div>
            </div>
        );
    }

    if (!location) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-surface text-text-secondary">
                <div className="flex flex-col items-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent mb-4"></div>
                    <p>Acquiring Location...</p>
                    <p className="text-xs mt-2 opacity-50">Status: {permissionStatus}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full relative">
            {/* Map Container needs explicit height in parent or self */}
            <MapContainer
                center={[location.lat, location.lng]}
                zoom={15}
                scrollWheelZoom={true}
                className="h-full w-full z-0"
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url={isDark
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    }
                />
                <Marker position={[location.lat, location.lng]}>
                    <Popup>
                        You are here.
                    </Popup>
                </Marker>
                <RecenterMap lat={location.lat} lng={location.lng} />
            </MapContainer>

            {/* Overlay Gradient for premium feel - Dynamic */}
            <div className={`absolute top-0 left-0 w-full h-24 bg-gradient-to-b ${isDark ? 'from-neutral-900' : 'from-white'} to-transparent pointer-events-none z-10`}></div>
            <div className={`absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t ${isDark ? 'from-neutral-900' : 'from-white'} to-transparent pointer-events-none z-10`}></div>
        </div>
    );
};

export default MapComponent;
