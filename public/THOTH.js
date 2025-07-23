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

/* 
Flare setup
===========================================================*/

THOTH.setup = async () => {
    THOTH._bLeftMouseDown   = false;

    THOTH._bLoading   = true;
    THOTH._bAtonReady = false;

    ATON.on("AllNodeRequestsCompleted", () => {
        THOTH._bAtonReady = true;
    });

    // ATON Overhead
    await THOTH._parseAtonElements();
    
    // Init Scene
    THOTH.Mat.init();
    THOTH.Scene.init();
    THOTH.Toolbox.init();
    THOTH.FE.init();

    // Annotation list
    THOTH.annotations = [];

    THOTH.sid = THOTH.Scene.sid;
    THOTH.importAnnotations(THOTH.sid);
    THOTH.updateVisibility();
};

THOTH.update = () => {
    THOTH.Scene._queryData = ATON._queryDataScene;
};

/* 
Ralize
===========================================================*/

// Remove THOTH overhead when used with ATON 
THOTH._parseAtonElements = async () => {
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
    THOTH.Scene.mainMesh = getMainMesh();
    
    THOTH.Scene._queryData = ATON._queryDataScene;
    THOTH.Scene._renderer  = ATON._renderer;
    THOTH.Scene._rcScene   = ATON._rcScene;

    // Scene
    THOTH.MODE_ADD = 0;
    THOTH.MODE_DEL = 1;

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

/* 
Inits
===========================================================*/

/* 
Utils
===========================================================*/

THOTH.getSelectorRadius = () => {
    return ATON.SUI._selectorRad;
};

/* 
History
===========================================================*/

/* 
Annotation Management
===========================================================*/

THOTH.createNewAnnotationParams = () => {
    let idx = undefined;
    
    // Determine the index at which to place annotation
    for (let i=0; i<THOTH.annotations.length + 1; i++) {
        // Otherwise place new Annotation at the end of the array
        if (THOTH.annotations[i] === undefined) {
            idx = i + 1;
            break;
        };
        // Check if annotation was removed at index i 
        // If yes, create index there
        if (THOTH.annotations[i].index !== i + 1) {
            idx = i + 1;
            break;
        };
    };

    // Create name based on index
    const name = `Annotation ${idx}`;
    
    // Create a rotating color for clarity
    const r = parseInt(255 * Math.sin(idx * Math.PI/4)/2 + 128);
    const g = parseInt(255 * Math.sin(idx * Math.PI/4 + 2* Math.PI/3)/2 + 128);
    const b = parseInt(255 * Math.sin(idx * Math.PI/4 - 2* Math.PI/3)/2 + 128);
    const color = THOTH.Utils.rgb2hex(r, g, b);

    return {
        idx :  idx,
        name:  name,
        color: color, 
    };
};

THOTH.createNewAnnotation = () => {
    // Defined annotation index for convenience
    const newAnnotationParams = THOTH.createNewAnnotationParams();

    THOTH.log("Created new Annotation: " + newAnnotationParams.name);
    
    // Default annotation params
    const newAnnotation = {
        index: newAnnotationParams.idx,
        name: newAnnotationParams.name,
        visible: true,
        highlightColor: newAnnotationParams.color,
        faceIndices: new Set(),
        description: "Nothing here yes",
    };
    
    // Create annotation folder 
    THOTH.FE.createNewAnnotationUI(newAnnotation);
    
    // Add to annotation array
    THOTH.annotations.splice(newAnnotation.index - 1, 0, newAnnotation);
};

THOTH.deleteAnnotation = (annotationParams) => {
    THOTH.log("Removing " + annotationParams.name + " with index " + annotationParams.index);

    // Find corresponding index in arrays
    let idx = undefined;
    for (let i=0; i<THOTH.annotations.length; i++) {
        if (annotationParams.index === THOTH.annotations[i].index)
        {
            idx = i;
            break;
        }
    };

    // Remove buttons
    THOTH.FE.annotationButtons[idx].dispose();
    THOTH.FE.annotationButtons.splice(idx, 1);
    // THOTH.FE.annotationButtons[annotationParams.index - 1] = undefined;
    THOTH.FE.detailTabs.dispose();

    // Remove from annotations array
    THOTH.annotations.splice(idx, 1);  

    // Update visuals
    THOTH.updateVisibility();
};

THOTH.editAnnotationName = (annotationParams) => {
    // Find corresponding index in arrays
    let idx = undefined;
    for (let i=0; i<THOTH.annotations.length; i++) {
        if (annotationParams.index === THOTH.annotations[i].index)
        {
            idx = i;
            break;
        }
    };

    // Edit buttons
    THOTH.FE.annotationButtons[idx].title = annotationParams.name;

    // annotationParams.name = newName;
};

THOTH.updateVisibility = () => {
    THOTH.Toolbox.highlightVisibleSelections(THOTH.annotations);
};

THOTH.exportAnnotations = () => {
    THOTH.log("Exporting annotations...");

    let A = THOTH.annotations2Object(THOTH.annotations);
    
    // Just remove all annotation objects and ADD them again with changes
    
    // Patch changes
    THOTH.patch(A, ATON.SceneHub.MODE_ADD, () => {
        THOTH.log("Success!");
    });
};

THOTH.annotations2Object = (annotationArray) => {
    const annotationObject = {};
    annotationObject.annotations = {};

    for (let i=0; i<annotationArray.length; i++) {
        const name = annotationArray[i].name;
        const faceIndices = Array.from(annotationArray[i].faceIndices);

        // Add to annotation object
        annotationObject.annotations[name] = annotationArray[i];
        annotationObject.annotations[name].faceIndices = faceIndices;
    };
    return annotationObject;
};

THOTH.importAnnotations = async (sid, onSuccess) => {
    if (sid === undefined) return;

    THOTH.log("Importing annotations from scene: "+sid);
    
    const reqpath = ATON.PATH_RESTAPI2+"scenes/"+sid;

    return new Promise((resolve, reject) => {
        THOTH.Utils.getJSON(reqpath, (data) => {
            // Parse JSON and apply to scene
            THOTH.parseJSON(data);
    
            if (onSuccess) onSuccess();
            resolve();
        });
    });
};

THOTH.parseJSON = (data) => {
    if (data.annotations === undefined) return;

    // Convert annotations object to array and parse
    THOTH.annotations = Object.values(data.annotations);

    // Iterate through the array
    Object.keys(THOTH.annotations).forEach(i => {
        // Convert faceIndices to Sets
        THOTH.annotations[i].faceIndices = new Set(THOTH.annotations[i].faceIndices);

        // Create annotation button for each
        THOTH.FE.createNewAnnotationUI(THOTH.annotations[i]);
    });
};


// TODO: Fix toolbox
// TODO: Swap annotations with a Map()