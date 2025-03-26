// renders an STL 3D model preview using three.js inside a canvas element
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

function STLPreview({ filePath }) {
  const mountRef = useRef(null); // reference to the div where the canvas will mount

  useEffect(() => {
    const mount = mountRef.current;

    // create the scene and set background to powder blue
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#b0e0e6");

    // setup the camera with perspective projection
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 100);

    // initialize renderer and append it to the mount div
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(400, 400);
    mount.appendChild(renderer.domElement);

    // add soft hemisphere lighting for ambient fill
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemisphereLight);

    // add directional light to show surface details
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1.6, 1.4).normalize();
    scene.add(directionalLight);

    // setup orbit controls so user can rotate and zoom the model
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.screenSpacePanning = true;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;

    // load the STL file using STLLoader
    const loader = new STLLoader();
    loader.load(
      `file://${filePath}`, // load from local file system
      (geometry) => {
        const material = new THREE.MeshStandardMaterial({ color: 0x00aaff });
        const mesh = new THREE.Mesh(geometry, material);

        // center the geometry in the view
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        mesh.position.sub(center);

        scene.add(mesh);
        animate();
      },
      undefined,
      (error) => {
        console.error("Error loading STL:", error);
      }
    );

    // start the render loop (user can rotate/zoom using OrbitControls)
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    // cleanup the renderer and controls when component unmounts
    return () => {
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [filePath]);

  // return the container for the WebGL canvas
  return (
    <div ref={mountRef} style={{ borderRadius: "8px", marginTop: "10px" }} />
  );
}

export default STLPreview;
