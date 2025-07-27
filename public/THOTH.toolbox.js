/*
    THOTH Plugin for ATON - Face selection toolbox

    author: steliosalvanos@gmail.com

===========================================================*/
const { INTERSECTED, NOT_INTERSECTED, CONTAINED } = window.ThreeMeshBVH;


let Toolbox = {};


Toolbox.init = () => {
    Toolbox._bInitialized = false;

    // Adjustble params
    Toolbox.normalThreshold = 0;
    Toolbox.selectObstructedFaces = false;

    Toolbox.enabled = true;
    Toolbox.brushEnabled = false;
    Toolbox.lassoEnabled = false;

    // Internal params
    Toolbox._tempSelextion = new Set();
    Toolbox._screenPointerCoords = new THREE.Vector2(0.0, 0.0);

    // Inits
    Toolbox.initBrush();
    Toolbox.initLasso();

    Toolbox._bInitialized = true;
};


// Init functions

Toolbox.initBrushEventListeners = () => {
    let el = THOTH._renderer.domElement;
    let w  = window;

    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    el.addEventListener('mousedown', (e) => {
        if (!Toolbox.brushEnabled) return;

        if (THOTH.activeLayer === undefined) {

            console.log("No layer selected!");
            el.style.cursor = 'not-allowed';
            return;
        };

        if (THOTH._queryData === undefined) return;

        Toolbox.tempSelection = new Set(THOTH.activeLayer.selection);
        
        if (e.button === 0) Toolbox._brushActive();
        if (e.button === 2) Toolbox._eraserActive();
    }, false);

    el.addEventListener('mouseup', (e) => {
        if (!Toolbox.brushEnabled) return;

        if (THOTH.activeLayer === undefined) {
            return;
        };

        if (e.button === 0 || e.button === 2) {
            el.style.cursor = 'default';

            THOTH.activeLayer.selection = new Set(Toolbox.tempSelection);
            delete Toolbox.tempSelection;
            THOTH.updateVisibility();
            // history logic
        };
    }, false);

    el.addEventListener('mousemove', () => {
        if (!Toolbox.brushEnabled) return;

        if (THOTH.activeLayer === undefined) {
            return;
        };

        Toolbox._moveSelector();
        
        if (THOTH._queryData === undefined) return;

        if (THOTH._bLeftMouseDown === true)  Toolbox._brushActive();
        if (THOTH._bRightMouseDown === true) Toolbox._eraserActive();
    }, false);

    w.addEventListener('keydown', (k) => {
        if (!Toolbox.brushEnabled) return; 
        if (k.key === '[') Toolbox.decreaseSelectorSize();
        if (k.key === ']') Toolbox.increaseSelectorSize();
    }, false);
};

Toolbox.initLassoEventListeners = () => {
    let el = THOTH._renderer.domElement;
    let w = window;

    w.addEventListener('resize', () => Toolbox._resizeLassoCanvas(), false);

    el.addEventListener('mousedown', (e) => {
        if (!Toolbox.lassoEnabled) return;

        if (THOTH.activeLayer === undefined) {
            THOTH.log("No selected layer!");
            el.style.cursor = 'not-allowed';
            return;
        };
        Toolbox.tempSelection = new Set(THOTH.activeLayer.selection);

        el.style.cursor = 'crosshair';
        if (e.button === 0 || e.button === 2) Toolbox._startLasso();
    })
    el.addEventListener('mousemove', (e) => {
        if (!Toolbox.lassoEnabled) return;

        Toolbox._updatePixelPointerCoords(e);
        if (THOTH._bLeftMouseDown || THOTH._bRightMouseDown) Toolbox._updateLasso();
    })
    el.addEventListener('mouseup', (e) => {
        if (!Toolbox.lassoEnabled) return;

        if (THOTH.activeLayer === undefined) {
            THOTH.log("No selected layer!");
            return;
        };

        if (e.button === 0) {
            el.style.cursor = 'default';
            Toolbox._endLassoAdd();
            // history logic
        }

        if (e.button === 2) {
            el.style.cursor = 'default';
            Toolbox._endLassoSub();
            // history logic
        }
    })
};

Toolbox.initBrush = () => {
    Toolbox.selectorSize   = 1;
    Toolbox.selectorRadius = Toolbox._computeRadius(Toolbox.selectorSize);

    Toolbox.initBrushEventListeners();
    Toolbox.initSelector();

    Toolbox.selectorMesh.visible = false;
};

