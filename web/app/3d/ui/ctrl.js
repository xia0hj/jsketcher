import * as tk from '../../ui/toolkit'
import * as cad_utils from '../cad-utils'
import * as math from '../../math/math'
import * as workbench from '../workbench'
import ToolBar from './toolbar'
import * as MenuConfig from '../menu/menu-config'
import * as Operations from '../operations'
import Menu from '../menu/menu'
import {ExtrudeWizard} from '../wizards/extrude'
import {PlaneWizard} from '../wizards/plane'
import {BoxWizard} from '../wizards/box'
import {SphereWizard} from '../wizards/sphere'
import {TransformWizard} from '../wizards/transform'

function UI(app) {
  this.app = app;
  this.viewer = app.viewer;
  var mainBox = this.mainBox =  new tk.Panel();
  mainBox.root.css({height : '100%'});
  $('#right-panel').append(mainBox.root);
  var modelFolder = new tk.Folder("Model");
  var modificationsFolder = new tk.Folder("Modifications");
  tk.add(mainBox, modelFolder);
  tk.add(mainBox, modificationsFolder);
  var modificationsListComp = new tk.List();
  tk.add(modificationsFolder, modificationsListComp);

  var toolbarVertOffset = 10; //this.mainBox.root.position().top;

  this.registerMenuActions(MenuConfig);  
  
  this.craftToolBar = this.createCraftToolBar(toolbarVertOffset);
  this.createBoolToolBar(this.craftToolBar.node.position().top + this.craftToolBar.node.height() + 20);
  this.createMiscToolBar(toolbarVertOffset);
  this.fillControlBar();
  var ui = this;
  
  function setHistory() {
    ui.app.craft.finishHistoryEditing();
  }
  let finishHistory = new tk.ButtonRow(["Finish History Editing"], [setHistory]);
  finishHistory.root.hide();
  tk.add(modificationsFolder, finishHistory);
  var historyWizard = null;
  function updateHistoryPointer() {
    if (historyWizard != null) {
      historyWizard.dispose();
      historyWizard = null;
    }
    
    var craft = ui.app.craft;
    var historyEditMode = craft.historyPointer != craft.history.length;
    if (historyEditMode) {
      var rows = modificationsListComp.root.find('.tc-row');
      rows.removeClass('history-selected');
      rows.eq(craft.historyPointer).addClass('history-selected');
      var op = craft.history[craft.historyPointer];
      historyWizard = ui.createWizardForOperation(op, app);
      finishHistory.root.show();
    } else {
      finishHistory.root.hide();
    }
  }
  
  this.app.bus.subscribe("craft", function() {
    modificationsListComp.root.empty();
    for (var i = 0; i < app.craft.history.length; i++) {
      var op = app.craft.history[i];
      var row = modificationsListComp.addRow(ui.getInfoForOp(op));
      var icon = UI.getIconForOp(op);
      if (icon != null) {
        tk.List.setIconForRow(row, icon);
      }
      (function(i) {
        row.click(function () {
          ui.app.craft.historyPointer = i;
        })
      })(i);
    }
    updateHistoryPointer();
  });

  this.app.bus.subscribe("refreshSketch", function() {
    if (historyWizard != null) {
      var craft = ui.app.craft;
      var op = JSON.parse(JSON.stringify(craft.history[craft.historyPointer]));
      op.protoParams = historyWizard.getParams();
      historyWizard.dispose();
      historyWizard = ui.createWizardForOperation(op, app);
    }
  });

  this.app.bus.subscribe("historyPointer", function() {
    //updateHistoryPointer();
  });

  this.app.bus.subscribe("showSketches", (enabled) => {
    var solids = app.findAllSolids();
    for (var i = 0; i < solids.length; i++) {
      for (var j = 0; j < solids[i].polyFaces.length; j++) {
        var face = solids[i].polyFaces[j];
        if (face.sketch3DGroup != null) face.sketch3DGroup.visible = enabled;
      }
    }
    app.viewer.render();
  });

  app.bus.subscribe("solid-pick", function(solid) {
    ui.registerWizard(new TransformWizard(app.viewer, solid));
  });
}

UI.prototype.cutExtrude = function(isCut) {
  return () => {
    var selection = this.app.viewer.selectionMgr.selection;
    if (selection.length == 0) {
      return;
    }
    this.registerWizard(new ExtrudeWizard(this.app, selection[0], isCut), false);
  }
};

UI.prototype.createCraftToolBar = function (vertPos) {
  var toolBar = new ToolBar(this.app);
  toolBar.add(this.app.actionManager.actions['EditFace']);
  toolBar.add(this.app.actionManager.actions['CUT']);
  toolBar.add(this.app.actionManager.actions['PAD']);
  toolBar.add(this.app.actionManager.actions['PLANE']);
  toolBar.add(this.app.actionManager.actions['BOX']);
  toolBar.add(this.app.actionManager.actions['SPHERE']);
  $('#viewer-container').append(toolBar.node);
  toolBar.node.css({left: '10px',top : vertPos + 'px'});
  return toolBar;
};

