/*
THOTH Plugin for ATON - Back End Toolbox

author: steliosalvanos@gmail.com

===========================================================*/

let Toolbox = {};

/* 
Inits
===========================================================*/

Toolbox.init = async () => {
    while (!Scene._queryData?.o) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Inits
    Toolbox.initColors();
    Toolbox.initLasso();

    // Init selection sphere logic
    Toolbox.STD_SEL_RAD = THOTH.getSelectorRadius();
    Toolbox.brushRadius = Toolbox.STD_SEL_RAD;

    // Clear face highlights
    Toolbox.clearFaceHighlights();
};

Toolbox.initColors = () => {
    // Toolbox.highlightColor = THOTH.Mat.colors.green;
    Toolbox.highlightColor = THOTH.Mat.colors.red;

    Toolbox.defaultColor   = THOTH.Mat.colorsThree.white;
    Toolbox.brushColor     = THOTH.Mat.colorsThree.green;
    Toolbox.eraserColor    = THOTH.Mat.colorsThree.orange;
    Toolbox.lassoColor     = THOTH.Mat.colorsThree.green;
    Toolbox.lassoFillColor = THOTH.Mat.colorsThree.green; 
};

Toolbox.initLassoCanvas = () => {
    // Create separate canvas for lasso drawing
    const canvas = document.createElement('canvas');
    canvas.id = 'lassoCanvas';
    document.body.appendChild(canvas);

    Object.assign(canvas.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '10'
    });

    canvas.width  = THOTH.Scene._renderer.domElement.width;
    canvas.height = THOTH.Scene._renderer.domElement.height;

    // Retrieve context for frawing functions
    Toolbox.lassoCtx = canvas.getContext('2d');

    Toolbox.lassoCtx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    Toolbox.lassoCtx.lineWidth   = 1;
    Toolbox.lassoCtx.fillStyle   = 'rgba(0, 255, 0, 0.2';
};

Toolbox.initLasso = () => {
    // Wait for query
    // while (!THOTH.Scene._queryData?.o) {
    //     await new Promise(resolve => setTimeout(resolve, 100));
    // }

    // Init canvas
    Toolbox.initLassoCanvas();

    // Init state for event listeners
    Toolbox.lassoState = {
        isActive: false,
        points: [],
        lastPosition: null, // {x, y}
        lastProcessedPosition: null
    };

    // Init mouse position
    Toolbox.currectMousePosition = {x: 0, y: 0};
    Toolbox.isLassoEnabled = false;
    Toolbox._lastMouseEvent = null;
};

/* 
Utils
===========================================================*/

Toolbox.getMousePosition = (event) => {
    if (!Toolbox.lassoCtx) return { x: 0, y: 0 };

    const rect = THOTH.Scene._renderer.domElement.getBoundingClientRect();

    return {
        x: (event.clientX - rect.left),
        y: (event.clientY - rect.top)
    };
};

Toolbox.updateMousePosition = (event) => {
    if (!Toolbox.lassoCtx) return;

    const rect = Toolbox.lassoCtx.canvas.getBoundingClientRect();

    Toolbox.currentMousePosition = {
        x: (event.clientX - rect.left),
        y: (event.clientY - rect.top)
    };
};

Toolbox.changeSUISphere = (bBrush=true, bEraser=false)=>{
    let brushSize = Toolbox.brushRadius;

    // Change SUI sphere to appropriate color and radius for visualization
    if (bBrush || bEraser) { 
        THOTH.setSelectorRadius(brushSize);
        THOTH._mSelectorSphere.material.dispose();
        if (bBrush) {
            THOTH.setSelectorColor(THOTH.Mat.colors.green);
        }
        else {
            THOTH.setSelectorColor(THOTH.Mat.colors.orange);
        }
    }
    else {
        THOTH.setSelectorRadius(Toolbox.STD_SEL_RAD);
        THOTH.setSelectorColor(THOTH.Mat.colors.white);
    }
};

/* 
Selection Utils
===========================================================*/

