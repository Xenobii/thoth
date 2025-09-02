/*
    THOTH Plugin for ATON - Front End

    author: steliosalvanos@gmail.com

===========================================================*/

let FE = {};


FE.init = () => {
    FE.layerButtons = new Map();

    FE._bPopup = false;
    FE.uiScale = 2;

    FE.setupTextailsElements();
    FE.setupUI();
};


// Setup

FE.setupUI =() => {
    // Create new containers
    const topRightContainer = document.createElement('div');
    topRightContainer.id                = 'guicanvasTR';
    topRightContainer.style.position    = 'absolute';
    topRightContainer.style.top         = '0px';          
    topRightContainer.style.right       = '0px';   
    topRightContainer.style.zIndex      = '120';
    document.body.appendChild(topRightContainer);

    const lowerLeftContainer = document.createElement('div');
    lowerLeftContainer.id               = 'guicanvasLL';
    lowerLeftContainer.style.position   = 'absolute';
    lowerLeftContainer.style.top        = '60px';          
    lowerLeftContainer.style.left       = '0px';   
    lowerLeftContainer.style.zIndex     = '120';
    document.body.appendChild(lowerLeftContainer);

    const topLeftContainer = document.createElement('div');
    topLeftContainer.id                 = 'guicanvasTL';
    topLeftContainer.style.position     = 'absolute';
    topLeftContainer.style.top          = '0px';          
    topLeftContainer.style.left         = '0px';   
    topLeftContainer.style.zIndex       = '120';
    document.body.appendChild(topLeftContainer);

    const bottomRightContainer = document.createElement('div');
    bottomRightContainer.id             = 'guicanvasBR';
    bottomRightContainer.style.position = 'absolute';
    bottomRightContainer.style.bottom   = '50px';          
    bottomRightContainer.style.right    = '0px';   
    bottomRightContainer.style.zIndex   = '120';
    document.body.appendChild(bottomRightContainer);

    const bottomLeftContainer = document.createElement('div');
    bottomLeftContainer.id              = 'guicanvasBL';
    bottomLeftContainer.style.position  = 'absolute';
    bottomLeftContainer.style.bottom    = '50px';          
    bottomLeftContainer.style.left      = '0px';   
    bottomLeftContainer.style.zIndex    = '120';
    document.body.appendChild(bottomLeftContainer);

    const popupContainer = document.createElement('div');
    popupContainer.id                   = 'popupcanvas';
    popupContainer.style.position       = 'absolute';
    popupContainer.style.top            = '150px';
    popupContainer.style.left           = '250px';
    popupContainer.style.zIndex         = '121';
    document.body.appendChild(popupContainer);
    FE.popupContainer = popupContainer;

    // Toolbox
    FE.toolboxPane = new Pane({
        container: lowerLeftContainer,
        title: 'Toolbox',
        expanded: true,
    });

    // Layer Management
    FE.layerManagementPane = new Pane({
        container: topRightContainer, 
        title: 'Layer Management',
        expanded: true,
    });

    // Layer Pane
    FE.layerPane = new Pane({
        container: topRightContainer,
        title: 'Layers',
        expanded: true,
    });
    enablePaneScroll(FE.layerPane, 200);  // apply scroll only to this pane
    
    // Details Pane
    FE.detailsPane = new Pane({
        container: bottomRightContainer,
        title: 'Layer details',
        expanded: true,
    });

    FE.exportPane = new Pane({
        container: bottomRightContainer,
        title: 'Export Settings',
        expanded: true,
    });
    
    // History Pane 
    FE.historyPane = new Pane({ 
        container: bottomLeftContainer, 
        title: 'History', 
        expanded: true 
    });

    FE.setupToolboxPane();
    FE.setupLayerPane();
    FE.setupExportPane();
    FE.setupHistoryPane();

    FE.updateUIScale();
};


// General

