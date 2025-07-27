/*
    THOTH Plugin for ATON - Front End

    author: steliosalvanos@gmail.com

===========================================================*/

let FE = {};


FE.init = () => {
    FE.layerButtons = new Map();

    FE._bPopup = false;

    FE.setupUI();
};


// Setup

FE.setupUI =() => {
    // Create new containers
    const topRightContainer = document.createElement('div');
    topRightContainer.id = 'guicanvasTR';
    topRightContainer.style.position = 'absolute';
    topRightContainer.style.top = '0px';          
    topRightContainer.style.right = '0px';   
    topRightContainer.style.zIndex = '120';
    document.body.appendChild(topRightContainer);

    const topLeftContainer = document.createElement('div');
    topLeftContainer.id = 'guicanvasTL';
    topLeftContainer.style.position = 'absolute';
    topLeftContainer.style.top = '0px';          
    topLeftContainer.style.left = '0px';   
    topLeftContainer.style.zIndex = '120';
    document.body.appendChild(topLeftContainer);

    const bottomRightContainer = document.createElement('div');
    bottomRightContainer.id = 'guicanvasBR';
    bottomRightContainer.style.position = 'absolute';
    bottomRightContainer.style.bottom = '50px';          
    bottomRightContainer.style.right = '0px';   
    bottomRightContainer.style.zIndex = '120';
    document.body.appendChild(bottomRightContainer);

    const bottomLeftContainer = document.createElement('div');
    bottomLeftContainer.id = 'guicanvasBL';
    bottomLeftContainer.style.position = 'absolute';
    bottomLeftContainer.style.bottom = '50px';          
    bottomLeftContainer.style.left = '0px';   
    bottomLeftContainer.style.zIndex = '120';
    document.body.appendChild(bottomLeftContainer);

    const popupContainer = document.createElement('div');
    popupContainer.id = 'popupcanvas';
    popupContainer.style.position = 'absolute';
    popupContainer.style.top = '150px';
    popupContainer.style.left = '250px';
    popupContainer.style.zIndex = '121';
    document.body.appendChild(popupContainer);
    FE.popupContainer = popupContainer;

    // Toolbox
    FE.toolboxPane = new Pane({
        container: bottomLeftContainer,
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

    FE.setupToolboxPane();
    FE.setupLayerPane();
    FE.setupExportPane();
};


// Toolbox

FE.setupToolboxPane = () => {
    // Brush
    const btnBrush = FE.toolboxPane.addButton({
        title: 'Brush',
    });
    btnBrush.on('click', () => {
        THOTH.Toolbox.activateBrush();
        ATON.Nav.setUserControl(false);
    });

    // Eraser
    const btnEraser = FE.toolboxPane.addButton({
        title: 'Eraser',
    });
    btnEraser.on('click', () => {
        THOTH.Toolbox.activateBrush();
        ATON.Nav.setUserControl(false);
    });

    // Lasso
    const btnLasso = FE.toolboxPane.addButton({
        title: 'Lasso',
    });
    btnLasso.on('click', () => {
        THOTH.Toolbox.activateLasso();
        ATON.Nav.setUserControl(false);
    });

    // None
    const btnNone = FE.toolboxPane.addButton({
        title: 'None',
    });
    btnNone.on('click', () => {
        THOTH.Toolbox.deactivate();
        ATON.Nav.setUserControl(true);
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
        title: "New Layer",
    });

    newLayerBtn.on('click', () => {
        THOTH.createNewLayer();
    });
};

FE.addToLayers = (id) => {
    const layer    = THOTH.layers.get(id); 
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
        THOTH.editLayerName(activeLayer.id);
    });
    visibleAttr.on('change', () => {
        THOTH.updateVisibility();
    });
    colorAttr.on('change', () => {
        THOTH.updateVisibility();
    });
    deleteBtn.on('click', () => {
        FE.popupConfirmDelete(activeLayer.id);
    });
    editDescriptionBtn.on('click', () => {
        FE.popupEditDescription(activeLayer.id);
    })
};


// Export

FE.setupExportPane = () => {
    const exportAnnotationBtn = FE.exportPane.addButton({
        title: "Export Current Annotation",
    });

    exportAnnotationBtn.on('click', () => {
        THOTH.Scene.exportAnnotations();
    });
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
    const layer = THOTH.layers.get(id);

    let head = "Delete "+ layer.name + "?";

    let htmlcontent = "<div class='atonPopupTitle'>"+head+"</div>";

    htmlcontent += "<div class='atonBTN atonBTN-green' id='btnOK' style='width:90%'>OK</div>";
    htmlcontent += "<div class='atonBTN atonBTN-green' id='btnCancel' style='width:90%'>Cancel</div>";

    FE.popupShow(htmlcontent);

    $("#btnOK").click(() => {
        THOTH.deleteLayer(id);
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