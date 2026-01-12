// frontend/src/components/LocationPicker.jsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to handle map clicks
function LocationMarker({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });

    return position ? <Marker position={position} /> : null;
}

// Component to recenter map when search changes
function MapController({ center }) {
    const map = useMap();

    useEffect(() => {
        if (center) {
            map.setView(center, 15);
        }
    }, [center, map]);

    return null;
}

/**
 * LocationPicker Component
 * Interactive map for selecting property location with search
 * 
 * @param {Function} onLocationSelect - Callback with {lat, lng, address}
 * @param {Object} initialLocation - Initial {lat, lng} position
 */
const LocationPicker = ({ onLocationSelect, initialLocation = null }) => {
    // Default to a central India location
    const defaultCenter = [20.5937, 78.9629];

    const [position, setPosition] = useState(initialLocation ? [initialLocation.lat, initialLocation.lng] : null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [mapCenter, setMapCenter] = useState(initialLocation ? [initialLocation.lat, initialLocation.lng] : defaultCenter);
    const [address, setAddress] = useState('');

    // Search for location using Nominatim (OpenStreetMap)
    const searchLocation = async () => {
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
            );
            const data = await response.json();
            setSearchResults(data);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setSearching(false);
        }
    };

    // Select a search result
    const selectResult = (result) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        setPosition([lat, lng]);
        setMapCenter([lat, lng]);
        setAddress(result.display_name);
        setSearchResults([]);
        setSearchQuery(result.display_name.split(',')[0]);

        onLocationSelect({
            lat: lat,
            lng: lng,
            address: result.display_name
        });
    };

    // Reverse geocode when position changes
    useEffect(() => {
        if (position) {
            fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position[0]}&lon=${position[1]}`
            )
                .then(res => res.json())
                .then(data => {
                    if (data.display_name) {
                        setAddress(data.display_name);
                        onLocationSelect({
                            lat: position[0],
                            lng: position[1],
                            address: data.display_name
                        });
                    }
                })
                .catch(console.error);
        }
    }, [position]);

    return (
        <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                Property Location *
            </label>

            {/* Search Box */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                    type="text"
                    className="form-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
                    placeholder="Search for a location..."
                    style={{ flex: 1 }}
                />
                <button
                    type="button"
                    onClick={searchLocation}
                    disabled={searching}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    {searching ? '...' : '🔍'}
                </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    maxHeight: '150px',
                    overflow: 'auto'
                }}>
                    {searchResults.map((result, i) => (
                        <div
                            key={i}
                            onClick={() => selectResult(result)}
                            style={{
                                padding: '10px 15px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                fontSize: '0.9rem'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            📍 {result.display_name}
                        </div>
                    ))}
                </div>
            )}

            {/* Map Container */}
            <div style={{
                height: '300px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid #e5e7eb'
            }}>
                <MapContainer
                    center={mapCenter}
                    zoom={5}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={position} setPosition={setPosition} />
                    <MapController center={mapCenter} />
                </MapContainer>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '8px' }}>
                Click on the map to select exact location, or search above
            </p>

            {/* Selected Location Display */}
            {position && (
                <div style={{
                    marginTop: '10px',
                    padding: '12px',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    border: '1px solid #10b981'
                }}>
                    <strong>Selected Location:</strong>
                    <div style={{ marginTop: '5px' }}>
                        📍 {address || 'Loading address...'}
                    </div>
                    <div style={{ color: '#6b7280', marginTop: '3px' }}>
                        Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationPicker;
