/*
THOTH Plugin for ATON

author: steliosalvanos@gmail.com

===========================================================*/

let THOTH = new ATON.Flare("thoth");

THOTH.FE      = FE;
THOTH.Mat     = Mat;
THOTH.Toolbox = Toolbox;
THOTH.Utils   = Utils;
THOTH.Scene   = Scene;

// Layer class

class Layer {
    constructor(id) {
        this.id = id;
        this.name = "Layer " + id;
        this.description = " ";
        this.selection = new Set();
        this.visible = true;
        this.highlightColor = this.getHighlightColor(id);
    }

    getHighlightColor(id) {
        // Create a rotating color for clarity
        const r = parseInt(255 * Math.sin(id * Math.PI/4)/2 + 128);
        const g = parseInt(255 * Math.sin(id * Math.PI/4 + 2* Math.PI/3)/2 + 128);
        const b = parseInt(255 * Math.sin(id * Math.PI/4 - 2* Math.PI/3)/2 + 128);

        const color = THOTH.Utils.rgb2hex(r, g, b);

        return color;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            selection: Array.from(this.selection),
            visible: this.visible,
            highlightColor: this.highlightColor
        };
    }

    static fromJSON(json) {
        // logic here
    }
};


// Flare setup

THOTH.setup = async () => {
    THOTH._bLeftMouseDown = false;
    
    THOTH._bPauseQuery = false;
    THOTH._bLoading    = true;
    THOTH._bAtonReady  = false;

    ATON.on("AllNodeRequestsCompleted", () => {
        THOTH._bAtonReady = true;
    });

    // ATON Overhead
    await THOTH._parseAtonElements();

    // Mat
    THOTH.Mat.init();
    
    // Scene
    THOTH.Scene.init();
    THOTH.initRC();

    // Layers
    THOTH.layers = new Map();
    THOTH.Scene.importLayers();
    THOTH.updateVisibility();
    
    // Toolbox
    THOTH.Toolbox.init();
    
    // Front End
    THOTH.FE.init();

    // Event listeners
    THOTH.initEventListeners();
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
    
    THOTH._queryData = ATON._queryDataScene;
    THOTH._renderer  = ATON._renderer;
    THOTH._rcScene   = ATON._rcScene;

    // Scene
    THOTH.MODE_ADD = 0;
    THOTH.MODE_DEL = 1;
    
    THOTH.RCLayer  = ATON.NTYPES.SCENE

    THOTH.patch    = ATON.SceneHub.patch;
    THOTH.load     = ATON.SceneHub.load;
    THOTH.currData = ATON.SceneHub.currData;

    // EventHub
    THOTH.on   = ATON.on;
    THOTH.fire = ATON.fire;
    
    // Nav
    THOTH._camera   = ATON.Nav._camera;

    // Photon
    THOTH.photonFire = ATON.Photon.fire;

    // Utils
    THOTH._mSelectorSphere = ATON.SUI._mSelectorSphere;
    
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
        if (e.button === 0) THOTH._bLeftMouseDown = false;
        if (e.button === 2) THOTH._bRightMouseDown = false;
    }, false);
};


// Visualization

THOTH.highlightSelections = () => {
    THOTH.layers.forEach((layer, id) => {
        if (!layer.visible) return;

        const selection      = layer.selection;
        const highlightColor = THOTH.Utils.hex2rgb(layer.highlightColor);
        
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
    THOTH.highlightSelections();
};


// Selection management

THOTH.addFacesToSelection = (newFaces, selection) => {
    if (newFaces === undefined || !newFaces.length) return;
        
    const newFacesSet = new Set(newFaces);
    newFacesSet.forEach(f => {
        if (!selection.has(f)) {
            selection.add(f);
        }
    });

    return selection;
};

THOTH.addFacesToSelection = (newFaces, selection) => {
    if (newFaces === undefined || !newFaces.length) return;
        
    const newFacesSet = new Set(newFaces);
    newFacesSet.forEach(f => {
        if (!selection.has(f)) {
            selection.delete(f);
        }
    });

    return selection;
};


// Layers

THOTH.createNewLayer = () => {
    // Util function for retrieving the first unused id in the Layers Map for initialization
    function getFirstUnusedKey(map) {
        let i = 0;
        while (map.has(i)) {
            i++;
        }
        return i;
    };

    const id = getFirstUnusedKey(THOTH.layers)
    const newLayer = new Layer(id);

    THOTH.layers.set(id, newLayer);
    
    THOTH.log("Created new layer: " + newLayer.name);

    // Create layer folder 
    THOTH.FE.addToLayers(id);
};

THOTH.deleteLayer = (id) => {
    const layer       = THOTH.layers.get(id);
    const layerButton = THOTH.FE.layerButtons.get(id);

    // If layer is activeLayer, dispose of details
    if (layer === THOTH.activeLayer) {
        if (FE.detailTabs) FE.detailTabs.dispose();
    }

    // Delete layer button
    layerButton.dispose();
    THOTH.FE.layerButtons.delete(id);
    
    // Delete layer
    THOTH.layers.delete(id);
    THOTH.activeLayer = undefined;
    
    
    // Update visuals
    THOTH.updateVisibility();
    
    THOTH.log("Deleted layer: " + layer.name);
};

THOTH.editLayerName = (id) => {
    // Edit layer
    const layer = THOTH.layers.get(id);

    // Edit buttons
    const layerBtn = THOTH.FE.layerButtons.get(id);
    layerBtn.title = layer.name;
};

// TODO: Remove Mat, geomteryHelpers and Utils
// TODO: Modify import/export
// TODO: Add block cursor on warning