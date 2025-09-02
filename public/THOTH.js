/*
THOTH Plugin for ATON

author: steliosalvanos@gmail.com

===========================================================*/

let THOTH = new ATON.Flare("thoth");

THOTH.FE      = FE;
THOTH.HIS     = HIS;
THOTH.Toolbox = Toolbox;
THOTH.Utils   = Utils;
THOTH.Scene   = Scene;


// Flare setup

THOTH.setup = async () => {
    THOTH._bLeftMouseDown = false;
    
    THOTH._bPauseQuery  = false;
    THOTH._bLoading     = true;
    THOTH._bAtonReady   = false;
    THOTH._bSynced      = false;

    ATON.on("AllNodeRequestsCompleted", () => {
        THOTH._bAtonReady = true;
    });
    
    // ATON Overhead
    await THOTH._parseAtonElements();
    
    // Scene
    THOTH.Scene.init();
    THOTH.initRC();
    
    // History
    THOTH.HIS.init();
    
    // Photon sync
    if (THOTH._numUsers > 1) {
        THOTH.firePhoton("readyToSync");
        while (!THOTH._bSynced) {
            await new Promise(resolve => setTimeout(resolve, 100));
        };
    }
    
    // Toolbox
    THOTH.Toolbox.init();
    
    // Front End
    THOTH.FE.init();
    
    // Event listeners
    THOTH.initEventListeners();
    
    // Display
    THOTH.updateVisibility();

    THOTH.log("THOTH ready!");
};

THOTH.update = () => {
    if (THOTH._bPauseQuery) return;

    THOTH._queryData = ATON._queryDataScene;
};


// Inits

THOTH._parseAtonElements = async () => {
    // Remove ATON overhead -> transfer functionalities and variables
    while (!THOTH._bAtonReady) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    THOTH.log("Transfering functionalities from ATON");

    // ATON
    THOTH._scene = ATON._mainRoot;

    const getMainMesh = () => {
        let mesh = null;
        THOTH._scene.traverse(obj => {
            if (obj.isMesh && !mesh) mesh = obj;
        });
        return mesh;
    };
    THOTH.mainMesh = getMainMesh();
    
    THOTH._queryData    = ATON._queryDataScene;
    THOTH._renderer     = ATON._renderer;
    THOTH._rcScene      = ATON._rcScene;
    THOTH.RCLayer       = ATON.NTYPES.SCENE;
    THOTH._bPauseQuery  = ATON._bPauseQuery;
    THOTH._colorSpace   = ATON._stdEncoding;
    THOTH.getSceneNode  = ATON.getSceneNode;

    THOTH._shiftDown    = ATON._kModShift;
    THOTH._cntrlDown    = ATON._kModCtrl;

    THOTH._bListenKeyboardEvents = ATON._bListenKeyboardEvents;

    // Scene
    THOTH.Scene.MODE_ADD    = 0;
    THOTH.Scene.MODE_DEL    = 1;

    THOTH.Scene.patch       = ATON.SceneHub.patch;
    THOTH.Scene.load        = ATON.SceneHub.load;
    THOTH.Scene.currData    = ATON.SceneHub.currData;

    // EventHub
    THOTH.on    = ATON.on;
    THOTH.fire  = ATON.fire;

    THOTH.discardAtonEventHandler = ATON.EventHub.clearEventHandlers;
    
    // Nav
    THOTH._camera           = ATON.Nav._camera;
    THOTH.setUserControl    = ATON.Nav.setUserControl;

    // Photon
    THOTH.firePhoton    = ATON.Photon.fire;
    THOTH.onPhoton      = ATON.Photon.on;
    THOTH._numUsers     = ATON.Photon._numUsers;

    // Utils
    THOTH._mSelectorSphere  = ATON.SUI._mSelectorSphere;
    THOTH.textureLoader     = ATON.Utils.textureLoader;
};