FE.applyPaneStyling = (k, pane, btnWidth = 150) => {
    const height_scale  = 10 * k;
    const width_scale   = k;
    const font_scale_1  = 5 * k;
    const font_scale_2  = 6 * k;
    const margin_scale  = 2 * k;

    pane.element.querySelectorAll('.tp-btnv_b').forEach(btn => {
        btn.style.minHeight = `${height_scale}px`;
        btn.style.width = `${width_scale * btnWidth}px`;
        btn.style.margin = `${margin_scale}px 0`;
        btn.style.fontSize = `${font_scale_1}px`;
    });
    const title = pane.element.querySelector('.tp-rotv_t');
    if (title) {
        title.style.fontWeight = '600';
        title.style.fontSize = `${font_scale_2}px`;
    }
};

FE.updateUIScale = (k) => {
    if (k === undefined) k = FE.uiScale;
    if (k <= 0) return false;

    FE.uiScale = k; 

    FE.applyPaneStyling(FE.uiScale, FE.toolboxPane, 50);
    FE.applyPaneStyling(FE.uiScale, FE.historyPane, 60);
    FE.applyPaneStyling(FE.uiScale, FE.layerManagementPane, 80);
    FE.applyPaneStyling(FE.uiScale, FE.layerPane, 80);
    FE.applyPaneStyling(FE.uiScale, FE.detailsPane, 90);
    FE.applyPaneStyling(FE.uiScale, FE.exportPane, 90);
};


// Textailes elements

FE.setupBackground = (color1, color2) => {
    const dpr       = window.devicePixelRatio || 1;
    const canvas    = document.createElement('canvas')
    canvas.width    = THOTH._renderer.domElement.clientWidth * dpr;
    canvas.height   = THOTH._renderer.domElement.clientHeight * dpr;
    const ctx       = canvas.getContext('2d');

    // Make vertical gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Apply to scene
    const texture = new THREE.CanvasTexture(canvas);
    THOTH._scene.background = texture;
};

FE.addTextailesRef = () => {
    const div = document.createElement('div');
    div.id = 'idPoweredBy';
    div.className = 'textailesPoweredBy';
    
    // Styling
    div.style.position      = 'fixed';
    div.style.right         = '0px';
    div.style.bottom        = '0px';
    div.style.display       = 'inline-block';
    div.style.position      = 'fixed';
    div.style.zIndex        = 150;
    div.style.color         = '#FFF';
    div.style.textShadow    = '0px 0px 4px #000000';
    div.style.fontSize      = '70%';
    div.style.padding       = '5px';
    div.style.textAlign     = 'right';

    const thoth_link        = document.createElement('a');
    thoth_link.href         = 'https://github.com/Xenobii/thoth';
    thoth_link.target       = '_blank';
    thoth_link.textContent  = 'THOTH'
    
    const text  = document.createTextNode(' is powered by ');
    
    const textailes_link        = document.createElement('a');
    textailes_link.href         = 'https://www.echoes-eccch.eu/textailes/';
    textailes_link.target       = '_blank';
    textailes_link.textContent  = 'TEXTaiLES';

    div.appendChild(thoth_link);
    div.appendChild(text);
    div.appendChild(textailes_link);

    document.body.append(div);
};

FE.setupTextailsElements = () => {
    // Background
    textailes_colors = ['#B37C8B', '#265D72', '#C39CAB','#88abb9ff'];   // Temp
    FE.setupBackground(textailes_colors[3], textailes_colors[2]);

    // Text - link
    FE.addTextailesRef();
};


// Toolbox

FE.setupToolboxPane = () => {
    // Brush
    const btnBrush = FE.toolboxPane.addButton({
        title: 'BRUSH 🖌',
    });
    btnBrush.on('click', () => {
        THOTH.Toolbox.activateBrush();
        THOTH.setUserControl(false);
    });

    // Eraser
    const btnEraser = FE.toolboxPane.addButton({
        title: 'ERRASER 🧽',
    });
    btnEraser.on('click', () => {
        THOTH.Toolbox.activateEraser();
        THOTH.setUserControl(false);
    });

    // Lasso
    const btnLasso = FE.toolboxPane.addButton({
        title: 'LASSO 𐚁',
    });
    btnLasso.on('click', () => {
        THOTH.Toolbox.activateLasso();
        THOTH.setUserControl(false);
    });

    // None
    const btnNone = FE.toolboxPane.addButton({
        title: 'NONE',
    });
    btnNone.on('click', () => {
        THOTH.Toolbox.deactivate();
        THOTH.setUserControl(true);
    });
};