Toolbox.selectMultipleFaces = (brushSize, mesh) => {
    if (!mesh) mesh = THOTH.Scene.mainMesh;

    let hitPoint = THOTH.Scene._queryData.p;

    if (!hitPoint) return false;

    let selectedFaces = [];
    const geometry = mesh.geometry;
    
    // Raycast sphere on the object
    const sphere = new THREE.Sphere();
    const inverseMatrix = new THREE.Matrix4();
    inverseMatrix.copy(mesh.matrixWorld).invert();
    sphere.center.copy(hitPoint).applyMatrix4(inverseMatrix);
    sphere.radius = brushSize;

    if (geometry.boundsTree) {
        geometry.boundsTree.shapecast({
            intersectsBounds: box => {
                const intersects = sphere.intersectsBox(box);
                if (intersects) {
                    const { min, max } = box;
                    const tempVec = new THREE.Vector3();

                    for (let x = 0; x <= 1; x++) {
                        for (let y = 0; y <= 1; y++) {
                            for (let z = 0; z <= 1; z++) {
                                tempVec.set(
                                    x === 0 ? min.x : max.x,
                                    y === 0 ? min.y : max.y,
                                    z === 0 ? min.z : max.z
                                );
                                if (!sphere.containsPoint(tempVec)) {
                                    return INTERSECTED;
                                }
                            }
                        }
                    }
                    return CONTAINED;
                }
                return intersects ? INTERSECTED : NOT_INTERSECTED;
            },
            intersectsTriangle: (tri, faceIndex, contained) => {
                if (contained || tri.intersectsSphere(sphere)) {
                    selectedFaces.push(GeometryHelpers.extractFaceData(faceIndex, geometry));
                }
                return false;
            }
        });
    } else {
        console.warn("Geometry has no boundsTree, face selection will not work");
    }

    return selectedFaces;
};

/* 
Visualization
===========================================================*/

Toolbox.highlightFacesOnObject = (selectedFaces, mesh, color) => {
    if (!selectedFaces || selectedFaces.length === 0) return false;
    if (!mesh) mesh   = THOTH.Scene.mainMesh;
    if (!color) color = Toolbox.highlightColor;

    // Convert to RGB
    const rgbColor = THOTH.Utils.hex2rgb(color);

    const geometry  = mesh.geometry;
    const colorAttr = geometry.attributes.color;
    const indexAttr = geometry.index;
    
    const colors = colorAttr.array;
    const stride = colorAttr.itemSize;
    const r = rgbColor.r, g = rgbColor.g, b = rgbColor.b;
    
    const writeVertex = (base) => {
        colors[base    ] = r;
        colors[base + 1] = g;
        colors[base + 2] = b;
    }

    if (indexAttr) {
        // Indexed geometry
        const indices = indexAttr.array;
        for (const {index:face} of selectedFaces){
            writeVertex(indices[face * 3    ] * stride);
            writeVertex(indices[face * 3 + 1] * stride);
            writeVertex(indices[face * 3 + 2] * stride);
        }
    } else {
        // Non-indexed geometry
        for (const {index:face} of selectedFaces){
            const faceStart = face * 3 * stride;
            writeVertex(faceStart);
            writeVertex(faceStart + stride);
            writeVertex(faceStart + 2 * stride);
        }
    }

    colorAttr.needsUpdate = true;
    return true;
};

Toolbox.clearFaceHighlights = (mesh) => {
    if (!mesh) mesh = THOTH.Scene.mainMesh;
    if (!mesh.geometry.attributes.color) return false;

    const colorAttr = mesh.geometry.attributes.color;
    const colorArray = colorAttr.array;
    
    // Reset all colors to white
    for (let i = 0; i < colorArray.length; i++) {
        colorArray[i] = 1;
    }

    colorAttr.needsUpdate = true;
    return true;
};

Toolbox.highlightVisibleSelections = (selections, mesh) => {
    if (!mesh) mesh = THOTH.Scene.mainMesh;
    if (!selections) selections = THOTH.annotations;

    if (mesh === undefined) return false;

    mesh.material.vertexColors = true;

    Toolbox.clearFaceHighlights(mesh);

    // Add previous selections that are visible
    for (let i=0; i<selections.length; i++) {
        // Check if annotation exists
        if (selections[i] !== undefined) {
            if (selections[i].visible) {
                if (selections[i].faceIndices !== undefined) {
                    let faces = Array.from(selections[i].faceIndices).map(
                        index => GeometryHelpers.extractFaceData(index, mesh.geometry)
                    );
        
                    if (faces.length !== 0) {
                        Toolbox.highlightFacesOnObject(faces, mesh, selections[i].highlightColor);
                    }
                }
            }
        }
    }
    return;
};

