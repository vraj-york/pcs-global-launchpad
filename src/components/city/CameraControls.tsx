import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, FlyControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCityStore } from '@/store/useCityStore';

export function CameraControls() {
  const cameraMode = useCityStore((s) => s.cameraMode);
  const flyTarget = useCityStore((s) => s.flyTarget);
  const clearFlyTarget = useCityStore((s) => s.clearFlyTarget);
  const { camera } = useThree();
  const orbitRef = useRef<{ target: THREE.Vector3; update: () => void } | null>(null);
  const animating = useRef(false);
  const animProgress = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  const endPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const endTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!flyTarget) return;

    startPos.current.copy(camera.position);
    endPos.current.set(flyTarget.x + 5, flyTarget.y + 6, flyTarget.z + 8);
    startTarget.current.copy(orbitRef.current?.target ?? new THREE.Vector3(0, 2, 0));
    endTarget.current.set(flyTarget.x, flyTarget.y, flyTarget.z);

    animating.current = true;
    animProgress.current = 0;
  }, [flyTarget, camera]);

  useFrame((_, delta) => {
    if (!animating.current || !flyTarget) return;

    animProgress.current = Math.min(animProgress.current + delta * 1.2, 1);
    const t = 1 - Math.pow(1 - animProgress.current, 3);

    camera.position.lerpVectors(startPos.current, endPos.current, t);

    if (orbitRef.current) {
      orbitRef.current.target.lerpVectors(startTarget.current, endTarget.current, t);
      orbitRef.current.update();
    }

    if (animProgress.current >= 1) {
      animating.current = false;
      clearFlyTarget();
    }
  });

  if (cameraMode === 'fly') {
    return (
      <FlyControls
        movementSpeed={8}
        rollSpeed={0.3}
        dragToLook
      />
    );
  }

  return (
    <OrbitControls
      ref={(ref) => {
        if (ref) orbitRef.current = ref;
      }}
      enablePan
      enableZoom
      enableRotate
      minDistance={5}
      maxDistance={60}
      maxPolarAngle={Math.PI / 2.1}
      target={[0, 2, 0]}
    />
  );
}