FE.updateToolRadiusUI = () => {
    if (FE.toolboxPane.brushScale)  FE.toolboxPane.brushScale.dispose();
    if (FE.toolboxPane.eraserScale) FE.toolboxPane.eraserScale.dispose();
    
    if (THOTH.Toolbox.brushEnabled) {
        FE.toolboxPane.brushScale = FE.toolboxPane.addBinding(THOTH.Toolbox.selectorSize, 'brushScale', {
            min: -10,
            max:  10,
            step: 1,
        });
    }
    if (THOTH.Toolbox.brushEnabled) {
        FE.toolboxPane.eraserScale = FE.toolboxPane.addBinding(THOTH.Toolbox.selectorSize, 'eraserScale', {
            min: -10,
            max:  10,
            step: 1,
        });
    }

    // Event listener for changes
    // Brush
    if (FE.toolboxPane.brushScale) {
        FE.toolboxPane.brushScale.on('change', (e) => {
            THOTH.Toolbox.setSelectorSize(THOTH.Toolbox.selectorSize);
        });
    }
    // Eraser 
    if (FE.toolboxPane.eraserScale) {
        FE.toolboxPane.eraserScale.on('change', (e) => {
            THOTH.Toolbox.setSelectorSize(THOTH.Toolbox.selectorSize);
        });
    }
};


// Layers

FE.setupLayerPane = () => {
    const newLayerBtn = FE.layerManagementPane.addButton({
        title: "ADD LAYER ➕",
    });

    newLayerBtn.on('click', () => {
        // Create layers if not present
        if (!THOTH.Scene.currData.layers) {
            THOTH.Scene.currData.layers = {};
        };

        // Get first unused id
        const id = THOTH.Utils.getFirstUnusedKey(THOTH.Scene.currData.layers);

        // Add to history
        THOTH.HIS.pushAction(
            THOTH.HIS.ACTIONS.CREATE_LAYER,
            id
        );
        
        THOTH.fire("createLayer", (id));
        THOTH.firePhoton("createLayer", (id));
    });

    // Add Delete Layer button next to it
    const deleteLayerBtn = FE.layerManagementPane.addButton({
        title: "DELETE LAYER 🗑️",
    });

    deleteLayerBtn.on('click', () => {
        if (!THOTH.activeLayer) return;   // nothing selected
        FE.popupConfirmDelete(THOTH.activeLayer.id);
    });

    // Import previously saved layers
    const layers = Scene.currData.layers;
    if (layers === undefined) return;

    Object.values(layers).forEach((layer) => {
        if (layer.trash) return;

        THOTH.FE.addToLayers(layer.id);
    });

};

FE.addToLayers = (id) => {
    const layer    = THOTH.Scene.currData.layers[id]; 
    const layerBtn = FE.layerPane.addButton({
        title: layer.name,
    });

    // Add to buttons for future reference
    FE.layerButtons.set(id, layerBtn)

    // Event handler
    layerBtn.on('click', () => {
        // Switch to current layer
        THOTH.activeLayer = layer;
        FE.displayDetails();
    });

    // Enable rename from extension
    //enableButtonRename(layerBtn, layer, 'name');

    // Call global extension function
    if (typeof window.enableButtonRename === "function") {
        window.enableButtonRename(layerBtn, layer, "name");
    }

    FE.updateUIScale();

};


// Details