/* 
Brush/Eraser Tool
===========================================================*/

Toolbox.brushTool = (currAnnotationParams, brushSize = Toolbox.brushRadius) => {
    if (!currAnnotationParams) {
        console.warn("No selected annotation");
        return false;
    }
    if (!THOTH.Scene._queryData?.o) return false; // Only work when over mesh
    const mesh = THOTH.Scene.mainMesh;

    // Get newly selected faces
    const newFaces = Toolbox.selectMultipleFaces(brushSize, mesh);
    if (!newFaces.length) return false;

    // Skip already selected faces
    const newUniqueFaces = newFaces.filter(face => 
        !currAnnotationParams.faceIndices.has(face.index)
    );
    if (!newUniqueFaces.length) return false;

    // Add to current selection
    newUniqueFaces.forEach(face => {
        currAnnotationParams.faceIndices.add(face.index);
    });

    // Highlight ALL selected faces
    Toolbox.highlightVisibleSelections(THOTH.annotations);

    return true;
};

Toolbox.eraserTool = (currAnnotationParams, brushSize = Toolbox.brushRadius) => {
    if (!currAnnotationParams) {
        console.warn("No selected annotation");
        return false;
    }
    if (!THOTH.Scene._queryData?.o) return false; // Only work when over mesh
    const mesh = THOTH.Scene.mainMesh;

    // Get newly selected faces
    let newFaces = Toolbox.selectMultipleFaces(brushSize, mesh);
    if (!newFaces.length) return false;

    // Skip already selected faces
    let newUniqueFaces = newFaces.filter(face => 
        currAnnotationParams.faceIndices.has(face.index)
    );
    if (!newUniqueFaces.length) return false;

    // Remove from current selection
    newUniqueFaces.forEach(face => {
        currAnnotationParams.faceIndices.delete(face.index);
    });

    Toolbox.highlightVisibleSelections();
    
    return true;
};

/* 
Lasso Tool
===========================================================*/

Toolbox.startLasso = (event) => {
    // Clear previous selection (unnecessary once logic is complete)
    if (Toolbox.lassoState.isActive) {
        Toolbox.cleanupLasso();
    }
    Toolbox.currentMousePosition = {x: 0, y: 0};

    Toolbox.lassoState.isActive = true;
    Toolbox.lassoState.points = [Toolbox.getMousePosition(event)];

    // Init canvas 
    if (!Toolbox.lassoCtx) Toolbox.initLassoCanvas();

    // Visual setup
    Toolbox.lassoCtx.clearRect(0, 0,
        Toolbox.lassoCtx.canvas.width,
        Toolbox.lassoCtx.canvas.height
    );
    Toolbox.lassoCtx.beginPath();
    Toolbox.lassoCtx.moveTo(
        Toolbox.lassoState.points[0].x,
        Toolbox.lassoState.points[0].y
    );
};

Toolbox.updateLasso = (event) => {
    if(!Toolbox.lassoState.isActive) return;

    const currentPos  = Toolbox.getMousePosition(event);
    const previousPos = Toolbox.lassoState.points[Toolbox.lassoState.points.length - 1];
    const dist = THOTH.Utils.pointDistance(currentPos, previousPos);
    
    // Reduce oversampling
    if (dist < 5) return;

    Toolbox.lassoState.points.push(currentPos);

    // Draw the line
    Toolbox.lassoCtx.lineTo(currentPos.x, currentPos.y);
    Toolbox.lassoCtx.stroke();
};

Toolbox.endLasso = (currAnnotationParams) => {
    if (!currAnnotationParams) {
        console.warn("No selected annotation");
        return false;
    }

    if (!Toolbox.lassoState.isActive) return;

    Toolbox.processLassoSelection(currAnnotationParams);
    Toolbox.cleanupLasso();
    Toolbox.lassoState.isActive = false;
};

