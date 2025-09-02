/*
    THOTH Plugin for ATON - Scene management

    author: steliosalvanos@gmail.com

===========================================================*/


let Scene = {};


Scene.init = () => {
    Scene.sid = Scene.getSceneID();

    Scene.importLayers();
    Scene.importObjectDescriptor();
    Scene.initEventListeners();
};

Scene.initEventListeners = () => {
    // Local Actions
    THOTH.on("createLayer", (id) => {
        THOTH.createLayer(id);
    });

    THOTH.on("deleteLayer", (id) => {
        THOTH.deleteLayer(id);
    });

    THOTH.on("editLayer", (l) => {
        const id    = l.id;
        const attr  = l.attr;
        const value = l.value;
        THOTH.editLayer(id, attr, value);
    });

    THOTH.on("addToSelection", (l) => {
        const id    = l.id;
        const faces = l.faces;
        const layer = THOTH.Scene.currData.layers[id];
        const selection = THOTH.Toolbox.addFacesToSelection(faces, layer.selection);
        
        THOTH.editLayer(id, "selection", selection);
        THOTH.updateVisibility();
    });

    THOTH.on("delFromSelection", (l) => {
        const id    = l.id;
        const faces = l.faces;
        const layer = THOTH.Scene.currData.layers[id];
        const selection = THOTH.Toolbox.delFacesFromSelection(faces, layer.selection);

        THOTH.editLayer(id, "selection", selection);
        THOTH.updateVisibility();
    });

    // Photon
    
    // On new user join
    THOTH.onPhoton("readyToSync", () => {
        const layers = Scene.currData.layers;

        if (layers !== undefined) {
            Object.values(layers).forEach((layer) => {
                layer.selection = Array.from(layer.selection);
            });
        }

        THOTH.firePhoton("syncScene", layers);
    });
    
    THOTH.onPhoton("syncScene", (layers) => {
        THOTH.syncScene(layers);
    });

    // Photon actions
    THOTH.onPhoton("createLayer", (id) => {
        THOTH.createLayer(id);
    });

    THOTH.onPhoton("deleteLayer", (id) => {
        THOTH.deleteLayer(id);
    });

    THOTH.onPhoton("editLayer", (l) => {
        const id    = l.id;
        const attr  = l.attr;
        const value = l.value;
        THOTH.editLayer(id, attr, value);
        THOTH.updateVisibility();
    });

    THOTH.onPhoton("addToSelection", (l) => {
        const id    = l.id;
        const faces = l.faces;
        const layer = THOTH.Scene.currData.layers[id];
        const selection = THOTH.Toolbox.addFacesToSelection(faces, layer.selection);
        
        THOTH.editLayer(id, "selection", selection);
        THOTH.updateVisibility();    
    });

    THOTH.onPhoton("delFromSelection", (l) => {
        const id    = l.id;
        const faces = l.faces;
        const layer = THOTH.Scene.currData.layers[id];
        const selection = THOTH.Toolbox.delFacesFromSelection(faces, layer.selection);

        THOTH.editLayer(id, "selection", selection);
        THOTH.updateVisibility();
    });
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

Scene.exportChanges = () => {
    THOTH.log("Exporting annotations...");

    let A = {};
    A.layers = structuredClone(Scene.currData.layers);
    A.objectDescriptor = structuredClone(Scene.currData.objectDescriptor);

    Object.values(A.layers).forEach((layer) => {
        layer.selection = Array.from(layer.selection);
    });

    // Remove all annotation objects and ADD them again with changes
    THOTH.Scene.patch(A, THOTH.Scene.MODE_DEL, () => {});
    
    // Patch changes
    THOTH.Scene.patch(A, THOTH.Scene.MODE_ADD, () => {
        THOTH.log("Success!");
    });
};

Scene.importLayers = () => {
    THOTH.log("Importing scene layers");

    const layers = Scene.currData.layers;
    if (layers === undefined) return;

    Object.values(layers).forEach((layer) => {
        if (layer.selection === undefined) return;

        layer.selection = new Set(layer.selection);
    });
};

Scene.importObjectDescriptor = () => {
    THOTH.log("Importing scene object descriptor");

    if (Scene.currData.objectDescriptor === undefined) {
        Scene.currData.objectDescriptor = THOTH.createObjectDescriptor();
    }
};