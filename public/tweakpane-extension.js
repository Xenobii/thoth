// tweakpane-extension.js

//Double-Click at Desirable Buttons by Adding enableButtonRename(buttonName, targetObject, 'name');
(function () {
    window.enableButtonRename = function (buttonInstance, targetObject, propertyKey) {
        //console.log("enableButtonRename called for:", targetObject[propertyKey]);
        const buttonElement = buttonInstance.controller.buttonController.view.buttonElement; // at ButtonView a div element is created and inside it a button named tp-btn_b ->buttonElement
        //console.log("buttonElement:", buttonElement);
        if (!buttonElement) return;

        // Add renamable class for clarity
        buttonElement.classList.add('renamable');

        // Find the title element inside the button (class 'tp-btlnv_t') -> responsible for button title updates
        const titleElem = buttonElement.querySelector('.tp-btnv_t');
        //console.log("buttonElement:", buttonElement);
        //console.log("titleElem:", titleElem);
        if (!titleElem) return;

        // Add double-click rename behavior
        titleElem.addEventListener('dblclick', () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = targetObject[propertyKey];
            input.style.width = `${titleElem.offsetWidth}px`;
            input.style.fontSize = 'inherit';
            input.style.border = 'none';
            input.style.outline = 'none';
            input.style.background = 'white';

            const applyRename = () => {
                const newTitle = input.value.trim();
                if (newTitle !== '') {
                    titleElem.textContent = newTitle;
                    targetObject[propertyKey] = newTitle;// current title value

                    if (typeof THOTH?.editAnnotationName === 'function') {// to update the rest of the system with the new external rename
                        THOTH.editAnnotationName(targetObject);
                    }
                }
                input.replaceWith(titleElem);// after editing we remove input and replace again titleElem
            };

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') applyRename();
            });

            input.addEventListener('blur', () => {// click away
                applyRename();
            });

            titleElem.replaceWith(input);// the entire titleElem is removed from DOM and replaced by <input>
            input.focus();
            input.select();
        });
    };
})();

//ScrollHeight enablePaneScroll(FE.layerSelectionPane, 200); //(pane,height)
(function () {
    window.enablePaneScroll = function (paneInstance, scrollHeight) {
        if (!paneInstance || typeof scrollHeight !== 'number') return;

        // Try to find the internal scrollable rack container inside the pane (folderview folder element)
        const rootEl = paneInstance.element;
        //console.log("rootel", rootEl);
        const scrollableArea = rootEl.querySelector('.tp-rotv_c'); // ('.tp-rotv_c') for subcomponents (sliders, buttons, subfolders)
        if (scrollableArea) {
            scrollableArea.style.overflowY = 'auto';
            scrollableArea.style.maxHeight = `${scrollHeight}px`;
        } else {
            console.warn('Could not find scrollable area inside pane:', paneInstance);
        }
    };
})();