FE.displayDetails = () => {
    if (FE.detailTabs) FE.detailTabs.dispose();

    const activeLayer = THOTH.activeLayer;
    
    FE.detailTabs = FE.detailsPane.addTab({
        pages: [
            {title: "General"},
            {title: "Details"},
        ],
    });

    // General Attributes
    const nameAttr    = FE.detailTabs.pages[0].addBinding(activeLayer, 'name'); 
    const visibleAttr = FE.detailTabs.pages[0].addBinding(activeLayer, 'visible');
    const colorAttr   = FE.detailTabs.pages[0].addBinding(activeLayer, 'highlightColor', {
        picker: 'inline',
        expanded: true,
    });

    // Detail Attributes
    const descriptionAttr = FE.detailTabs.pages[1].addBinding(activeLayer, 'description', {
        multiline: true,
        rows: 4
    });
    const editDescriptionBtn = FE.detailTabs.pages[0].addButton({
        title: "Edit Description"
    });

    // Buttons
    const deleteBtn  = FE.detailTabs.pages[0].addButton({
        title: "Delete Layer",
    });

    // Event listeners
    nameAttr.on('change', () => {
        // THOTH.editLayerName(activeLayer.id);
    });
    visibleAttr.on('change', () => {
        THOTH.updateVisibility();
    });
    colorAttr.on('change', () => {
        const id = activeLayer.id;
        const highlightColor = activeLayer.highlightColor;
        THOTH.fire("editLayer", {id:id, attr:"highlightColor", value:highlightColor});
        THOTH.firePhoton("editLayer", {id:id, attr:"highlightColor", value:highlightColor});
        THOTH.updateVisibility();
    });
    deleteBtn.on('click', () => {
        FE.popupConfirmDelete(activeLayer.id);
    });
    editDescriptionBtn.on('click', () => {
        PopUpEditDescription(activeLayer.id, 
            [
                { key: "author",      label: "author",      placeholder: "Enter author" },
                { key: "title",       label: "title",       placeholder: "Enter title" },
                { key: "description", label: "description", placeholder: "Short description" },
                { key: "previewImage", label: "image",      placeholder: "Paste image URL", type: "image" }
            ]
        );
    });
};


// Export

FE.setupExportPane = () => {
    const exportAnnotationBtn = FE.exportPane.addButton({
        title: "Export Current Annotation",
    });

    exportAnnotationBtn.on('click', () => {
        THOTH.Scene.exportChanges();
    });
};

// History

// your frontend file
// (after FE.historyPane and HIS are available, and after the IIFE above is loaded)

FE.setupHistoryPane = () => {
  const btnHistList = FE.historyPane.addButton({ title: 'HISTORY LIST 🕮' });
  window.attachHistoryChooser(FE.historyPane, btnHistList, { label: 'Jump to' });

  const btnUndo = FE.historyPane.addButton({ title: 'UNDO ↺' });
  btnUndo.on('click', () => HIS.undo());

  const btnRedo = FE.historyPane.addButton({ title: 'REDO ↻' });
  btnRedo.on('click', () => HIS.redo());
};


// Popups

FE.popupConfirmDeleteTK = (id) => {
    const layer = THOTH.layers.get(id);

    // Don't create popup if it already exists
    if (FE.popupPane && FE.popupPane.containerElem_ !== null) return;

    // Popup Setup
    FE.popupPane = new Pane({
        container: FE.popupContainer,
        title: 'Confirm Deletion?',
        expanded: true,
    });

    // FE.popupPane.addBlade()

    const deleteButton = FE.popupPane.addButton({
        title: "Confirm",
    });
    const cancelButton = FE.popupPane.addButton({
        title: "Cancel"
    });

    deleteButton.on('click', () => {
        THOTH.deleteLayer(id);
        FE.popupPane.dispose();
    });
    cancelButton.on('click', () => {
        FE.popupPane.dispose();
    });
};

