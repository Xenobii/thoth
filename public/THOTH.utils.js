/*
    THOTH Plugin for ATON - Util functions

    author: steliosalvanos@gmail.com

===========================================================*/


let Utils = {};


Utils.rgb2hex = (r, g, b) => {
    componentToHex = (c) => {
        var hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

Utils.hex2rgb = (hex) => {
    // Also normalize
    const r = parseInt(hex.slice(1, 3), 16)/255;
    const g = parseInt(hex.slice(3, 5), 16)/255;
    const b = parseInt(hex.slice(5, 7), 16)/255;
    return {r, g, b};
};

Utils.getHighlightColor = (id) => {
    // Create a rotating color for clarity
    const r = parseInt(255 * Math.sin(id * Math.PI/4)/2 + 128);
    const g = parseInt(255 * Math.sin(id * Math.PI/4 + 2* Math.PI/3)/2 + 128);
    const b = parseInt(255 * Math.sin(id * Math.PI/4 - 2* Math.PI/3)/2 + 128);

    const color = THOTH.Utils.rgb2hex(r, g, b);

    return color;
};

Utils.getFirstUnusedKey = (obj) => {
    const keys = Object.keys(obj).map(Number); // Convert to numbers
    const keySet = new Set(keys);

    let id = 0;
    while (keySet.has(id)) {
        id++;
    }

    return id;
};

Utils.getJSON = (jsonurl, onLoad)=>{
    fetch(jsonurl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
    })
    .then(response => response.json())
    .then(response => {
        if (onLoad) onLoad(response);
    });
};