//
(function () {
  // Keep at most one chooser per pane
  const chooserByPane = new WeakMap();

  function removeChooserForPane(pane) {
    const rec = chooserByPane.get(pane);
    if (!rec) return;
    try { pane.remove(rec.blade); } catch (_) {} //remove panes UI
    window.removeEventListener('keydown', rec.escListener);// remove panes event listener
    chooserByPane.delete(pane); // remones panes memory reference
  }

  // Public: window.showHistoryChooser(pane, { label?, his? })
  window.showHistoryChooser = function (pane, opts) {
    opts = opts || {};
    const label = opts.label || 'Jump to';

    const H =
      opts.his ||
      (typeof HIS !== 'undefined' ? HIS : (typeof window !== 'undefined' ? window.HIS : undefined));

    if (!H) {
      console.warn('[history-chooser] Missing HIS. Pass it as opts.his.');
      return;
    }
    if (!pane || (typeof pane.addBlade !== 'function' && typeof pane.addInput !== 'function')) {
      console.warn('[history-chooser] Invalid pane. Provide a Tweakpane Pane/Folder.');
      return;
    }

    // Ensure single instance: nuke any previous chooser for this pane
    removeChooserForPane(pane);

    const u = Array.isArray(H.undoStack) ? H.undoStack : []; // ensures undo is array or empty
    const r = Array.isArray(H.redoStack) ? H.redoStack : [];
    const pointer = u.length; // current position is the end of undo stack

    // ---------- Helpers for pretty names and inversion ----------

    // Find enum key name for a numeric action type
    const keyOfActionType = (t) => {
      if (!H || !H.ACTIONS || typeof t === 'undefined') return undefined;
      for (const k in H.ACTIONS) {
        if (Object.prototype.hasOwnProperty.call(H.ACTIONS, k) && H.ACTIONS[k] === t) return k; //checks if k is directly from H.ACTIONS and not inherited
      }
      return undefined;
    };

    // Turn enum key into a friendly label; special-case Layer ops
    const prettyFromKey = (k) => {
      if (!k) return undefined;
      const K = String(k).toUpperCase();

      // canonical names you asked for
      if (K.includes('CREATE') && K.includes('LAYER')) return 'New Layer';
      if (K.includes('DELETE') && K.includes('LAYER')) return 'Delete';
      if (K.includes('RENAME') && K.includes('LAYER')) return 'Rename';

    };

    // Resolve a friendly name for a *forward/original* action type 
    const actionPrettyName = (type, a) => {
      // Prefer explicit string name if provided on the action object
      if (a && typeof a.action === 'string' && a.action.trim()) return a.action;

      // Else map enum key to nice string (New Layer,...)
      const key = keyOfActionType(type);
      const pretty = prettyFromKey(key);
      if (pretty) return pretty;

      // Last resort: show raw 'type' or "Action"
      return (typeof type === 'string' ? type : 'Action');
    };

    // Invert a type (redoStack stores inverse of the original)
    const invertType = (t) => {
      if (!H || !H.ACTIONS) return t;
      const A = H.ACTIONS;

      // If we have expected pairs, use them explicitly
      if (typeof A.CREATE_LAYER !== 'undefined' && typeof A.DELETE_LAYER !== 'undefined') {
        if (t === A.CREATE_LAYER) return A.DELETE_LAYER;
        if (t === A.DELETE_LAYER) return A.CREATE_LAYER;
      }
      if (typeof A.SELEC_ADD !== 'undefined' && typeof A.SELEC_DEL !== 'undefined') {
        if (t === A.SELEC_ADD) return A.SELEC_DEL;
        if (t === A.SELEC_DEL) return A.SELEC_ADD;
      }
      // Self-inverse or unknown -> leave as-is (e.g., RENAME or others)
      return t;
    };

    // Format a row label as "<idx>. <Name> [id]"
    const formatRow = (displayType, idx, a) => {
      const name = actionPrettyName(displayType, a);
      const id   = (a && a.id !== undefined) ? ` [${a.id}]` : '';
      return `${idx}. ${name}${id}`;
    };

    // ---------- Build options list ----------
    const options = [{ text: '0. Step Zero', value: 0 }];

    // Undo side (past): already forward/original; list from oldest->newest (1..u.length)
    for (let i = 0; i < u.length; i++) {
      const a = u[i];
      options.push({
        text: formatRow(a?.type, i + 1, a),
        value: i + 1, //target length
      });
    }

    // Redo side (future): redoStack holds INVERSE types in LIFO order.
    // We must:
    //   1) iterate from END -> START to get chronological order (earliest future first),
    //   2) invert the stored type to display the ORIGINAL action name.
    for (let i = r.length - 1; i >= 0; i--) {
      const a = r[i];
      const idx = u.length + (r.length - i); // continues numbering after undo side
      const forwardType = invertType(a?.type);
      options.push({
        text: formatRow(forwardType, idx, a),
        value: idx,
      });
    }

    // ---------- Jump mechanics ----------
    let blade; // will store the new chooser
    const jumpTo = (targetIdx) => {
      const total = u.length + r.length;
      targetIdx = Math.max(0, Math.min(total, Number(targetIdx)));
      while (Array.isArray(H.undoStack) && H.undoStack.length > targetIdx) H.undo();// if targetidx is smaller we undo until we get the target
      while (Array.isArray(H.undoStack) && H.undoStack.length < targetIdx) H.redo();
    };

    // ESC to close
    const escListener = (e) => {
      if (e.key === 'Escape') removeChooserForPane(pane);
    };
    window.addEventListener('keydown', escListener);

    const finalize = (b) => {
      blade = b;
      chooserByPane.set(pane, { blade, escListener });
    };

    // Prefer list blade; fallback to input with options map
    if (typeof pane.addBlade === 'function') {
      const defaultValue = Math.min(pointer, options[options.length - 1]?.value ?? 0);
      const b = pane.addBlade({ view: 'list', label, options, value: defaultValue });
      b.on('change', (ev) => { jumpTo(ev.value); removeChooserForPane(pane); });
      finalize(b);
    } else {
      const model = { step: pointer };
      const optMap = {};
      options.forEach((o) => { optMap[o.text] = o.value; });
      const b = pane.addInput(model, 'step', { label, options: optMap });
      b.on('change', (ev) => { jumpTo(ev.value); removeChooserForPane(pane); });
      finalize(b);
    }
  };

  // Convenience: attach to your Hist button
  window.attachHistoryChooser = function (pane, HistButton, opts) {
    if (!HistButton || typeof HistButton.on !== 'function') return;
    HistButton.on('click', function () {
      window.showHistoryChooser(pane, opts || {});
    });
  };
})();

