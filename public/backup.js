
THOTH._bAtonInitialized = ATON._bInitialized;
THOTH.clearEventHandlers = ATON.clearEventHandlers;
THOTH.on = ATON.on;
THOTH.fire = ATON.fire;



Scene.MODE_ADD = 0;
Scene.MODE_DEL = 1;


Scene.patch = ATON.SceneHub.patch;
Scene.load  = ATON.SceneHub.load;
Scene.currData = ATON.SceneHub.currData;
Scene.photonFire = ATON.Photon.fire;


// Init functions

Scene.saveLayerChanges = (mode) => {
    let L = {};
    L.annotationLayers = {};
    // placeholder logic 

    Scene.patch(L, mode);

    console.log("Patching scene...")
};


// THIS WORKS
Scene.broadcastLayerChange = (layer, mode) => {
    // 1. Apply the change locally


    // 2. Broadcast to other users
    ATON.Photon.fire("THOTH_LAYER_CHANGE", {
        layer: layer.toJSON ? layer.toJSON() : layer,
        mode: mode
    });
};


ATON.Photon.on("THOTH_LAYER_CHANGE", (data) => {
    if (!data || !data.layer) return;
    // Apply the change locally (but avoid rebroadcasting)
    Scene.patchLayers([data.layer], data.mode);
});
