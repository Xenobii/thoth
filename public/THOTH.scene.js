/*
    THOTH Plugin for ATON - Scene management

    author: steliosalvanos@gmail.com

===========================================================*/


let Scene = {};


Scene.init = () => {
    Scene.sid = Scene.getSceneID();

    Scene.importLayers();
    Scene.initEventListeners();
};

Scene.initEventListeners = () => {
    // Local
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
    });

    THOTH.onPhoton("editSelection", (l) => {
        const id        = l.id;
        const selection = new Set(l.selection)
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

Scene.exportLayers = () => {
    THOTH.log("Exporting annotations...");

    let A = {};
    A.layers = Scene.currData.layers;

    Object.values(Scene.currData.layers).forEach((layer) => {
        layer.selection = Array.from(layer.selection);
    });
    
    // Just remove all annotation objects and ADD them again with changes
    THOTH.Scene.patch(A, THOTH.Scene.MODE_DEL, () => {
    });

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