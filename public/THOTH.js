/*
THOTH Plugin for ATON

author: steliosalvanos@gmail.com

===========================================================*/


let THOTH = new ATON.Flare("thoth");


THOTH.UI = UI;
THOTH.FE = FE;


THOTH._renderer = ATON._renderer;
THOTH._scene    = ATON._mainRoot;


THOTH.setup = () => {
    THOTH.annotations = 
    THOTH.UI.setup();
    THOTH.FE.setup();
};

THOTH.update = () => {

};