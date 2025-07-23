/*
    THOTH Plugin for ATON - Scene management

    author: steliosalvanos@gmail.com

===========================================================*/

let Scene = {};


Scene.init = () => {
    Scene.initRC();
    Scene.sid = Scene.getSceneID();
};

Scene.initRC = () => {
    // Raycaster
    Scene._raycaster = new THREE.Raycaster();
    Scene._raycaster.layers.set(ATON.NTYPES.SCENE);
    Scene._raycaster.firstHitOnly = true;

    // Color propertied for face selection
    Scene.mainMesh.material.vertexColors = true;
    Scene.mainMesh.material.needsUpdate  = true;

    // Initialize vertex colors if they don't exist
    if (!Scene.mainMesh.geometry.attributes.color) {
        THOTH.log("Initializing color");
        
        const colorArray = new Float32Array(Scene.mainMesh.geometry.attributes.position.count * 3);
        colorArray.fill(THOTH.Mat.colorsThree.white); // Default white color

        const colorAttr = new THREE.BufferAttribute(colorArray, 3);
        
        Scene.mainMesh.geometry.setAttribute('color', colorAttr);
    }
};


Scene.getSceneID = (sid) => {
    if (!sid) {
        // Get sid directly from url
        const path = window.location.pathname;
        const pathArray = path.split('/');

        sid = String(pathArray[2]+'/'+pathArray[3]);
    };

    return sid;
};