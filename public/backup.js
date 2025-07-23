
THOTH._bAtonInitialized = ATON._bInitialized;
THOTH.clearEventHandlers = ATON.clearEventHandlers;
THOTH.on = ATON.on;
THOTH.fire = ATON.fire;


class Layer {
    constructor() {
        this.name = "Untitled";
        this.selection = new Set();
        this.highlightColor = "#ff0000";
        this.description = null;
    }

    toJSON() {
        return {
            name: this.name,
            selection: Array.from(this.selection),
            description: this.description
        };
    }

    static fromJSON(json) {
        return new Layer(
            json.name,
            new Set(json.selectedFaces),
            json.description
        );
    }
};

Scene.MODE_ADD = 0;
Scene.MODE_DEL = 1;


Scene.patch = ATON.SceneHub.patch;
Scene.load  = ATON.SceneHub.load;
Scene.currData = ATON.SceneHub.currData;
Scene.photonFire = ATON.Photon.fire;

// Init functions

THOTH.setup = async () => {
    THOTH.log("Initializing THOTH...");

    _parseAtonElements = async () => {
    
        const getMainMesh = () => {
            let mesh = null;
            THOTH._scene.traverse(obj => {
                if (obj.isMesh && !mesh) mesh = obj;
            });
            return mesh;
        };
        
        const waitForMainMesh = () => {
            return new Promise(resolve => {
                const check = () => {
                    if (THOTH._bAtonLoading) {
                        // Assign other dependencies now that everything is ready
                        THOTH._scene    = ATON._mainRoot;
                        THOTH._mainMesh = getMainMesh();
                        THOTH._renderer = ATON._renderer;
                        THOTH._camera   = ATON.Nav._camera;

                        resolve();
                    } else {
                        setTimeout(check, 200);
                    }
                };
                check();
            });
        };

        await waitForMainMesh();
    };
    
    await _parseAtonElements();
    
    THOTH.UI.setup();
    THOTH.FE.setup();
    
    THOTH.layers = new Map();
    THOTH.selectedLayerId = null;
    
    // Import annotations 
    THOTH.toolbox = new Toolbox(THOTH._scene, THOTH._camera, THOTH._renderer, THOTH._mainMesh);
    THOTH.updateEventHandlers();
    
    THOTH.log("THOTH initialized successfully!");
};

THOTH.updateEventHandlers = () => {
    THOTH.clearEventHandlers("KeyPress");

    THOTH.setupEventHandlers();
};


THOTH.createNewLayer = () => {
    function getFirstUnusedKey(map) {
        let i = 0;
        while (map.has(i)) {
            i++;
        }
        return i;
    };

    const id    = getFirstUnusedKey(THOTH.layers);
    const layer = new Layer();

    THOTH.layers.set(id, layer);

    THOTH.FE.createNewLayer(id)

    THOTH.log("Created new Layer");
};


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


const { INTERSECTED, NOT_INTERSECTED, CONTAINED } = window.ThreeMeshBVH;

class Toolbox {
    constructor(scene, camera, renderer, mesh, optParams) {
        this.scene    = scene;
        this.camera   = camera;
        this.renderer = renderer;
        this.mesh     = mesh;

        if (!optParams) optParams = {};
        this.defaultColor   = optParams.defaultColor   ?? new THREE.Color(0xffffff);
        this.highlightColor = optParams.highlightColor ?? new THREE.Color(0xff0000);
        
        this.selectorMaterial = optParams.selectorMaterial ?? undefined;
        this.lassoColor       = optParams.lassoColor       ?? 'rgba(0, 255, 0, 0.7)';
        this.lassoWidth       = optParams.lassoWidth       ?? 1;

        this.normalThreshold       = optParams.normalThreshold       ?? 0; // [-1 , 1] 
        this.selectObstructedFaces = optParams.selectObstructedFaces ?? false;
        
        this.rcLayer = optParams.rcLayer;

        this._screenPointerCoords = new THREE.Vector2(0.0, 0.0);

        this._bPauseQuery  = false;
        this._bInitialized = false;

        this.initRC();
        this.initMeshMat();
        this.initEventListeners();
        this.initHistory();

        this.initBrush();
        this.initLasso();

        this.currSelection = new Set();
        this.tempSelection = new Set();
        this.enableHistory = true;

        this._bInitialized = true;
        
        this.visible      = true;
        this.enabled      = false;
        this.brushEnabled = false;
        this.lassoEnabled = false;

        this._onSelectionEndCallback = null;
    }