THOTH.initRC = () => {
    // Raycaster
    THOTH._raycaster = new THREE.Raycaster();
    THOTH._raycaster.layers.set(THOTH.RCLayer);
    THOTH._raycaster.firstHitOnly = true;

    if (!THOTH.mainMesh.geometry.boundsTree) {
        console.log("No bounds tree, computing bounds tree");
        THOTH.mainMesh.geometry.computeBoundsTree();
    }

    // Color propertied for face selection
    THOTH.mainMesh.material.vertexColors = true;
    THOTH.mainMesh.material.needsUpdate  = true;

    // Initialize vertex colors if they don't exist
    if (!THOTH.mainMesh.geometry.attributes.color) {
        let colorArray, colorAttr;
        
        const defaultColor = new THREE.Color(0xffffff);

        colorArray = new Float32Array(THOTH.mainMesh.geometry.attributes.position.count * 3);
        for (let i = 0; i < THOTH.mainMesh.geometry.attributes.position.count; i++) {
            colorArray[i * 3 + 0] = defaultColor.r;
            colorArray[i * 3 + 1] = defaultColor.g;
            colorArray[i * 3 + 2] = defaultColor.b;
        }

        colorAttr = new THREE.BufferAttribute(colorArray, 3);
        
        THOTH.mainMesh.geometry.setAttribute('color', colorAttr);
    }
};

THOTH.initEventListeners = () => {
    let el = THOTH._renderer.domElement;
    let w  = window;
    
    el.addEventListener('resize', () => {
        THOTH._camera.aspect = w.innerWidth / w.innerHeight;
        THOTH._camera.updateProjectionMatrix();
        THOTH._renderer.setSize(w.innerWidth, w.innerHeight);
    }, false)
    
    el.addEventListener('mousemove', (e) => {
        Toolbox._updateScreenMove(e);
    }, false);
    
    el.addEventListener('mousedown', (e) => {
        if (e.button === 0) THOTH._bLeftMouseDown = true;
        if (e.button === 2) THOTH._bRightMouseDown = true;
    }, false);
    
    el.addEventListener('mouseup', (e) => {
        el.style.cursor = 'default';
        
        if (e.button === 0) THOTH._bLeftMouseDown = false;
        if (e.button === 2) THOTH._bRightMouseDown = false;
    }, false);

    // --- FOR DEMO ---

    // Discard all aton keybinds and re-establish only the relevant ones
    THOTH.discardAtonEventHandler("KeyPress");
    THOTH.discardAtonEventHandler("KeyUp");

    THOTH.on("KeyPress", (k) => {
        // Settings
        if (k === ' ' || k === 'Space') HATHOR.popupSettings();

        if (k === 'u') ATON.FE.popupUser();
        
        // Current tasks
        if (k === 'Enter')  HATHOR.finalizeCurrentTask();
        if (k === 'Escape') HATHOR.cancelCurrentTask();

        // Semantic annotations
        if (k === 'a'){
            if (ATON._bqScene) ATON._handleQueryScene();
            ATON.SemFactory.stopCurrentConvex();
            HATHOR.popupAddSemantic(ATON.FE.SEMSHAPE_SPHERE);
        }
        if (k === 's'){
            if (ATON._bqScene) ATON._handleQueryScene();
            ATON.SemFactory.addSurfaceConvexPoint();
        }

        // Environment
        if (k === 'l'){
            ATON.FE.controlLight(true);
        }

        // Measurements
        if (k === 'm'){
            if (ATON._bqScene) ATON._handleQueryScene();
            HATHOR.measure();
        }

        // Nav
        if (k === "Shift") {
            THOTH._shiftDown = true;
            if (THOTH.Toolbox.enabled) THOTH.setUserControl(true);
            else THOTH.setUserControl(false);
        }
        if (k === "Control") {
            THOTH._cntrlDown = true;
            if (THOTH.Toolbox.enabled) THOTH.setUserControl(true);
            else THOTH.setUserControl(false);
        }

        // Toolbox
        if (k === 'b'){
            THOTH.Toolbox.activateBrush();
            THOTH.setUserControl(false);
        }
        if (k === 'e'){
            THOTH.Toolbox.activateEraser();
            THOTH.setUserControl(false);
        }
        if (k === 'q'){
            THOTH.Toolbox.activateLasso();
            THOTH.setUserControl(false);
        }
        if (k === 'n'){
            THOTH.Toolbox.deactivate();
            THOTH.setUserControl(true);
        }

        // UI
        if (k === '-') THOTH.FE.updateUIScale(THOTH.FE.uiScale - 1)
        if (k === '=') THOTH.FE.updateUIScale(THOTH.FE.uiScale + 1)

        // History
        if (THOTH._cntrlDown && k === 'z') THOTH.HIS.undo();
        if (THOTH._cntrlDown && k === 'y') THOTH.HIS.redo();
    });

    THOTH.on("KeyUp", (k) => {
        // Environment
        if (k==='l'){
            ATON.FE.controlLight(false);

            let D = ATON.getMainLightDirection();

            let E = {};
            E.environment = {};
            E.environment.mainlight = {};
            E.environment.mainlight.direction = [D.x,D.y,D.z];
            E.environment.mainlight.shadows = ATON._renderer.shadowMap.enabled;

            ATON.SceneHub.patch( E, ATON.SceneHub.MODE_ADD);
            ATON.Photon.fire("AFE_AddSceneEdit", E);
        }

        // Nav
        if (k === "Shift") {
            THOTH._shiftDown = false;
            if (THOTH.Toolbox.enabled) THOTH.setUserControl(false);
            else THOTH.setUserControl(true);
        }
        if (k === "Control") {
            THOTH._cntrlDown = false;
            if (THOTH.Toolbox.enabled) THOTH.setUserControl(false);
            else THOTH.setUserControl(true);
        }
    });
};


