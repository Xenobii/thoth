# THOTH 

A face selection plugin for the [ATON](https://osiris.itabc.cnr.it/aton/) framework.

Designed as part of the [TEXTaiLES](https://textailes-eccch.eu/) program.

## Installation
1) Install the [ATON](https://github.com/phoenixbf/aton) framework.

2) Create a "flares" folder within /config as per these [instructions](https://osiris.itabc.cnr.it/aton/index.php/overview/flares/).

3) Clone the [THOTH](https://github.com/Xenobii/thoth) repository within the flares folder.

4) Run/deploy ATON according to their [instructions](https://osiris.itabc.cnr.it/aton/index.php/tutorials/getting-started/).

## Usage
THOTH allows for geometry-level annotations in collaborative environments.

### Layers
An object's annotations are dymanically stored in a scene's JSON file as layer objects. 

Using the THOTH UI you can create and delete layers. After selecting a layer, you can also edit the following attributes regarding its strucure as an annotation:
- Name
- Description

There are also additional settings regarding the visual appearance of each layer to help with comprehension.
- Visibility
- Highlight Color 

### Tools
You can select specific areas on an mesh using the tools provided by THOTH. These include:
- Brush
- Lasso

Both tools can be used additively or subtractively to add or remove object faces from a layer's selection. To add faces, use the tool with the left mouse button, to subtract faces use it with the right mouse button.

### Collaborative
Built on ATON functionalities, THOTH also supports collaborative scene editing. Changes will be viewed by users in real time.

To join a collaborative scene, insert the link of the scene you want to edit with the **vrc=1** url parameter. This would look like this:

*http://link-to-scene?vrc=1*

Using this link, any authorized user can enter and edit the scene.

### History
THOTH supports per user history management. This includes undo, redo and jumping to a specific step in history. 

### Saving annotations
Once you have finished with the annotations, you can export them as a structured json file by pressing the according button **Export Annotations**, located at the bottom right.

*NOTE: Changes will only be exported in edit mode.*

### Shortcuts
TBI

## TODO
*Back-end*
- [x] Resolve ATON shortcuts and eventListeners
- [ ] Resolve history for rename/edit description
- [ ] Add per-user comments on annotations
- [x] Enable object-wise annotations
- [ ] General debugging

*Front-end*
- [ ] UI Overhaul
- [ ] Allow for CIDOC-CRM compatible annotations via field-based input

*Once we deploy it to TEXTaiLES*
- [ ] Resolve user versions and allow version merging
- [ ] Enable source image viewer