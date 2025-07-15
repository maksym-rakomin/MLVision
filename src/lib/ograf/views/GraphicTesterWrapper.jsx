import React, { useMemo } from 'react'
import GraphicTester from './GraphicTester.jsx'

// Helper function to determine if an object should be rendered based on visibility
const isObjectVisible = (item) => {
    // Basic visibility check - can be expanded based on your requirements
    return item && item.bbox && item.bbox.length >= 4;
};

function GraphicTesterWrapper({graphic, currentFrame}) {
    // Memoize the filtered tracked objects to prevent unnecessary processing
    const visibleObjects = useMemo(() => {
        if (!currentFrame || !currentFrame.tracked_objects || !currentFrame.tracked_objects.length) {
            return [];
        }

        // Filter objects to only render those that are visible
        // This is a simple optimization - you can implement more sophisticated filtering
        return currentFrame.tracked_objects.filter(isObjectVisible);
    }, [currentFrame]);

    // If there are no visible objects, don't render anything
    if (visibleObjects.length === 0) {
        return null;
    }

    return (
        <div className="graphic-tester-wrapper">
            {visibleObjects.map((item) => (
                <GraphicTester
                    key={item.track_id}
                    graphic={graphic}
                    track={item}
                />
            ))}
        </div>
    );
}

// Memoize the wrapper component to prevent unnecessary re-renders
export default React.memo(GraphicTesterWrapper, (prevProps, nextProps) => {
    // Only re-render if the frame number changes or the graphic changes
    return (
        prevProps.graphic === nextProps.graphic &&
        prevProps.currentFrame?.frame_number === nextProps.currentFrame?.frame_number
    );
});
