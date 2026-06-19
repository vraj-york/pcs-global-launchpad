import { useMemo } from 'react';
import * as THREE from 'three';
import { Grid } from '@react-three/drei';

export function CityGround() {
  const gridConfig = useMemo(
    () => ({
      cellSize: 3,
      cellThickness: 0.6,
      cellColor: '#1e293b',
      sectionSize: 9,
      sectionThickness: 1.2,
      sectionColor: '#334155',
      fadeDistance: 45,
      fadeStrength: 1.5,
      infiniteGrid: true,
    }),
    []
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0.1} />
      </mesh>
      <Grid {...gridConfig} position={[0, 0.01, 0]} />
    </group>
  );
}

export function CityClouds() {
  const cloudPositions: [number, number, number][] = [
    [-15, 12, -10],
    [20, 14, 5],
    [-8, 16, 18],
  ];

  return (
    <group>
      {cloudPositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[6, 1.2, 2.5]} />
          <meshStandardMaterial color="#1e293b" transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

export function AmbientParticles() {
  const positions = useMemo(() => {
    const arr = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 50;
      arr[i * 3 + 1] = Math.random() * 20 + 2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={60}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#22d3ee" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

export function createBuildingColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}
