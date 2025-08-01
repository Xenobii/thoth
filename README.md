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

## Layers
An object's annotations are dymanically stored in a scene's JSON file as layer objects. 

Using the THOTH UI you can create and delete layers. After selecting a layer, you can also edit the following attributes regarding its strucure as an annotation:
- Name
- Description

There are also additional settings regarding the visual appearance of each layer to help with comprehension.
- Visibility
- Highlight Color 

## Tools
You can select specific areas on an mesh using the tools provided by THOTH. These include:
- Brush
- Lasso

Both tools can be used additively or subtractively to add or remove object faces from a layer's selection. To add faces, use the tool with the left mouse button, to subtract faces use it with the right mouse button.

## Collaborative
TBI

## History
TBI

## Saving annotations
Once you have finished with the annotations, you can export them as a structured json file by pressing the according button **Export Annotations**, located at the bottom right.

## Shortcuts
TBI

# TODO List
- [x] Make this work for now
- [x] Debug collaborative
- [ ] Implement history management
- [ ] Lasso hyper-optimization with lasso selection frustum