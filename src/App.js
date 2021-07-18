import React, { useState, useEffect, useRef, useCallback } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { StaticMap } from "react-map-gl";
import DeckGL from "@deck.gl/react";
import { TripsLayer } from "@deck.gl/geo-layers";
import SlidingPanel from "react-sliding-side-panel";
import tripDetails from "./data/route.json";
import { IconLayer } from "@deck.gl/layers";
import "react-sliding-side-panel/lib/index.css";

const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoiYnJpYW5iYW5jcm9mdCIsImEiOiJsVGVnMXFzIn0.7ldhVh3Ppsgv4lCYs65UdA";

const ICON_MAPPING = {
  marker: { x: 0, y: 0, width: 128, height: 128, mask: true },
};

const INITIAL_VIEW_STATE = {
  longitude: 174.7078,
  latitude: -36.722,
  zoom: 14.25,
  pitch: 45,
  bearing: 0,
  width: "100vw",
  height: "100vh",
};

function App() {
  const [openPanel, setOpenPanel] = useState(false);
  const [tripData, setTriptData] = useState([]);
  const [origDestPoints, setOrigDestPoints] = useState([]);
  const [showTrip, setShowTrip] = useState(false);
  const [selectedTrips, setSelectedTrips] = useState([]);
  const [time, setTime] = useState(0);
  const animationRef = useRef();
  const maxTimeLengthRef = useRef();
  const trailLength = 180;

  const [animation] = useState({});

  useEffect(() => {
    const trips = [];

    tripDetails.forEach((data) => {
      const path = [];
      const timestamps = [];
      let trip = {};

      trip["name"] = data.name;
      data["co-ordinates"].forEach((point, index) => {
        path.push([point[1], point[0]]);
        timestamps.push((index + 1) * 10);
      });

      trip["path"] = path;
      trip["timestamps"] = timestamps;
      trips.push(trip);
      setTriptData(trips);
    });
  }, []);

  const animate = useCallback(() => {
    if (maxTimeLengthRef.current > 0 && showTrip) {
      setTime((time) => (time > maxTimeLengthRef.current * 10 ? 1 : time + 2));

      animationRef.current = requestAnimationFrame(animate);
    }
  }, [showTrip]);

  useEffect(() => {
    if (!showTrip) {
      setTime(0);
      cancelAnimationFrame(animationRef.current);
      maxTimeLengthRef.current = 0;
      return;
    }

    maxTimeLengthRef.current = selectedTrips.reduce(
      (acc, item) => Math.max(acc, item.path.length),
      0
    );

    if (showTrip) {
      cancelAnimationFrame(animationRef.current); // cancel any previous animationFrames before starting new one
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [animate, animation, showTrip, selectedTrips]);

  const layers = [
    showTrip
      ? new TripsLayer({
          id: "trips",
          data: selectedTrips,
          getPath: (d) => d.path,
          getTimestamps: (d) => d.timestamps,
          getColor: (d) => [255, 255, 0, 255],
          opacity: 0.5,
          widthMinPixels: 12,
          rounded: true,
          trailLength,
          currentTime: time,
          shadowEnabled: false,
        })
      : null,

    new IconLayer({
      id: "icon-layer",
      data: origDestPoints,
      pickable: true,
      // iconAtlas and iconMapping are required
      // getIcon: return a string
      iconAtlas:
        "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png",
      iconMapping: ICON_MAPPING,
      getIcon: (d) => "marker",

      sizeScale: 5,
      getPosition: (d) => d.coords,
      getSize: (d) => 5,
      getColor: (d) => (d.place === "orig" ? [250, 250, 0] : [0, 0, 255]),
    }),
  ];

  const handleOnChange = (e) => {
    let existingSelectedTrips = [...selectedTrips];
    let selectedTripName = e.target.name;
    const startendcoords = [];

    let trip = existingSelectedTrips.find((t) => t.name === selectedTripName);
    // if exists remove it
    if (trip) {
      existingSelectedTrips = existingSelectedTrips.filter(
        (t) => t.name !== selectedTripName
      );

      existingSelectedTrips.forEach((data) => {
        let length = data["path"].length;
        startendcoords.push({ place: "orig", coords: data["path"][0] });
        startendcoords.push({
          place: "dest",
          coords: data["path"][length - 1],
        });
      });
    } else {
      const selectedTrip = tripData.find((t) => t.name === selectedTripName);
      existingSelectedTrips.push(selectedTrip);

      existingSelectedTrips.forEach((data) => {
        let length = data["path"].length;
        startendcoords.push({ place: "orig", coords: data["path"][0] });
        startendcoords.push({
          place: "dest",
          coords: data["path"][length - 1],
        });
      });
    }

    setSelectedTrips([...existingSelectedTrips]);
    setOrigDestPoints([...startendcoords]);
  };

  const isSelectedTrip = (selectedTripName) => {
    let trip = selectedTrips.find((t) => t.name === selectedTripName);
    if (trip) {
      return true;
    } else {
      return false;
    }
  };

  return (
    <div className="App">
      <DeckGL
        layers={layers}
        controller={true}
        initialViewState={INITIAL_VIEW_STATE}
        useDevicePixels={false}
      >
        <StaticMap
          reuseMaps
          mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
          mapStyle={"mapbox://styles/mapbox/dark-v9"}
          preventStyleDiffing={true}
        />
        <div>
          <div>
            <button onClick={() => setOpenPanel(true)}>></button>
          </div>
          <SlidingPanel type={"left"} isOpen={openPanel} size={30}>
            <div style={{ background: "#fff", width: "225px" }}>
              <div style={{ marginLeft: "195px" }}>
                <button onClick={() => setOpenPanel(false)}>X</button>
              </div>
              <div style={{ marginLeft: "120px" }}>
                <input
                  type="checkbox"
                  checked={showTrip}
                  name="showTrip"
                  onChange={(e) => setShowTrip(!showTrip)}
                />{" "}
                Show Trip
              </div>
              {tripDetails.map((t, index) => {
                let name = t.name;
                return (
                  <div key={index}>
                    <input
                      type="checkbox"
                      name={t.name}
                      checked={isSelectedTrip(name)}
                      onChange={(e) => handleOnChange(e)}
                    />
                    {t.name}
                  </div>
                );
              })}
            </div>
          </SlidingPanel>
        </div>
      </DeckGL>
    </div>
  );
}

export default App;