Toolbox.initLasso = () => {
    Toolbox._createLassoCanvas();
    Toolbox._resizeLassoCanvas();
    Toolbox.lassoPoints = [];
    Toolbox.initLassoEventListeners();
    Toolbox._lassoIsActive = false;
};

Toolbox.initSelector = () => {
    Toolbox.selectorGeometry = new THREE.SphereGeometry(1, 32, 16);
    Toolbox.selectorMaterial = new THREE.MeshStandardMaterial({
        color:0xffffff,
        roughness: 0.75,
        metalness: 0,
        transparent: true,
        opacity: 0.5,
        premultipliedAlpha: true,
        emissive: 0x00ff00,
        emissiveIntensity: 0.5,
    });
    Toolbox.selectorMesh = new THREE.Mesh(Toolbox.selectorGeometry, Toolbox.selectorMaterial);
    Toolbox.selectorMesh.scale.setScalar(Toolbox.selectorRadius);
    Toolbox.selectorMesh.visible = false;
    THOTH._scene.add(Toolbox.selectorMesh);
};


// update functions

Toolbox._updateScreenMove = (e) => {
    if (!Toolbox.enabled) return;
    if (e.preventDefault) e.preventDefault();

    const rect = THOTH._renderer.domElement.getBoundingClientRect();
    Toolbox._screenPointerCoords.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    Toolbox._screenPointerCoords.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
};

Toolbox._updatePixelPointerCoords = (e) => {
    const rect = THOTH._renderer.domElement.getBoundingClientRect();
    Toolbox._pixelPointerCoords = {
        x: (e.clientX - rect.left),
        y: (e.clientY - rect.top)
    };
};

Toolbox._moveSelector = () => {
    if (THOTH._queryData === undefined) {
        THOTH._renderer.domElement.style.cursor = 'default';
        Toolbox.selectorMesh.visible = false;
        return false;
    }
    THOTH._renderer.domElement.style.cursor = 'none';
    Toolbox.selectorMesh.visible = true;
    Toolbox.selectorMesh.position.copy(THOTH._queryData.p);
};


// Selection

