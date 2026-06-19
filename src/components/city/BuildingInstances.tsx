import { useRef, useEffect, useMemo } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import {
  mockDevelopers,
  getContributionRange,
  getRepoCountRange,
  normalizeContributions,
  normalizeRepoCount,
} from '@/data/mockDevelopers';
import { useCityStore } from '@/store/useCityStore';

const GRID_SCALE = 3;

interface BuildingData {
  id: string;
  username: string;
  position: THREE.Vector3;
  scale: THREE.Vector3;
  color: THREE.Color;
  starCount: number;
  isOnline: boolean;
  index: number;
}

function computeBuildingData(): BuildingData[] {
  const contribRange = getContributionRange();
  const repoRange = getRepoCountRange();

  return mockDevelopers.map((dev, index) => {
    const height = normalizeContributions(
      dev.contributions,
      contribRange.min,
      contribRange.max
    );
    const width = normalizeRepoCount(dev.repoCount, repoRange.min, repoRange.max);

    return {
      id: dev.id,
      username: dev.username,
      position: new THREE.Vector3(
        dev.buildingPosition[0] * GRID_SCALE,
        height / 2,
        dev.buildingPosition[1] * GRID_SCALE
      ),
      scale: new THREE.Vector3(width, height, width),
      color: new THREE.Color(dev.buildingColor),
      starCount: dev.starCount,
      isOnline: dev.isOnline,
      index,
    };
  });
}

function BuildingWindows({ buildings }: { buildings: BuildingData[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);

  const { windowCount, windowData } = useMemo(() => {
    const data: { pos: THREE.Vector3; color: THREE.Color; buildingIndex: number; pulse: boolean }[] = [];

    buildings.forEach((b, bi) => {
      const litWindows = Math.min(Math.floor(b.starCount / 500) + 2, 12);
      const rows = Math.ceil(Math.sqrt(litWindows));
      const faceOffset = b.scale.x / 2 + 0.02;

      for (let i = 0; i < litWindows; i++) {
        const row = Math.floor(i / rows);
        const col = i % rows;
        const wx = b.position.x + (col - rows / 2) * 0.35;
        const wy = 0.5 + row * 0.4;
        const wz = b.position.z + faceOffset;

        data.push({
          pos: new THREE.Vector3(wx, wy, wz),
          color: new THREE.Color(b.isOnline ? '#fbbf24' : '#22d3ee'),
          buildingIndex: bi,
          pulse: b.isOnline,
        });
      }
    });

    return { windowCount: data.length, windowData: data };
  }, [buildings]);

  useEffect(() => {
    if (!meshRef.current) return;
    windowData.forEach((w, i) => {
      dummy.position.copy(w.pos);
      dummy.scale.set(0.18, 0.18, 0.05);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, w.color);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [windowData, dummy]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;

    windowData.forEach((w, i) => {
      if (!w.pulse) return;
      const pulse = 0.6 + Math.sin(timeRef.current * 2 + i) * 0.4;
      const c = new THREE.Color('#fbbf24').multiplyScalar(pulse);
      meshRef.current!.setColorAt(i, c);
    });

    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  if (windowCount === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, windowCount]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial emissive="#fbbf24" emissiveIntensity={1.5} toneMapped={false} />
    </instancedMesh>
  );
}

export function BuildingInstances() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const buildings = useMemo(() => computeBuildingData(), []);

  const hoveredId = useCityStore((s) => s.hoveredDeveloperId);
  const selectedId = useCityStore((s) => s.selectedDeveloperId);
  const setHovered = useCityStore((s) => s.setHoveredDeveloper);
  const setSelected = useCityStore((s) => s.setSelectedDeveloper);

  useEffect(() => {
    if (!meshRef.current) return;

    buildings.forEach((b, i) => {
      const isHovered = hoveredId === b.id;
      const isSelected = selectedId === b.id;
      const scaleBoost = isHovered || isSelected ? 1.08 : 1;

      dummy.position.copy(b.position);
      dummy.scale.set(
        b.scale.x * scaleBoost,
        b.scale.y * (isSelected ? 1.02 : 1),
        b.scale.z * scaleBoost
      );
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      let color = b.color.clone();
      if (isHovered || isSelected) {
        color = color.lerp(new THREE.Color('#ffffff'), 0.25);
      }
      meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [buildings, hoveredId, selectedId, dummy]);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      setHovered(buildings[e.instanceId].id);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setHovered(null);
    document.body.style.cursor = 'default';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      setSelected(buildings[e.instanceId].id);
    }
  };

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, buildings.length]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial vertexColors roughness={0.7} metalness={0.15} />
      </instancedMesh>
      <BuildingWindows buildings={buildings} />
    </group>
  );
}

export { computeBuildingData, GRID_SCALE };
