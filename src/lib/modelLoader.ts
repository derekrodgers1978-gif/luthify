import * as THREE from 'three'

export function logMeshDebug(scene: any) {
  scene.traverse((obj: THREE.Object3D) => {
    if (obj.isMesh) {
      const box = new THREE.Box3().setFromObject(obj)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      console.log("MESH_DEBUG", {
        name: obj.name,
        material: obj.material?.name,
        vertexCount: obj.geometry?.attributes?.position?.count,
        size: size.toArray(),
        center: center.toArray()
      })
    }
  })
}
