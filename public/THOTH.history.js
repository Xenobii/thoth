/*
THOTH Plugin for ATON

author: steliosalvanos@gmail.com

===========================================================*/

let HIS = {};


// Init

HIS.init = () => {
    HIS.historyIdx = 0;

    HIS.undoStack = [];
    HIS.redoStack = [];

    // Action list
    HIS.ACTIONS = {};
    HIS.ACTIONS.CREATE_LAYER = 0;
    HIS.ACTIONS.DELETE_LAYER = 1;
    HIS.ACTIONS.RENAME_LAYER = 2;
    HIS.ACTIONS.CHANGE_DESCR = 3;
    HIS.ACTIONS.SELEC_ADD    = 4;
    HIS.ACTIONS.SELEC_DEL    = 5;
};


// Push actions

HIS.pushAction = (type, id, value) => {
    if (type === undefined || id === undefined) return;
     
    const action   = {};
    action.type    = type;
    action.id      = id;
    action.content = value;
    
    HIS.undoStack.push(action);
    HIS.redoStack = [];
};


// Jumps

HIS.undo = () => {
    if (HIS.undoStack.length === 0) return;

    const action  = HIS.undoStack.pop();
    const type    = action.type;
    const id      = action.id;
    const content = action.content;

    let inverseType = undefined;
    let prevContent = undefined;

    // Re-enact the inverse action
    switch(type) {
        case HIS.ACTIONS.CREATE_LAYER:
            inverseType = HIS.ACTIONS.DELETE_LAYER;
            THOTH.fire("deleteLayer", id);
            THOTH.firePhoton("deleteLayer", id);
            break;

        case HIS.ACTIONS.DELETE_LAYER:
            inverseType = HIS.ACTIONS.CREATE_LAYER;
            THOTH.fire("createLayer", id);
            THOTH.firePhoton("createLayer", id);
            break;

        case HIS.ACTIONS.RENAME_LAYER:
            inverseType = HIS.ACTIONS.RENAME_LAYER;
            prevContent = content;
            THOTH.fire("editLayer", {
                id: id,
                attr: "name",
                value: content.oldTitle
            }); 
            THOTH.firePhoton("editLayer", {
                id: id,
                attr: "name",
                value: content["oldTitle"]
            }); 
            break;

        case HIS.ACTIONS.SELEC_ADD:
            inverseType = HIS.ACTIONS.SELEC_DEL;
            prevContent = content; 
            THOTH.fire("delFromSelection", {
                id: id,
                faces: content
            });
            THOTH.firePhoton("delFromSelection", {
                id: id,
                faces: content
            });

            THOTH.updateVisibility();
            break;

        case HIS.ACTIONS.SELEC_DEL:
            inverseType = HIS.ACTIONS.SELEC_ADD;
            prevContent = content; 
            THOTH.fire("addToSelection", {
                id: id,
                faces: content
            });
            THOTH.firePhoton("addToSelection", {
                id: id,
                faces: content
            });

            THOTH.updateVisibility();
            break;

        default:
            console.warn("Invalid action: " + type);
            return;
    }

    // Store inverse action in redo stack
    const inverseAction   = {};
    inverseAction.type    = inverseType;
    inverseAction.id      = id;
    inverseAction.content = prevContent;

    HIS.redoStack.push(inverseAction);

    HIS.historyIdx -= 1;
};

HIS.redo = () => {
    if (HIS.redoStack.length === 0) return;

    const action  = HIS.redoStack.pop();
    const type    = action.type;
    const id      = action.id;
    const content = action.content;

    let inverseType = undefined;
    let prevContent = undefined;

    // Re-enact the inverse action
    switch(type) {
        case HIS.ACTIONS.CREATE_LAYER:
            inverseType = HIS.ACTIONS.DELETE_LAYER;
            THOTH.fire("deleteLayer", id);
            THOTH.firePhoton("deleteLayer", id);
            break;

        case HIS.ACTIONS.DELETE_LAYER:
            inverseType = HIS.ACTIONS.CREATE_LAYER;
            THOTH.fire("createLayer", id);
            THOTH.firePhoton("createLayer", id);
            break;

        case HIS.ACTIONS.RENAME_LAYER:
            inverseType = HIS.ACTIONS.RENAME_LAYER;
            prevContent = content;
            THOTH.fire("editLayer", {
                id: id,
                attr: "name",
                value: content.newTitle
            }); 
            THOTH.firePhoton("editLayer", {
                id: id,
                attr: "name",
                value: content.newTitle
            }); 
            break;

        case HIS.ACTIONS.SELEC_ADD:
            inverseType = HIS.ACTIONS.SELEC_DEL;
            prevContent = content;
            THOTH.fire("delFromSelection", {
                id: id,
                faces: content
            });
            THOTH.firePhoton("delFromSelection", {
                id: id,
                faces: content
            });

            THOTH.updateVisibility();
            break;

        case HIS.ACTIONS.SELEC_DEL:
            inverseType = HIS.ACTIONS.SELEC_ADD;
            prevContent = content;
            THOTH.fire("addToSelection", {
                id: id,
                faces: content
            });
            THOTH.firePhoton("addToSelection", {
                id: id,
                faces: content
            });

            THOTH.updateVisibility();
            break;

        default:
            console.warn("Invalid action: " + type);
            return;
    }

    // Store inverse action in undo stack
    const inverseAction   = {};
    inverseAction.type    = inverseType;
    inverseAction.id      = id;
    inverseAction.content = prevContent;

    HIS.undoStack.push(inverseAction);

    HIS.historyIdx += 1;
};

HIS.historyJump = (idx) => {
    if (idx === HIS.historyIdx) return;

    // Earlier step
    if (idx < HIS.historyIdx && idx > 0) {
        while (HIS.historyIdx > idx) {
            HIS.undo();
        }
    }
    // Later step
    if (idx > HIS.historyIdx && idx < HIS.historyIdx + HIS.redoStack) {
        while (HIS.historyIdx < idx) {
            HIS.redo();
        }
    }
    return;
};