// Visualization

THOTH.highlightSelection = (selection, highlightColor) => {
    if (selection === undefined || selection.size === 0) return;

    const colorAttr = THOTH.mainMesh.geometry.attributes.color;
    const indexAttr = THOTH.mainMesh.geometry.index;

    const colors = colorAttr.array;
    const stride = colorAttr.itemSize;
    const r = highlightColor.r, g = highlightColor.g, b = highlightColor.b;

    const writeVertex = (base) => {
        colors[base    ] = r;
        colors[base + 1] = g;
        colors[base + 2] = b;
    }

    if (indexAttr) {
        const indices = indexAttr.array;
        for (const face of selection){
            writeVertex(indices[face * 3    ] * stride);
            writeVertex(indices[face * 3 + 1] * stride);
            writeVertex(indices[face * 3 + 2] * stride);
        }
    } else {
        for (const face of selection){
            const faceStart = face * 3 * stride;
            writeVertex(faceStart);
            writeVertex(faceStart + stride);
            writeVertex(faceStart + 2 * stride);
        }
    }

    colorAttr.needsUpdate = true;
    return;
};

THOTH.highlightAllLayers = () => {
    // All layers
    const layers = THOTH.Scene.currData.layers;
    if (layers === undefined) return;

    Object.values(layers).forEach((layer) => {
        if (layer.trash) return;
        if (!layer.visible) return;

        const selection      = layer.selection;
        const highlightColor = THOTH.Utils.hex2rgb(layer.highlightColor);

        THOTH.highlightSelection(selection, highlightColor);
    });
};

THOTH.clearHighlights = () => {
    const colorAttr = THOTH.mainMesh.geometry.attributes.color;
    const colorArray = colorAttr.array;

    for (let i=0; i < colorArray.length; i++) {
        colorArray[i] = 1;
    }

    colorAttr.needsUpdate = true;
};

THOTH.updateVisibility = () => {
    THOTH.clearHighlights();
    THOTH.highlightAllLayers();
    
    if (THOTH.activeLayer === undefined) return;

    const layer = THOTH.activeLayer;
    const mode  = THOTH.MODE_ADD;

    // update on photon
};

THOTH.updateNormalMap = (path, intensity = 10) => {
    if (!path) return false;

    THOTH.textureLoader.load(path, (tex)=>{
        const mat = THOTH.mainMesh.material;

        if (mat.normalMap) {
            mat.normalMap.image = tex.image;
        }
        else {
            mat.normalMap       = tex;
            mat.normalMap.flipY = false;
            mat.normalMap.wrapS = mat.map.wrapS;
            mat.normalMap.wrapT = mat.map.wrapT;
            mat.normalScale.set(intensity, intensity);
            // mat.normalScale.set(intensity, -intensity);
        }
        mat.normalMap.needsUpdate   = true;
        mat.needsUpdate             = true;
        THOTH.updateVisibility();
    });

    THOTH.log("Normal map updated successfully!");
};