// PopUp Window (supports multiple text and image fields)
(function () {
  window.PopUpEditDescription = function (id, fields) {
    const layer = THOTH.Scene.currData.layers[id];

    // Build rows with unique IDs per field index
    let inputsHTML = fields.map((f, i) => {
      const current = layer?.[f.key];
      // If multiple fields share the same key and value is array, pick i-th or empty
      const currVal = Array.isArray(current) ? (current[i] ?? "") : (current ?? "");
      const isMultiline = f.type === "textarea";
      const isImage = f.type === "image";
      const fid = `field_${f.key}_${i}`;
      const lid = `link_${f.key}_${i}`; // for not having an id two times
      const pid = `preview_${f.key}_${i}`; // -//-

      if (isMultiline) {
        return `
          <div class="atonFieldRow">
            <label class="atonFieldLabel" for="${fid}">${f.label}</label>
            <textarea id="${fid}" class="atonFieldInput" placeholder="${f.placeholder || ''}">${currVal || ""}</textarea>
          </div>`;
      } else if (isImage) {
        return `
          <div class="atonFieldRow">
            <label class="atonFieldLabel" for="${fid}">${f.label}</label>
            <div class="atonFieldInput">
              <input id="${fid}" type="text" placeholder="${f.placeholder || ''}"
                     value="${currVal || ""}" style="width:100%; margin-bottom:6px;" />
              <a id="${lid}" href="${currVal || "#"}" target="_blank" rel="noopener noreferrer" // href -> hypelink reference : href has the url target blank opens new tab rel secures our webpage style makes blue and underlined the open image
                 style="color:#4fa3ff; text-decoration:underline; display:${currVal ? 'inline' : 'none'};">
                 Open image
              </a>
              <div id="${pid}" style="margin-top:6px; ${currVal ? '' : 'display:none;'}">
                ${currVal ? `<img src="${currVal}" alt="Preview" style="max-width:100%; border-radius:4px;" />` : ""} //src has the url, alt preview describes the image with text, style fits the image at margin
              </div>
            </div>
          </div>`;
      } else {
        return `
          <div class="atonFieldRow">
            <label class="atonFieldLabel" for="${fid}">${f.label}</label>
            <input id="${fid}" class="atonFieldInput" type="text"
                   placeholder="${f.placeholder || ''}" value="${currVal || ""}" />
          </div>`;
      }
    }).join("");

    const htmlcontent = `
      <div class="atonPopupTitle"> Edit Layer Info </div>
      <div class="atonPopupBody">${inputsHTML}</div>
      <div class="atonPopupFooter">
        <div class="atonBTN atonBTN-green" id="btnOK">OK</div>
        <div class="atonBTN" id="btnCancel">Cancel</div>
      </div>
    `;

    FE.popupShow(htmlcontent, "atonPopupLarge");

    // Live update for each image field (unique per index)
    fields.forEach((f, i) => {
      if (f.type === "image") {
        const fid = `#field_${f.key}_${i}`;
        const lid = `#link_${f.key}_${i}`;
        const pid = `#preview_${f.key}_${i}`;
        $(fid).on("input", function () {
          const url = $(this).val();
          const $link = $(lid);
          const $preview = $(pid);
          if (url) {
            $link.attr("href", url).show();
            $preview.html(`<img src="${url}" alt="Preview" style="max-width:100%; border-radius:4px;" />`).show();
          } else {
            $link.hide();
            $preview.hide();
          }
        });
      }
    });

    // OK: save values; aggregate repeated keys into arrays
    $("#btnOK").click(() => {
      const collected = {}; // key -> string | array
      fields.forEach((f, i) => {
        const val = String($(`#field_${f.key}_${i}`).val() ?? "");
        if (collected[f.key] === undefined) {
          collected[f.key] = val;
        } else if (Array.isArray(collected[f.key])) {
          collected[f.key].push(val);
        } else {
          collected[f.key] = [collected[f.key], val];
        }
      });

      // Write back to layer and broadcast per key
      Object.keys(collected).forEach(key => {
        const value = collected[key];
        layer[key] = value;
        if (typeof THOTH.fire === "function") {
          THOTH.fire("editLayer", { id, attr: key, value });
        }
        if (typeof THOTH.firePhoton === "function") {
          THOTH.firePhoton("editLayer", { id, attr: key, value });
        }
      });

      FE.popupClose();
    });

    $("#btnCancel").click(() => FE.popupClose());
  };
})();
