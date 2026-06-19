import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { BuildingCustomization } from '@/components/city/BuildingCustomization';
import { BuildingInstances } from '@/components/city/BuildingInstances';
import { CameraControls } from '@/components/city/CameraControls';
import { AmbientParticles, CityClouds, CityGround } from '@/components/city/CityGround';

function SceneContent() {
  return (
    <>
      <color attach="background" args={['#0a0e1a']} />
      <fog attach="fog" args={['#0a0e1a', 25, 70]} />

      <ambientLight intensity={0.35} color="#6366f1" />
      <directionalLight
        position={[12, 20, 8]}
        intensity={0.8}
        color="#c4b5fd"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-10, 8, -5]} intensity={0.4} color="#22d3ee" />
      <pointLight position={[10, 6, 10]} intensity={0.3} color="#e879f9" />

      <CityGround />
      <BuildingInstances />
      <BuildingCustomization />
      <CityClouds />
      <AmbientParticles />
      <CameraControls />
    </>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#1e293b" wireframe />
    </mesh>
  );
}

export function CityScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [18, 14, 18], fov: 50, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false }}
      className="touch-none"
    >
      <Suspense fallback={<LoadingFallback />}>
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}