THOTH.updateTextureMap = (path) => {
    if (!path) return false;

    THOTH.textureLoader.load(path, (tex)=>{
        const mat = THOTH.mainMesh.material;

        if (mat.map) {
            mat.map.image = tex.image;
        }
        else {
            mat.map = tex;
            mat.map.wrapS = mat.map.wrapS;
            mat.map.wrapT = mat.map.wrapT;
        }
        mat.map.needsUpdate = true;
        mat.needsUpdate     = true;
        THOTH.updateVisibility();
    });

    THOTH.log("Texture map updated successfully!");
};


// Layers

THOTH.createLayer = (id) => {
    if (id === undefined) return;

    const layers = THOTH.Scene.currData.layers;

    // Resolve id conflict
    if (layers[id] !== undefined) {
        if (layers[id].trash === true) {
            THOTH.resurrectLayer(id);
            return;
        }
        else {
            alert("Id conflict");
            return;
        }
    };

    let layer = {
        id              : id,
        name            : "New Layer",
        description     : " ",
        selection       : new Set(),
        visible         : true,
        highlightColor  : THOTH.Utils.getHighlightColor(id),
        trash           : false
    };
    
    layers[id] = layer;
    
    // Create layer folder 
    THOTH.FE.addToLayers(id);

    THOTH.log("Created new layer: " + layer.name);
};

THOTH.createObjectDescriptor = () => {
    // Global descriptor for the object/mesh

    // Get all face indices for the given object
    const geometry  = THOTH.mainMesh.geometry;
    const indexAttr = geometry.index;
    const faceCount = indexAttr ? indexAttr.count / 3 : positionAttr.count / 9;
    const faceArray = Array.from({length: faceCount}, (_, i) => i);

    const objectDescriptor = {
        id              : -1,
        name            : "Object Descriptor",
        description     : " ",
        selection       : faceArray,
        visible         : true,
        highlightColor  : null,
        trash           : false
    };

    return objectDescriptor;
};

THOTH.deleteLayer = (id) => {
    if (id === undefined) return;

    // If layer is activeLayer, dispose of details
    if (THOTH.activeLayer && id === THOTH.activeLayer.id) {
        if (FE.detailTabs) FE.detailTabs.dispose();
    }

    let layers = THOTH.Scene.currData.layers;
    let layer  = layers[id];
    const layerButton = THOTH.FE.layerButtons.get(id);

    // Delete layer button
    layerButton.dispose();
    THOTH.FE.layerButtons.delete(id);
    
    // Move layer to trash
    layer.trash = true;
    THOTH.activeLayer = undefined;

    // Update visuals
    THOTH.updateVisibility();
    
    THOTH.log("Deleted layer: " + layer.name);
};

THOTH.resurrectLayer = (id) => {
    if (id === undefined) return;

    const layers = THOTH.Scene.currData.layers;
    const layer = layers[id];

    if (!layer.trash) return;

    // Remove from trash
    layer.trash = false;

    // Add button
    THOTH.FE.addToLayers(id);

    // Update visuals
    THOTH.updateVisibility();

    THOTH.log("Resurrected layer: " + layer.name);
};

THOTH.editLayer = (id, attr, value) => {
    if (id === undefined || attr === undefined) return;
    
    const layer = THOTH.Scene.currData.layers?.[id];
    if (!layer) return;

    if (value === undefined) value = layer[attr];

    // Edit layer
    layer[attr] = value;

    // Edit buttons accordingly (later)
};


// Photon

THOTH.syncScene = (layers) => {
    THOTH.Scene.currData.layers = layers;

    if (layers !== undefined) {
        Object.values(Scene.currData.layers).forEach((layer) => {
            layer.selection = new Set(layer.selection);
        });
    }

    THOTH._bSynced = true;
};