FE.popupShow = (htmlcontent, cssClasses) => {
    if (FE._bPopup) return false;

    // Define class
    let clstr = "atonPopup ";
    if (cssClasses) clstr += cssClasses;
    
    // Get htmlcontent that defines the popup
    let htcont = "<div id='idPopupContent' class='"+clstr+"'>";
    htcont += htmlcontent+"</div>";

    FE._bPopup = true;
    ATON._bListenKeyboardEvents = false;

    $('#idPopup').html(htcont);
    $('#idPopupContent').click((e) => {e.stopPropagation(); });
    $('#idPopup').show();

    THOTH._bPauseQuery = true;
    
    // Handle visibility of other panels

    return true;
};

FE.popupClose = () => {
    FE._bPopup = false;

    $('#idPopup').hide();
    
    THOTH._bPauseQuery = false;
};

FE.popupConfirmDelete = (id) => {
    const layer = THOTH.Scene.currData.layers[id];

    let head = "Delete "+ layer.name + "?";

    let htmlcontent = "<div class='atonPopupTitle'>"+head+"</div>";

    htmlcontent += "<div class='atonBTN atonBTN-green' id='btnOK' style='width:90%'>OK</div>";
    htmlcontent += "<div class='atonBTN atonBTN-green' id='btnCancel' style='width:90%'>Cancel</div>";

    FE.popupShow(htmlcontent);

    $("#btnOK").click(() => {
        // Add to History
        THOTH.HIS.pushAction(
            THOTH.HIS.ACTIONS.DELETE_LAYER,
            id
        );

        // Fire events
        THOTH.fire("deleteLayer", (id));
        THOTH.firePhoton("deleteLayer", (id));
        
        FE.popupClose();
    });
    $("#btnCancel").click(() => {
        FE.popupClose();
    });
};

FE.popupEditDescription = (id) => {
    const layer = THOTH.layers.get(id);

    let htmlcontent = FE._createPopupStd(id);

    FE.popupShow(htmlcontent, "atonPopupLarge");

    $("#descCont").toggle();

    let descriptionEditor = FE.createTextEditor("desc");

    const description = layer.description;
    descriptionEditor.setWysiwygEditorValue(description);

    $("#btnOK").click(() => {
        const xxtmldescr = JSON.stringify($("#desc").val());
        console.log(xxtmldescr)
        console.log($("#desc").val())
        layer.description = xxtmldescr;
        FE.popupClose();
    });
    $("#btnCancel").click(() => {
        FE.popupClose();
    });
};

FE.createTextEditor = (idtextarea) => {
    let descriptionEditor = $("#"+idtextarea).sceditor({
        id: "descriptionEditor",
        //format: 'bbcode',
        //bbcodeTrim: true,
        width: "100%",
        height: "300px", //"100%",
        resizeEnabled: true,
        autoExpand: true,
        emoticonsEnabled: false,
        autoUpdate: true,
        style: 'vendors/sceditor/minified/themes/content/default.min.css',
        toolbar: "bold,italic,underline,link,unlink,font,size,color,removeformat|left,center,right,justify|bulletlist,orderedlist,table,code|image,youtube|source"
    }).sceditor('instance');

    return descriptionEditor;
};

FE._createPopupStd = (id) => {
    const layer = THOTH.layers.get(id);
    
    let head = layer.name;

    let description = layer.description;
    if (description === null) description = " ";

    // Header
    let htmlcontent = "<div class='atonPopupTitle'>Edit "+head+"</div>";

    // Edit name
    // htmlcontent += "Name:<input id='name' type='text' size='15'>&nbsp;";
    
    // Edit description
    htmlcontent += "<div id='descCont' style='display:none'><textarea id='desc' style='width:100%;'></textarea></div>";
    
    htmlcontent += "<br>"
    htmlcontent += "<div class='atonBTN atonBTN-green' id='btnOK' style='width:90%'>OK</div>";
    htmlcontent += "<div class='atonBTN atonBTN-green' id='btnCancel' style='width:90%'>Cancel</div>";

    return htmlcontent;
};


// Idea: Tool-specific cursors
// Idea: Minor popup when selection is invalid