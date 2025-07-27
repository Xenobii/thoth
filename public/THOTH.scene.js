/*
    THOTH Plugin for ATON - Scene management

    author: steliosalvanos@gmail.com

===========================================================*/


let Scene = {};


Scene.init = () => {
    Scene.sid = Scene.getSceneID();
};


// Util

Scene.getSceneID = (sid) => {
    if (!sid) {
        // Get sid directly from url
        const path = window.location.pathname;
        const pathArray = path.split('/');

        sid = String(pathArray[2]+'/'+pathArray[3]);
    };

    return sid;
};


// Import/export

Scene.exportAnnotations = () => {
    THOTH.log("Exporting annotations...");

    let A = Scene.annotations2Object(THOTH.annotations);
    
    // Just remove all annotation objects and ADD them again with changes
    
    // Patch changes
    THOTH.patch(A, ATON.SceneHub.MODE_ADD, () => {
        THOTH.log("Success!");
    });
};

Scene.annotations2Object = (annotationArray) => {
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

Scene.importLayers = () => {
    THOTH.log("Importing scene layers");

    layerData = THOTH.currData.layers;

    if (layerData === undefined) return;

    for (const layer of layerData) {
        THOTH.log(layer)
        THOTH.layers.set(layer.id, layer);
    }
};

// Unnecessary on init with currData
Scene.importAnnotationsfromJSON = async (sid, onSuccess) => {
    if (sid === undefined) return;

    THOTH.log("Importing annotations from scene: "+sid);
    
    const reqpath = ATON.PATH_RESTAPI2+"scenes/"+sid;

    return new Promise((resolve, reject) => {
        THOTH.Utils.getJSON(reqpath, (data) => {
            // Parse JSON and apply to scene
            Scene.parseJSON(data);
    
            if (onSuccess) onSuccess();
            resolve();
        });
    });
};

Scene.parseJSON = (data) => {
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