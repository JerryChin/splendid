window.onfocus = function() {
  focusTitlebars(true);
};

window.onblur = function() {
  focusTitlebars(false);
};

window.onresize = function() {
  updateContentStyle();
};

window.onload = function() {
  addTitlebar("top-titlebar", "top-titlebar.png", window.document.title);
  focusTitlebars(true);
  updateContentStyle();
  gui.Window.get().show();
};