Toolbox._selectMultipleFaces = () => {
    if (THOTH._queryData === undefined) return false;

    const inverseMatrix = new THREE.Matrix4();
    inverseMatrix.copy(THOTH.mainMesh.matrixWorld).invert();

    const sphere = new THREE.Sphere();
    sphere.center.copy(Toolbox.selectorMesh.position).applyMatrix4(inverseMatrix);
    sphere.radius = Toolbox.selectorRadius;

    const faces   = [];
    const tempVec = new THREE.Vector3();

    if (THOTH.mainMesh.geometry.boundsTree) {
        THOTH.mainMesh.geometry.boundsTree.shapecast({
            intersectsBounds: box => {
                const intersects = sphere.intersectsBox(box);
                const {min, max} = box;
                if (intersects) {
                    for (let x=0; x<=1; x++) {
                        for (let y=0; y<=1; y++) {
                            for (let z=0; z<=1; z++) {
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
                    return CONTAINED
                }
                return intersects ? INTERSECTED: NOT_INTERSECTED
            },
            intersectsTriangle: (tri, i, contained) => {
                if (contained || tri.intersectsSphere(sphere)) {
                    faces.push(i)
                }
            }
        })
    }
    else {
        console.log("Face selection failed, geometry has no bounds tree.")
    }
    return faces
};

Toolbox.addFacesToSelection = (newFaces, selection) => {
    if (newFaces === undefined || !newFaces.length) return;
        
    const newFacesSet = new Set(newFaces);
    newFacesSet.forEach(f => {
        if (!selection.has(f)) {
            selection.add(f);
        }
    });

    return selection;
};

Toolbox.delFacesFromSelection = (newFaces, selection) => {
    if (newFaces === undefined || !newFaces.length) return;
        
    const newFacesSet = new Set(newFaces);
    newFacesSet.forEach(f => {
        if (selection.has(f)) {
            selection.delete(f);
        }
    });

    return selection;
};


// Brush

Toolbox._brushActive = () => {
    const newFaces = Toolbox._selectMultipleFaces();
    const highlightColor = THOTH.Utils.hex2rgb(THOTH.activeLayer.highlightColor);
    Toolbox.tempSelection = Toolbox.addFacesToSelection(newFaces, Toolbox.tempSelection);
    THOTH.highlightSelection(newFaces, highlightColor);
};

Toolbox._eraserActive = () => {
    const newFaces = Toolbox._selectMultipleFaces();
    const highlightColor = THOTH.Utils.hex2rgb('#ffffff');
    Toolbox.tempSelection = Toolbox.delFacesFromSelection(newFaces, Toolbox.tempSelection);
    THOTH.highlightSelection(newFaces, highlightColor);
};

Toolbox.increaseSelectorSize = () => {
    Toolbox.selectorSize += 1;
    Toolbox.selectorRadius = Toolbox._computeRadius(Toolbox.selectorSize);
    Toolbox.selectorMesh.scale.setScalar(Toolbox.selectorRadius);
};

Toolbox.decreaseSelectorSize = () => {
    Toolbox.selectorSize -= 1;
    Toolbox.selectorRadius = Toolbox._computeRadius(Toolbox.selectorSize);
    Toolbox.selectorMesh.scale.setScalar(Toolbox.selectorRadius);
};

Toolbox.setSelectorSize = (size) => {
    Toolbox.selectorSize = size;
    Toolbox.selectorRadius = Toolbox._computeRadius(Toolbox.selectorSize);
    Toolbox.selectorMesh.scale.setScalar(Toolbox.selectorRadius);
};


// Lasso

Toolbox._createLassoCanvas = () => {
    Toolbox.canvas = document.createElement('canvas');
    Toolbox.canvas.id = 'lassoCanvas';
    document.body.appendChild(Toolbox.canvas);

    Object.assign(Toolbox.canvas.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '10'
    });
    Toolbox.lassoCtx = Toolbox.canvas.getContext('2d');
};

Toolbox._resizeLassoCanvas = () => {
    const dpr = window.devicePixelRatio || 1;

    Toolbox.canvas.width  = THOTH._renderer.domElement.clientWidth * dpr;
    Toolbox.canvas.height = THOTH._renderer.domElement.clientHeight * dpr;

    Toolbox.canvas.style.width  = THOTH._renderer.domElement.clientWidth + 'px';
    Toolbox.canvas.style.height = THOTH._renderer.domElement.clientHeight + 'px';
    
    Toolbox.lassoCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    Toolbox.lassoCtx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    Toolbox.lassoCtx.lineWidth   = 1;
    
    // Toolbox._cleanupLasso();
};

Toolbox._cleanupLasso = () => {
    if (!Toolbox.lassoCtx) return;
    Toolbox.lassoCtx.clearRect(0, 0, 
        Toolbox.lassoCtx.canvas.width,
        Toolbox.lassoCtx.canvas.height
    );
    Toolbox._lassoIsActive = false;
};

Toolbox._startLasso = () => {
    Toolbox._resizeLassoCanvas()
    
    Toolbox._lassoIsActive = true;
    
    Toolbox.lassoPoints = [Toolbox._pixelPointerCoords];

    Toolbox.lassoCtx.beginPath();
    Toolbox.lassoCtx.moveTo(
        Toolbox._pixelPointerCoords.x,
        Toolbox._pixelPointerCoords.y
    );
};

Toolbox._updateLasso = () => {
    if (!Toolbox._lassoIsActive) return;
    
    Toolbox.lassoPoints.push(Toolbox._pixelPointerCoords);
    
    Toolbox.lassoCtx.lineTo(Toolbox._pixelPointerCoords.x, Toolbox._pixelPointerCoords.y);
    Toolbox.lassoCtx.stroke();
};

Toolbox._endLassoAdd = () => {
    const newFaces = Toolbox._processLassoSelection();
    
    if (newFaces !== undefined && newFaces.length !== 0) {
        THOTH.activeLayer.selection = Toolbox.addFacesToSelection(newFaces, THOTH.activeLayer.selection);
        THOTH.updateVisibility();
    }
    
    Toolbox._cleanupLasso();
    Toolbox._lassoIsActive = false;
};

Toolbox._endLassoSub = () => {
    const newFaces = Toolbox._processLassoSelection();

    if (newFaces !== undefined && newFaces.length !== 0) {
        THOTH.activeLayer.selection = Toolbox.delFacesFromSelection(newFaces, THOTH.activeLayer.selection);
        THOTH.updateVisibility();
    }

    Toolbox._cleanupLasso();
    Toolbox._lassoIsActive = false;
};

Toolbox._processLassoSelection = () => {
    if (!Toolbox.lassoPoints || Toolbox.lassoPoints.length < 3) return;

    const geometry = THOTH.mainMesh.geometry;
    const camera   = THOTH._camera;
    const width    = Toolbox.canvas.width;
    const height   = Toolbox.canvas.height;
    const lassoPts = Toolbox.lassoPoints;
    const dpr      = window.devicePixelRatio || 1;

    const posAttr   = geometry.attributes.position;
    const normAttr  = geometry.attributes.normal;
    const indexAttr = geometry.index;

    const faceCount = indexAttr ? indexAttr.count / 3 : positionAttr.count / 9;
    const cameraPos = camera.getWorldPosition(new THREE.Vector3());

    const mvpMatrix = new THREE.Matrix4()
    .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    .multiply(THOTH.mainMesh.matrixWorld);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(mvpMatrix);
    
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const v3 = new THREE.Vector3();
    const n1 = new THREE.Vector3();
    const n2 = new THREE.Vector3();
    const n3 = new THREE.Vector3();

    const normal    = new THREE.Vector3();
    const centroid  = new THREE.Vector3();
    
    const camDir    = new THREE.Vector3();
    const rayDir    = new THREE.Vector3();
    const projected = new THREE.Vector3();
    
    const selectedFaces = [];

    for (let i=0; i<faceCount; i++) {
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
        v1.fromBufferAttribute(posAttr, a);
        v2.fromBufferAttribute(posAttr, b);
        v3.fromBufferAttribute(posAttr, c);

        n1.fromBufferAttribute(normAttr, a);
        n2.fromBufferAttribute(normAttr, b);
        n3.fromBufferAttribute(normAttr, c);

        centroid.copy(v1).add(v2).add(v3).divideScalar(3);
        
        // Filter faces out of camera frustum
        
        if (!frustum.containsPoint(centroid)) continue;
        
        // Filter faces that are obstructed by other faces

        if (!Toolbox.selectObstructedFaces) {
            const maxDist = cameraPos.distanceTo(centroid);
            
            rayDir.subVectors(centroid, cameraPos).normalize();
            
            const ray = new THREE.Ray(cameraPos, rayDir);
            const hit = geometry.boundsTree.raycastFirst(ray, THREE.SingleSide);
            
            if (hit && hit.distance < maxDist - 0.01) continue;
        }
        
        // Filter faces that aren't facing the camera

        normal.copy(n1).add(n2).add(n3).divideScalar(3).normalize();
        camDir.subVectors(cameraPos, centroid).normalize();
        
        if (normal.dot(camDir) <= Toolbox.normalThreshold) continue;
        
        // Project to lasso polygon

        projected.copy(centroid).project(camera);
        
        const x = ((projected.x + 1) / 2) * width / dpr;
        const y = ((-projected.y + 1) / 2) * height / dpr;

        if (Toolbox._isPointInPolygon({x, y}, lassoPts)) {
            selectedFaces.push(i);
        };
    }
    return selectedFaces;
};


// Utils

Toolbox._computeRadius = (r) => {
    return (0.25 * 1.2**r);
};

Toolbox._isPointInPolygon = (point, polygon) => {
    let inside = false;
    const { x, y } = point;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi + 1e-10) + xi);

        if (intersect) inside = !inside;
    }
    return inside;
};


// Tool activation

Toolbox.activate = () => Toolbox.enabled = true;

Toolbox.deactivate = () => {
    Toolbox.enabled = false;
    Toolbox.brushEnabled = false;
    Toolbox.lassoEnabled = false;
};

Toolbox.activateBrush = () => {
    Toolbox.enabled = true;
    Toolbox.brushEnabled = true;
    Toolbox.lassoEnabled = false;
};

Toolbox.activateLasso = () => {
    Toolbox.enabled = true;
    Toolbox.brushEnabled = false;
    Toolbox.lassoEnabled = true;
};

Toolbox.deactivateBrush = () => Toolbox.brushEnabled = false;

Toolbox.deactivateLasso = () => Toolbox.lassoEnabled = false;


// IDEA: Do frustum culling for only a small area around the lasso selection
// IDEA: Create alternative to highlight all faces that only iterates over new faces