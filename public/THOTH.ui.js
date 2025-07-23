/*
THOTH Plugin for ATON - User Interface

author: steliosalvanos@gmail.com

===========================================================*/


let UI = {};


UI.uiAddButton = ATON.FE.uiAddButton;
UI.setBGColor  = ATON.setBackgroundColor;
UI.popupShow   = ATON.FE.popupShow;
UI.popupHide   = ATON.FE.popupHide;


// Setup

UI.setup = () => {
    UI.layers = new Map();
    
    UI.setupStyling();
    UI.setupContainers();
    UI.addFeatures();
};


UI.setupContainers = () => {
    UI.createToolboxContainer();
    UI.createLayerContainer();
    UI.createLayerBtnContainer();
    UI.createOptionsContainer();
};

UI.addFeatures = () => {
    UI.addTools();
    UI.addLayerButtons();
};


// Style

UI.setupStyling = () => {
    // Toolbox
    const toolboxStyle = 
    `
        .toolboxContainer {
            z-index: 130;

            position: fixed;
            display: flex;
            flex-direction: column;

            top: 120px;
            left: 0;

            white-space: nowrap;
            overflow: hidden;

            margin: 0;
            padding: 5px;

            color: #FFF;
            text-align: center;

            // box-shadow: 0px 0px 20px rgba(0,0,0,1);

            -moz-user-select: none;
            -khtml-user-select: none;
            -webkit-user-select: none;
            -o-user-select: none;
            user-select: none;
        }
    `;

    // Side panel
    const sidePanelStyle = 
    `
        .sidePanelContainer {
            z-index: 130;
            position: absolute;

            display: inline-block;

            box-sizing: border-box;

            width: 20%;
            max-width: 300px;

            margin: 0px;
            padding: 10px;
            padding-bottom: 20px;

            background-color: rgba(0, 0, 0, 0.5);
            box-shadow: -5px 0px 10px rgba(0, 0, 0, 0.4);

            right: 0%;

            animation: 0.5s ease-out 0s 1 slideFromRight;

            backdrop-filter: blur(6px);
        }
    `;

    // Layer container
    const layerContainerStyle = 
    `
        .layerContainer {
            top: 0%;
            height: 29%;
        }
    `;

    // LayerBtn
    const layerBtnContainerStyle = 
    `
        .layerBtnContainer {
            top: 30%;
        }
    `;

    // Options
    const optionsStyle = 
    `
        .optionsContainer {
            top: 60%;
            height: 40%;
        }
    `;

    // Layer
    const layerStyle = 
    `
        .layer {
            display: flex;
            align-items: center;
            justify-content: space-between;

            background-color: #2c2c2c;
            color: #e0e0e0;

            height: 28px;
            padding: 4px 10px;

            margin-bottom: 2px;
            border-radius: 4px;

            box-shadow: inset 0 0 0 1px #3c3c3c;
            transition: background-color 0.2s;

            user-select: none;
            cursor: pointer;
        }

        .layer:hover {
            background-color: #3a3a3a;
        }

        .layer:active {
            background-color: #4c8ef7;
            color: #ffffff;
        }

        .layerLabel {
            flex-grow: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    `

    // Input
    const inputStyle = `
        .layerInput {
            all: unset;
            
            width: 50%;
            height: 100%;
            
            font-size: 12px;

            background-color: transparent;
            color: inherit;

            padding: 0;
            border: none;
            outline: none;

            overflow: hidden;
            text-overflow: ellipsis;
            
            box-sizing: border-box;
            display: block;
            white-space: nowrap;
        }
    `

    const style = document.createElement("style");
    style.textContent = toolboxStyle + "\n" +
                        sidePanelStyle + "\n" +
                        layerContainerStyle + "\n" +
                        layerBtnContainerStyle + "\n" +
                        optionsStyle + "\n" +
                        layerStyle + "\n" +
                        inputStyle + "\n";
    document.head.appendChild(style);
};


// Container UI

UI.createToolboxContainer = () => {
    UI.toolboxContainer = document.createElement("div");
    UI.toolboxContainer.id = "idToolboxContainer";
    UI.toolboxContainer.classList.add("toolboxContainer", "scrollableY");
    document.body.appendChild(UI.toolboxContainer);
};

UI.createLayerContainer = () => {
    UI.layerContainer = document.createElement("div");
    UI.layerContainer.id = "idLayerContainer";
    UI.layerContainer.classList.add("sidePanelContainer", "layerContainer", "scrollableY");
    document.body.appendChild(UI.layerContainer);
};

UI.createLayerBtnContainer = () => {
    UI.layerBtnContainer = document.createElement("div");
    UI.layerBtnContainer.id = "idLayerBtnContainer";
    UI.layerBtnContainer.classList.add("layerBtnContainer", "sidePanelContainer");
    document.body.appendChild(UI.layerBtnContainer);
};

UI.createOptionsContainer = () => {
    UI.optionsContainer = document.createElement("div");
    UI.optionsContainer.id = "idLayerContainer";
    UI.optionsContainer.classList.add("sidePanelContainer", "optionsContainer", "scrollableY");
    document.body.appendChild(UI.optionsContainer);
};


// Button UI

UI.addLayerButtons = () => {
    UI.uiAddButton("idLayerBtnContainer", "nav", () => {
        THOTH.createNewLayer();
    }, "Add layer");
    UI.uiAddButton("idLayerBtnContainer", "nav", () => {
        THOTH.deleteLayer();
    }, "Remove Layer");
};

UI.addTools = () => {
    UI.uiAddButton("idToolboxContainer", "nav", () => {
        THOTH.toolbox.activateBrush();
    }, "Totally a brush");
    UI.uiAddButton("idToolboxContainer", "nav", () => {
        THOTH.toolbox.activateLasso();
    }, "Totally a lasso");
    // Add additional buttons for testing 
    UI.uiAddButton("idToolboxContainer", "nav", () => {
        THOTH.Scene.broadcastLayerChange();
    })
    // Temp: add photon button here
    ATON.FE.uiAddButtonPhoton("idToolboxContainer")
};