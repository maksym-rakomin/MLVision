import { useEffect, useRef, useState } from 'react';
import { InfoCard } from './components/InfoCard.jsx';

export const Overlays = ({ data = [] }) => {
    const lastDefinedData = useRef([]);
    const [visibleData, setVisibleData] = useState([]);

    useEffect(() => {
        if (Array.isArray(data) && data.length > 0) {
            lastDefinedData.current = data;
            setVisibleData(data);
        } else {
            setVisibleData(lastDefinedData.current);
        }
    }, [data]);

    if (!visibleData || visibleData.length === 0) {
        return null;
    }

    return (
        <div className="absolute inset-0 border-amber-500 border-2">
            {visibleData.map(item => (
                <InfoCard key={item.id} data={item} />
            ))}
        </div>
    );
};