Toolbox.cleanupLasso = () => {
    if (!Toolbox.lassoCtx) return;
    
    Toolbox.lassoState.isActive = false;

    Toolbox.lassoCtx.clearRect(0, 0, 
        Toolbox.lassoCtx.canvas.width,
        Toolbox.lassoCtx.canvas.height
        );
    Toolbox.lassoState.points = [];
};

Toolbox.processLassoSelection = (currAnnotationParams) => {
    if (!Toolbox.lassoState.points || Toolbox.lassoState.points.length < 3) return;
    if (!THOTH.Scene.mainMesh) return;

    const lassoPoints = Toolbox.lassoState.points;
    const mesh = THOTH.Scene.mainMesh;
    const geometry = mesh.geometry;
    const camera = THOTH._camera;
    const canvas = Toolbox.lassoCtx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const dpr      = window.devicePixelRatio || 1;
    const positionAttr = geometry.attributes.position;
    const indexAttr = geometry.index;
    const faceCount = indexAttr ? indexAttr.count / 3 : positionAttr.count / 9;

    const selectedFaces = [];
    
    const tempV1 = new THREE.Vector3();
    const tempV2 = new THREE.Vector3();
    const tempV3 = new THREE.Vector3();
    const centroid = new THREE.Vector3();
    const projected = new THREE.Vector3();

    // camera.updateMatrixWorld();
    // camera.updateProjectionMatrix();
    for (let i = 0; i < faceCount; i++) {
        let a, b, c;
        if (indexAttr) {
            a = indexAttr.getX(i * 3);
            b = indexAttr.getX(i * 3 + 1);
            c = indexAttr.getX(i * 3 + 2);
        } else {
            a = i * 3;
            b = i * 3 + 1;
            c = i * 3 + 2;
        }

        tempV1.fromBufferAttribute(positionAttr, a);
        tempV2.fromBufferAttribute(positionAttr, b);
        tempV3.fromBufferAttribute(positionAttr, c);

        centroid.copy(tempV1).add(tempV2).add(tempV3).divideScalar(3);
        mesh.localToWorld(centroid);

        projected.copy(centroid).project(camera);
        const screenX = (projected.x + 1) / 2 * width / dpr;
        const screenY = (-projected.y + 1) / 2 * height / dpr;

        const inside = THOTH.Utils.isPointInPolygon({x: screenX, y: screenY}, lassoPoints);
        if (inside) {
            selectedFaces.push(GeometryHelpers.extractFaceData(i, geometry));
        }
    }
    if (!selectedFaces.length) return false;

    // Skip already selected faces
    const newUniqueFaces = selectedFaces.filter(
        face => !currAnnotationParams.faceIndices.has(face.index)
    );
    if (!newUniqueFaces.length) return false;

    const newUniqueFacesFiltered = GeometryHelpers.visibleFaceFiltering(newUniqueFaces, mesh);
    selectedFaces.forEach(face => {
        currAnnotationParams.faceIndices.add(face.index);
    });

    Toolbox.highlightVisibleSelections();

    return true;
};

Toolbox.getLassoPixels = () => {
    const canvas    = Toolbox.lassoCtx.canvas;
    const imgData   = Toolbox.lassoCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data      = imgData.data;
    const drawArray = [];
    
    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 0) {
            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            drawArray.push({x, y});
        }
    }
    return drawArray;
};

Toolbox.lassoTool = (event) => {
    if (!event) return;
    if (!THOTH.Scene.mainMesh) return;
    if (!Toolbox.lassoState) return;

    // Toolbox.updateMousePosition(event);
    Toolbox.updateMousePosition(event);

    // Skip if position hasn't changed
    if (Toolbox.lassoState.lastProcessedPosition &&
        Toolbox.lassoState.lastProcessedPosition.x === Toolbox.currentMousePosition.x &&
        Toolbox.lassoState.lastProcessedPosition.y === Toolbox.currentMousePosition.y
    ) {
        return;
    }

    if (!Toolbox.lassoState.isActive) {
        Toolbox.cleanupLasso();
        Toolbox.startLasso(event);      
    }
    else {
        Toolbox.updateLasso(event);
    }
    Toolbox.lassoState.lastProcessedPosition = {...Toolbox.currentMousePosition};
};