    // init functions

    initRC() {
        this.raycaster = new THREE.Raycaster();
        this.raycaster.layers.set(this.layers);
        this.raycaster.firstHitOnly = true;
        
        if (!this.mesh.geometry.boundsTree) {
            console.log("No bounds tree, computing bounds tree");
            this.mesh.geometry.computeBoundsTree();
        }
    }

    initEventListeners() {
        let el = this.renderer.domElement;
        let w = window;

        el.addEventListener('resize', () => {
            this.camera.aspect = w.innerWidth / w.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w.innerWidth, w.innerHeight);
        }, false)

        el.addEventListener('mousemove', (e) => {
            if (!this.enabled) return;

            this._updateScreenMove(e);
            this._query();
        }, false);

        el.addEventListener('mousedown', (e) => {
            if (e.button === 0) this._bLeftMouseDown = true;
            if (e.button === 2) this._bRightMouseDown = true;
        }, false);
        el.addEventListener('mouseup', (e) => {
            if (e.button === 0) this._bLeftMouseDown = false;
            if (e.button === 2) this._bRightMouseDown = false;
        }, false);    
    }

    initBrushEventListeners() {
        let el = this.renderer.domElement;
        let w  = window;

        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        })

        el.addEventListener('mousedown', (e) => {
            if (!this.brushEnabled) return;

            this.tempSelection = new Set(this.currSelection);
            
            if (e.button === 0) this._brushActive();
            if (e.button === 2) this._eraserActive();
        }, false);
        el.addEventListener('mouseup', (e) => {
            if (!this.brushEnabled) return;

            this._addToHistory();

            if (e.button === 0 || e.button === 2) {
                if (this._onSelectionEndCallback) {
                    this._onSelectionEndCallback([...this.currSelection]);
                }
            }
        }, false);
        el.addEventListener('mousemove', () => {
            if (!this.brushEnabled) return;

            this._moveSelector();
            if (this._bLeftMouseDown === true) this._brushActive();
            if (this._bRightMouseDown === true) this._eraserActive();
        }, false);

        w.addEventListener('keydown', (k) => {
            if (!this.brushEnabled) return; 
            if (k.key === '[') this.decreaseSelectorSize();
            if (k.key === ']') this.increaseSelectorSize();
        }, false);
    }

    initLassoEventListeners() {
        let el = this.renderer.domElement;
        let w = window;

        w.addEventListener('resize', () => this._resizeLassoCanvas(), false);

        el.addEventListener('mousedown', (e) => {
            if (!this.lassoEnabled) return;

            this.tempSelection = new Set(this.currSelection);

            el.style.cursor = 'crosshair';
            if (e.button === 0 || e.button === 2) this._startLasso();
        })
        el.addEventListener('mousemove', (e) => {
            if (!this.lassoEnabled) return;
            this._updatePixelPointerCoords(e);
            if (this._bLeftMouseDown || this._bRightMouseDown) this._updateLasso();
        })
        el.addEventListener('mouseup', (e) => {
            if (!this.lassoEnabled) return;

            this._addToHistory();

            if (e.button === 0) {
                el.style.cursor = 'default';
                this._endLassoAdd();
                if (this._onSelectionEndCallback) {
                    this._onSelectionEndCallback([...this.currSelection]);
                }
            }

            if (e.button === 2) {
                el.style.cursor = 'default';
                this._endLassoSub();
                if (this._onSelectionEndCallback) {
                    this._onSelectionEndCallback([...this.currSelection]);
                }
            }
        })
    }

    initMeshMat() {
        this.mesh.material.vertexColors = true;
        this.mesh.material.needsUpdate  = true;

        if (!this.mesh.geometry.attributes.color) {
            let colorArray, colorAttr;
            colorArray = new Float32Array(this.mesh.geometry.attributes.position.count * 3);

            for (let i = 0; i < this.mesh.geometry.attributes.position.count; i++) {
                colorArray[i * 3 + 0] = this.defaultColor.r;
                colorArray[i * 3 + 1] = this.defaultColor.g;
                colorArray[i * 3 + 2] = this.defaultColor.b;
            }

            colorAttr = new THREE.BufferAttribute(colorArray, 3);
            this.mesh.geometry.setAttribute('color', colorAttr);
        }
    }

    initBrush() {
        this.selectorSize   = 1;
        this.selectorRadius = this._computeRadius(this.selectorSize);

        this.initSelector();
        this.initBrushEventListeners();

        this.selectorMesh.visible = false;
    }

    initLasso() {
        this._createLassoCanvas();
        this._resizeLassoCanvas();
        this.lassoPoints = [];
        this._lassoIsActive = false;

        this.initLassoEventListeners();
    }

    initSelector() {
        this.selectorGeometry = new THREE.SphereGeometry(1, 32, 16);
        this.selectorMaterial = this.selectorMaterial ?? new THREE.MeshStandardMaterial({
            color:0xffffff,
            roughness: 0.75,
            metalness: 0,
            transparent: true,
            opacity: 0.5,
            premultipliedAlpha: true,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5,
        });
        this.selectorMesh = new THREE.Mesh(this.selectorGeometry, this.selectorMaterial);
        this.selectorMesh.scale.setScalar(this.selectorRadius);
        this.selectorMesh.visible = false;
        this.scene.add(this.selectorMesh);
    }

    initHistory() {
        this.historyIdx = 0;
        this.undoStack  = [];
        this.redoStack  = [];
    }

    // onUpdate functions

    _updateScreenMove(e) {
        if (e.preventDefault) e.preventDefault();

        const rect = this.renderer.domElement.getBoundingClientRect();
        this._screenPointerCoords.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this._screenPointerCoords.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    _updatePixelPointerCoords(e) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this._pixelPointerCoords = {
            x: (e.clientX - rect.left),
            y: (e.clientY - rect.top)
        };
    }

    _query() {
        if (this._bPauseQuery) return;

        this._hits = [];

        this.raycaster.setFromCamera(this._screenPointerCoords, this.camera);
        this.raycaster.intersectObject(this.mesh, true, this._hits);

        let hitsnum = this._hits.length;
        if (hitsnum <= 0) {
            this._queryData = undefined;
            return;
        }

        const h = this._hits[0];
        this._queryData = {};
        this._queryData.p = h.point;
        this._queryData.d = h.distance;
        this._queryData.o = h.object;
    }

    _moveSelector() {
        if (this._queryData === undefined) {
            this.renderer.domElement.style.cursor = 'default';
            this.selectorMesh.visible = false;
            return false;
        }
        this.renderer.domElement.style.cursor = 'none';
        this.selectorMesh.visible = true;
        this.selectorMesh.position.copy(this._queryData.p);
    }

    // visualization functions

    _clearHighlights() {
        const colorAttr = this.mesh.geometry.attributes.color;
        const colorArray = colorAttr.array;

        for (let i=0; i < colorArray.length; i++) {
            colorArray[i] = 1;
        }

        colorAttr.needsUpdate = true;
    }

    _highlightFacesOnMesh(selectedFaces) {
        if (!this.visible) return;
        
        if (selectedFaces === undefined) return;
        
        const colorAttr = this.mesh.geometry.attributes.color;
        const indexAttr = this.mesh.geometry.index;

        const colors = colorAttr.array;
        const stride = colorAttr.itemSize;
        const r = this.highlightColor.r, g = this.highlightColor.g, b = this.highlightColor.b;

        const writeVertex = (base) => {
            colors[base    ] = r;
            colors[base + 1] = g;
            colors[base + 2] = b;
        }

        if (indexAttr) {
            const indices = indexAttr.array;
            for (const face of selectedFaces){
                writeVertex(indices[face * 3    ] * stride);
                writeVertex(indices[face * 3 + 1] * stride);
                writeVertex(indices[face * 3 + 2] * stride);
            }
        } else {
            for (const face of selectedFaces){
                const faceStart = face * 3 * stride;
                writeVertex(faceStart);
                writeVertex(faceStart + stride);
                writeVertex(faceStart + 2 * stride);
            }
        }

        colorAttr.needsUpdate = true;
        return;
    }

    // selection functions

    _selectMultipleFaces() {
        if (this._bPauseQuery) return false;
        if (this._queryData === undefined) return false;

        const inverseMatrix = new THREE.Matrix4();
        inverseMatrix.copy(this.mesh.matrixWorld).invert();

        const sphere = new THREE.Sphere();
        sphere.center.copy(this.selectorMesh.position).applyMatrix4(inverseMatrix);
        sphere.radius = this.selectorRadius;

        const faces   = [];
        const tempVec = new THREE.Vector3();

        if (this.mesh.geometry.boundsTree) {
            this.mesh.geometry.boundsTree.shapecast({
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
    }

    _filterFacesAdd(selectedFaces) {
        if (selectedFaces === undefined || !selectedFaces.length) return;
        
        const newFacesSet = new Set(selectedFaces);
        newFacesSet.forEach(f => {
            if (!this.currSelection.has(f)) {
                this.currSelection.add(f);
            }
        });
    }

    _filterFacesDel(selectedFaces) {
        if (selectedFaces === undefined || !selectedFaces.length) return;
        
        const newFacesSet = new Set(selectedFaces);
        newFacesSet.forEach(f => {
            if (this.currSelection.has(f)) {
                this.currSelection.delete(f);
            }
        });
    }

    // brush functions

    _brushActive() {
        const newFaces = this._selectMultipleFaces();
        this._filterFacesAdd(newFaces);
        this._clearHighlights();
        this._highlightFacesOnMesh(this.currSelection);
    }

    _eraserActive() {
        const newFaces = this._selectMultipleFaces();
        this._filterFacesDel(newFaces);
        this._clearHighlights();
        this._highlightFacesOnMesh(this.currSelection);
    }

    increaseSelectorSize() {
        this.selectorSize += 1;
        this.selectorRadius = this._computeRadius(this.selectorSize);
        this.selectorMesh.scale.setScalar(this.selectorRadius);
    }

    decreaseSelectorSize() {
        this.selectorSize -= 1;
        this.selectorRadius = this._computeRadius(this.selectorSize);
        this.selectorMesh.scale.setScalar(this.selectorRadius);
    }

    // lasso functions

    _createLassoCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'lassoCanvas';
        document.body.appendChild(this.canvas);

        Object.assign(this.canvas.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '10'
        });
        this.lassoCtx = this.canvas.getContext('2d');
    }

    _resizeLassoCanvas() {
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width  = this.renderer.domElement.clientWidth * dpr;
        this.canvas.height = this.renderer.domElement.clientHeight * dpr;

        this.canvas.style.width  = this.renderer.domElement.clientWidth + 'px';
        this.canvas.style.height = this.renderer.domElement.clientHeight + 'px';
        
        this.lassoCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.lassoCtx.strokeStyle = this.lassoColor;
        this.lassoCtx.lineWidth   = this.lassoWidth;
        
        this._cleanupLasso();
    }

    _cleanupLasso() {
        if (!this.lassoCtx) return;
        this.lassoCtx.clearRect(0, 0, 
            this.lassoCtx.canvas.width,
            this.lassoCtx.canvas.height
        );
        this._lassoIsActive = false;
    }

    _startLasso() {
        this._resizeLassoCanvas()
        
        this._lassoIsActive = true;
        
        this.lassoPoints = [this._pixelPointerCoords];

        this.lassoCtx.beginPath();
        this.lassoCtx.moveTo(
            this._pixelPointerCoords.x,
            this._pixelPointerCoords.y
        );
    }
    
    _updateLasso() {
        if (!this._lassoIsActive) return;
        
        this.lassoPoints.push(this._pixelPointerCoords);
        
        this.lassoCtx.lineTo(this._pixelPointerCoords.x, this._pixelPointerCoords.y)
        this.lassoCtx.stroke();
    }

    _endLassoAdd() {
        const newFaces = this._processLassoSelection();
        this._filterFacesAdd(newFaces);
        this._clearHighlights();
        this._highlightFacesOnMesh(this.currSelection);
        this._cleanupLasso();
        this._lassoIsActive = false;
    }

    _endLassoSub() {
        const newFaces = this._processLassoSelection();
        this._filterFacesDel(newFaces);
        this._clearHighlights();
        this._highlightFacesOnMesh(this.currSelection);
        this._cleanupLasso();
        this._lassoIsActive = false;
    }

    _processLassoSelection() {
        if (!this.lassoPoints || this.lassoPoints.length < 3) return;

        const geometry = this.mesh.geometry;
        const camera   = this.camera;
        const width    = this.canvas.width;
        const height   = this.canvas.height;
        const lassoPts = this.lassoPoints;
        const dpr      = window.devicePixelRatio || 1;

        const posAttr   = geometry.attributes.position;
        const normAttr  = geometry.attributes.normal;
        const indexAttr = geometry.index;

        const faceCount = indexAttr ? indexAttr.count / 3 : positionAttr.count / 9;
        const cameraPos = camera.getWorldPosition(new THREE.Vector3());

        const mvpMatrix = new THREE.Matrix4()
        .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        .multiply(this.mesh.matrixWorld);
        const frustum = new THREE.Frustum().setFromProjectionMatrix(mvpMatrix);
        
        const v1 = new THREE.Vector3();
        const v2 = new THREE.Vector3();
        const v3 = new THREE.Vector3();
        const n1 = new THREE.Vector3();
        const n2 = new THREE.Vector3();
        const n3 = new THREE.Vector3();

        const normal    = new THREE.Vector3();
        const centroid      = new THREE.Vector3();
        
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

            if (!this.selectObstructedFaces) {
                const maxDist = cameraPos.distanceTo(centroid);
                
                rayDir.subVectors(centroid, cameraPos).normalize();
                
                const ray = new THREE.Ray(cameraPos, rayDir);
                const hit = geometry.boundsTree.raycastFirst(ray, THREE.SingleSide);
                
                if (hit && hit.distance < maxDist - 0.01) continue;
            }
            
            // Filter faces that aren't facing the camera

            normal.copy(n1).add(n2).add(n3).divideScalar(3).normalize();
            camDir.subVectors(cameraPos, centroid).normalize();
            
            if (normal.dot(camDir) <= this.normalThreshold) continue;
            
            // Project to lasso polygon

            projected.copy(centroid).project(camera);
            
            const x = ((projected.x + 1) / 2) * width / dpr;
            const y = ((-projected.y + 1) / 2) * height / dpr;

            if (this._isPointInPolygon({x, y}, lassoPts)) {
                selectedFaces.push(i);
            };
        }
        return selectedFaces;
    }

    // utils

    _computeRadius(r) {
        return (0.25 * 1.2**r);
    }

    _isPointInPolygon(point, polygon) {
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
    }

    // tool activation

    activate() {
        this.enabled = true;
    }

    deactivate() {
        this.enabled      = false;
        this.brushEnabled = false;
        this.lassoEnabled = false;
    }

    activateBrush() {
        this.enabled      = true;
        this.brushEnabled = true;
        this.lassoEnabled = false;
    }

    deactivateBrush() {
        this.brushEnabled = false;
    }

    activateLasso() {
        this.enabled      = true;
        this.brushEnabled = false;
        this.lassoEnabled = true;
    }

    deactivateLasso() {
        this.lassoEnabled = false;
    }

    changeHighlightcColor(color) {
        this.highlightColor = new THREE.Color(color);
        this._highlightFacesOnMesh(this.currSelection);
    }

    toggleHighlights() {
        if (this.visible)  this.enableHighlights();
        if (!this.visible) this.disableHighlights();
    }

    enableHighlights() {
        this.visible = true;
        this._clearHighlights();
        this._highlightFacesOnMesh(this.currSelection);
    }

    disableHighlights() {
        this.visible = true;
        this._clearHighlights();
    }

    // history

    _addToHistory() {
        if (!this.enableHistory) return;

        if (this.tempSelection.size !== this.currSelection.size) {
            this.undoStack.push(new Set(this.tempSelection));
            this.redoStack = [];
            this.historyIdx += 1;
        }

        this.tempSelection = new Set();
    }

    undo() {
        if (!this.enableHistory) return;

        if (this.undoStack.length === 0) return;
        
        this.redoStack.push(new Set(this.currSelection));
        this.currSelection = this.undoStack.pop();
        
        this.historyIdx -= 1;
        
        this._clearHighlights();
        this._highlightFacesOnMesh(this.currSelection);
    }
    
    redo() {
        if (!this.enableHistory) return;

        if (this.redoStack.length === 0) return;

        this.undoStack.push(new Set(this.currSelection));
        this.currSelection = this.redoStack.pop();
        
        this.historyIdx += 1;
        
        this._clearHighlights();
        this._highlightFacesOnMesh(this.currSelection);
    }

    jumpToHistory(idx) {
        if (!this.enableHistory) return;
        
        if (idx < 0 || idx > this.historyIdx + this.redoStack.length) return;
        if (idx < this.historyIdx) {
            while (this.historyIdx > idx) {
                this.undo();
            }
            return;
        }
        if (idx === this.historyIdx) return;
        if (idx > this.historyIdx) {
            while (this.historyIdx < idx) {
                this.undo();
            }
            return;
        }
    }

    // tool callback

    onSelectionEnd(callback) {
        this._onSelectionEndCallback = callback;
    }

    // THOTH specifics

    switchLayer(layer) {
        this.currSelection  = layer.selection;
        this.visible        = layer.visible;
        this.highlightColor = layer.color;
    }
};