UI.prototype.createMiscToolBar = function (vertPos) {
  var toolBar = new ToolBar(this.app);
  toolBar.addFa(this.app.actionManager.actions['Save']);
  toolBar.addFa(this.app.actionManager.actions['StlExport']);
  $('#viewer-container').append(toolBar.node);
  toolBar.node.css({top : vertPos + 'px'});
  toolBar.node.css({right: '10px', 'font-size': '16px'});
  return toolBar;
};

UI.prototype.createBoolToolBar = function(vertPos) {
  var toolBar = new ToolBar(this.app);
  toolBar.add(this.app.actionManager.actions['INTERSECTION']);
  toolBar.add(this.app.actionManager.actions['DIFFERENCE']);
  toolBar.add(this.app.actionManager.actions['UNION']);
  $('#viewer-container').append(toolBar.node);
  toolBar.node.css({left: '10px', top : vertPos + 'px'});
  return toolBar;
};

UI.prototype.registerMenuActions = function(menuConfig) { 
  for (let menuName in menuConfig) {
    const m = menuConfig[menuName];
    var action = Object.assign({'type' : 'menu'}, m);
    delete action['actions'];
    action.menu = new Menu(
      m.actions.map((a) => this.app.actionManager.actions[a])
      .filter((a) => a != undefined), this.app.inputManager);
    this.app.actionManager.registerAction('menu.' + menuName, action);
  }
};

UI.prototype.fillControlBar = function() {
  const LEFT = true;
  const RIGHT = !LEFT;
  this.app.controlBar.add('Info', RIGHT, {'label': null});
  this.app.controlBar.add('RefreshSketches', RIGHT, {'label': null});
  this.app.controlBar.add('ShowSketches', RIGHT, {'label': 'sketches'});
  this.app.controlBar.add('DeselectAll', RIGHT, {'label': null});
  this.app.controlBar.add('menu.file', LEFT);
  this.app.controlBar.add('menu.craft', LEFT);
  this.app.controlBar.add('menu.boolean', LEFT);
  this.app.controlBar.add('menu.primitives', LEFT);
};

UI.prototype.registerWizard = function(wizard, overridingHistory) {
  wizard.ui.box.root.css({left : (this.mainBox.root.width() + this.craftToolBar.node.width() + 30) + 'px', top : 0});
  var craft = this.app.craft; 
  wizard.apply = function() {
    craft.modify(wizard.createRequest(), overridingHistory);
  };
  return wizard;
};

UI.prototype.getInfoForOp = function(op) {
  var p = op.params;
  var norm2 = math.norm2;
  if ('CUT' === op.type) {
    return op.type + " (" + norm2(p.target) + ")";
  } else if ('PAD' === op.type) {
    return op.type + " (" + norm2(p.target) + ")";
  } else if ('BOX' === op.type) {
    return op.type + " (" + p.w + ", " + p.h + ", " + p.d + ")";
  } else if ('PLANE' === op.type) {
    return op.type + " (" + p.depth + ")";
  } else if ('SPHERE' === op.type) {
    return op.type + " (" + p.radius + ")";
  }
  return op.type;
};

UI.getIconForOp = function(op) {
  if ('CUT' === op.type) {
    return 'img/3d/cut32.png';
  } else if ('PAD' === op.type) {
    return 'img/3d/extrude32.png';
  } else if ('BOX' === op.type) {
    return 'img/3d/cube32.png';
  } else if ('PLANE' === op.type) {
    return 'img/3d/plane32.png';
  } else if ('SPHERE' === op.type) {
    return 'img/3d/sphere32.png';
  }
  return null;
};


UI.prototype.initOperation = function(op) {
  if ('CUT' === op) {
    this.cutExtrude(true)();
  } else if ('PAD' === op) {
    this.cutExtrude(false)();
  } else if ('BOX' === op) {
    this.registerWizard(new BoxWizard(this.app.viewer), false)
  } else if ('PLANE' === op) {
    this.registerWizard(new PlaneWizard(this.app.viewer), false)
  } else if ('SPHERE' === op) {
    this.registerWizard(new SphereWizard(this.app.viewer), false)
  } else {
    console.log('unknown operation');
  }
};

UI.prototype.createWizardForOperation = function(op) {
  var initParams = op.protoParams;
  var face = op.face !== undefined ? this.app.findFace(op.face) : null;
  if (face != null) {
    this.app.viewer.selectionMgr.select(face);
  }
  var wizard;
  if ('CUT' === op.type) {
    wizard = new ExtrudeWizard(this.app, face, true, initParams);
  } else if ('PAD' === op.type) {
    wizard = new ExtrudeWizard(this.app, face, false, initParams);
  } else if ('PLANE' === op.type) {
    wizard = new PlaneWizard(this.app.viewer, initParams);
  } else if ('BOX' === op.type) {
    wizard = new BoxWizard(this.app.viewer, initParams);
  } else if ('SPHERE' === op.type) {
    wizard = new SphereWizard(this.app.viewer, initParams);
  }
  this.registerWizard(wizard, true);
  return wizard;
};

export {UI}