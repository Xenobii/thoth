/*
THOTH Plugin for ATON - Front End

author: steliosalvanos@gmail.com

===========================================================*/


let FE = {};


// Setup

FE.setup = () => {
    FE.layers = new Map();
};


FE.addLayer = (id) => {
    if (FE.layers.has(id)) return;

    // Layer
    const newLayer = document.createElement("div");
    newLayer.classList.add("layer");
    newLayer.id = id;
    // Select Logic
    newLayer.addEventListener("click", (e) => {
        FE.selectLayer?.(id);
    });
    
    // Label
    const label = document.createElement("span");
    label.classList.add("layerLabel");
    label.textContent = "Layer " + id;
    // Rename Logic
    label.addEventListener("dblclick", (e) => {
        e.stopPropagation();

        const input = document.createElement("input");
        input.type = "text";
        input.classList.add("layerInput");
        input.value = label.textContent;

        label.replaceWith(input);
        input.focus();

        const commit = () => {
            const newName = input.value.trim() || "Untitled";
            label.textContent = newName;
            input.replaceWith(label);
        };

        input.addEventListener("blur", commit);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") input.blur();
            else if (e.key === "Escape") {
                input.replaceWith(label);
            }
        });
    });

    newLayer.appendChild(label);
    FE.layerContainer.appendChild(newLayer);
    FE.layers.set(id, newLayer);
};


FE.editLayerName = (id, newName) => {
    const layer = FE.layers.get(id);
    if (layer) {
        layer.textContent = newName;
    }
};


FE.selectLayer = (id) => {
    // Highlight logic
    for (const layer of FE.layers.values()) {
        layer.classList.remove("active");
    }
    const selected = FE.layers.get(id);
    if (selected) selected.classList.add("active");
};


FE.removeLayer = (id) => {
    const layer = FE.layers.get(id);
    if (layer) {
        layer.remove();
        FE.layers.delete(id);
    }
};