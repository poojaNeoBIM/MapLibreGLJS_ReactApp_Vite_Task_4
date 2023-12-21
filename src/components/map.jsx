import React, { useRef, useEffect, useState } from "react";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import "@babylonjs/materials";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "../css/map.css";

// Define a functional component named 'Map'
export default function Map() {
  // useRef to store references to the DOM elements
  const mapContainer = useRef(null); // Reference for the map container div
  const map = useRef(null); // Reference for the map object
  const LONG = 148.9819; // Longitude for the map's center
  const LAT = -35.3981; // Latitude for the map's center
  const ZOOM = 18; // Initial zoom level for the map
  const PINCH = 60; // Pinch zoom sensitivity
  const API_KEY = "p47xAmvxV6awt2xre9CN"; // API key for map services
  const [mapType, setMapType] = useState("topographic"); // State to manage the current type of map
  const [searchAddress, setSearchAddress] = useState(""); // State for the search input
  const [cubeDimensions, setCubeDimensions] = useState({ length: 1, breadth: 1, height: 1 });
  const [cubePosition, setCubePosition] = useState({ x: 0, y: 0, z: 0 });
  // Refs for the cube, gizmo, and utility layer
  const cubeRef = useRef(null);
  const sceneRef = useRef(null);  // Ref for the Babylon scene
  const utilLayerRef = useRef(null); // Add a ref for the utility layer

  // State to manage the X position of the cube
  const [cubeX, setCubeX] = useState(0);
  
 





  // Function to move the cube along the X-axis
  const moveCube = (direction) => {
    setCubeX(prevX => prevX + direction * parseFloat(cubeDimensions.length));
  };


  // configuration of the custom layer for a 3D model per the CustomLayerInterface
  const customLayer = {
    id: "3d-model",
    type: "custom",
    renderingMode: "3d",

    // Initialize Babylon.js engine and scene
    onAdd: function(map, gl)  {
      // Initialize Babylon.js engine and scene
      this.engine = new BABYLON.Engine(gl, true, { preserveDrawingBuffer: true, stencil: true });
      this.scene = new BABYLON.Scene(this.engine);
      sceneRef.current = this.scene;
      this.scene.autoClear = false; // Prevents clearing the canvas on each frame
      this.scene.detachControl(); // Detach default camera controls

      // Pre-render setup
      this.scene.beforeRender = () => {
        this.engine.wipeCaches(true);
      };

      // create simple camera (will have its project matrix manually calculated)
      this.camera = new BABYLON.Camera(
        "Camera",
        new BABYLON.Vector3(0, 0, 0),
        this.scene
      );

      // create simple light
      const light = new BABYLON.HemisphericLight(
        "light1",
        new BABYLON.Vector3(0, 0, 100),
        this.scene
      );
      light.intensity = 0.7;

      // Add debug axes viewer, positioned at origin, 10 meter axis lengths
      new BABYLON.AxesViewer(this.scene, 10);

      // load GLTF model in to the scene
      BABYLON.SceneLoader.LoadAssetContainerAsync(
        "https://maplibre.org/maplibre-gl-js/docs/assets/34M_17/34M_17.gltf",
        "",
        this.scene
      ).then((modelContainer) => {
        modelContainer.addAllToScene();

        const rootMesh = modelContainer.createRootMesh();

        // If using maplibre.js coordinate system (+z up)
        //rootMesh.rotation.x = Math.PI/2

        // Create a second mesh
        const rootMesh2 = rootMesh.clone();

        // Position in babylon.js coordinate system
        rootMesh2.position.x = 25; // +east, meters
        rootMesh2.position.z = 25; // +north, meters
      });

      this.map = map;
    },
    render(gl, matrix) {
      // Calculate the camera matrix
      const cameraMatrix = BABYLON.Matrix.FromArray(matrix);

      // world-view-projection matrix
      const wvpMatrix = worldMatrix.multiply(cameraMatrix);

      this.camera.freezeProjectionMatrix(wvpMatrix);

      this.scene.render(false);
      this.map.triggerRepaint();
    },
  };

  // Function to create the cube
  const createCube = () => {
      const { length, breadth, height } = cubeDimensions;
      const l = parseFloat(length);
      const b = parseFloat(breadth);
      const h = parseFloat(height);
      const { x, y, z } = cubePosition;
    
      // Create a Babylon.js box (cube)
      const box = BABYLON.MeshBuilder.CreateBox("cube", { width: l, depth: b, height: h }, customLayer.scene);
    
      // Position the cube at the specified coordinates
      box.position = new BABYLON.Vector3(x, y + h / 2, z);
    
      // Add a bright color for visibility
      const material = new BABYLON.StandardMaterial("cubeMaterial", customLayer.scene);
      material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red for visibility
      box.material = material;

      // Store the created cube in the ref for later access
      cubeRef.current = box;

      // If a gizmo already exists, attach it to the new cube
      if (gizmoRef.current) {
        gizmoRef.current.attachedMesh = cubeRef.current;
    };

    if (sceneRef.current) {
        const { length, breadth, height } = cubeDimensions;
        const box = BABYLON.MeshBuilder.CreateBox("cube", { width: length, depth: breadth, height: height }, sceneRef.current);
        box.position = new BABYLON.Vector3(cubeX, 0, 0); // Use cubeX state
        cubeRef.current = box;
    };
  };

  
  // Function to handle button press for moving the cube
  const handleMovePress = (direction) => {
    moveInterval = setInterval(() => moveCubeX(direction), 100);
  };

  // Function to handle button release
  const handleMoveRelease = () => {
    clearInterval(moveInterval);
  };

  let moveInterval; // Interval for moving the cube
  
  
  // World matrix parameters for 3D rendering
  const worldOrigin = [LONG, LAT]; // World origin coordinates
  const worldAltitude = 0; // Altitude for the 3D world

  // Maplibre.js default coordinate system (no rotations)
  // +x east, -y north, +z up
  //var worldRotate = [0, 0, 0];

  // Babylon.js default coordinate system
  // +x east, +y up, +z north

  // Rotation matrix for Babylon.js (changing coordinate system)
  const worldRotate = [Math.PI / 2, 0, 0];

  // Calculate mercator coordinates and scale for the 3D world
  const worldOriginMercator = maplibregl.MercatorCoordinate.fromLngLat(
    worldOrigin,
    worldAltitude
  );
  const worldScale = worldOriginMercator.meterInMercatorCoordinateUnits();

  // Calculate the world matrix for 3D transformations
  const worldMatrix = BABYLON.Matrix.Compose(
    new BABYLON.Vector3(worldScale, worldScale, worldScale),
    BABYLON.Quaternion.FromEulerAngles(
      worldRotate[0],
      worldRotate[1],
      worldRotate[2]
    ),
    new BABYLON.Vector3(
      worldOriginMercator.x,
      worldOriginMercator.y,
      worldOriginMercator.z
    )
  );

  // useEffect hook to initialize or update the map
  useEffect(() => {

    // Update cube position when cubeX state changes
    if (cubeRef.current) {
      cubeRef.current.position.x = cubeX;
    };
  

  // Function to move the cube along the X-axis
  const moveCube = (direction) => {
        setCubeX(prevX => prevX + direction * parseFloat(cubeDimensions.length));
    };

    if (map.current) {
      // Set any other attributes that need changing here
      map.current.setStyle(getStyleUrl(mapType));
      // Add click event listener
    map.current.on('click', (e) => {
      const clickLngLat = [e.lngLat.lng, e.lngLat.lat];
      const mercatorCoord = maplibregl.MercatorCoordinate.fromLngLat(clickLngLat, 0);
      setCubePosition({
        x: mercatorCoord.x * worldScale,
        y: 0,
        z: mercatorCoord.y * worldScale
      });
    });
      return;
    }

    // Initialize Maplibre map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getStyleUrl(mapType), // Map style based on the current map type
      center: [LONG, LAT], // Example center coordinates
      zoom: ZOOM,
      pinch: PINCH,
      pitch: 60 // Initial pitch
    });

    // Add the custom 3D layer when the map style loads
    map.current.on("style.load", () => {
      map.current.addLayer(customLayer);
    });
  
    
  }, [mapType, cubeDimensions, searchAddress, cubeX]);

  // Function to get the style URL based on the map type
  const getStyleUrl = (type) => {
    // Switch case to return the appropriate style URL
    switch (type) {
      case "topographic":
        return `https://api.maptiler.com/maps/basic-v2/style.json?key=${API_KEY}`;
      case "satellite":
        return `https://api.maptiler.com/maps/satellite/style.json?key=${API_KEY}`;
      case "3Dbuildings":
        return `https://api.maptiler.com/maps/e3502d9d-91d8-41e3-ab8d-de7965bc0fde/style.json?key=${API_KEY}`;
      case "Terrain":
        return `https://api.maptiler.com/maps/winter-v2/style.json?key=${API_KEY}`;
      default:
        return `https://api.maptiler.com/maps/basic-v2/style.json?key=${API_KEY}`;
    }
  };

  // Function to handle changing the map type
  const handleMapTypeChange = (type) => {
    setMapType(type);
  };

  // Function to handle search
  const handleSearch = async () => {
    if (!searchAddress) return;
    const query = encodeURIComponent(searchAddress);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        map.current.flyTo({
          center: [lon, lat],
          zoom: ZOOM,
        });
      }
    } catch (error) {
      console.error('Error during geocoding:', error);
    }
  };


  // Render the map and map options in the UI
  return (
    <>
      {/* Top bar for controls */}
      <div id="topBar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        {/* Dropdown for map type selection and Cube Controls */}
        <div id="controlsContainer" style={{ display: 'flex' }}>
          <div id="mapOptions" style={{ marginRight: '20px' }}>
            <select onChange={(e) => handleMapTypeChange(e.target.value)}>
              <option value="topographic">Topographic Map</option>
              <option value="satellite">Satellite Map</option>
              <option value="3Dbuildings">3D Building Map</option>
              <option value="Terrain">Terrain Map</option>
            </select>
          </div>
          <div id="cubeControls">
            <input
              type="number"
              placeholder="Length"
              value={cubeDimensions.length}
              onChange={(e) => setCubeDimensions({ ...cubeDimensions, length: e.target.value })}
            />
            <input
              type="number"
              placeholder="Breadth"
              value={cubeDimensions.breadth}
              onChange={(e) => setCubeDimensions({ ...cubeDimensions, breadth: e.target.value })}
            />
            <input
              type="number"
              placeholder="Height"
              value={cubeDimensions.height}
              onChange={(e) => setCubeDimensions({ ...cubeDimensions, height: e.target.value })}
            />
            <button onClick={createCube}>Create Cube</button>

            {/* Frame for moving cube on X-axis */}
            <div style={{ marginLeft: '10px' }}>
              <span>Move on X-axis: </span>
              <button onClick={() => moveCube(1)}>+</button>
              <button onClick={() => moveCube(-1)}>-</button>
            </div>
          </div>
        </div>
  
        {/* Search Bar */}
        <div id="searchContainer">
          <input
            type="text"
            placeholder="Search address..."
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
      </div>
  
      {/* Map Container */}
      <div className="map-wrap">
        <div ref={mapContainer} className="map" />
      </div>
    </>
  );
  
  
}