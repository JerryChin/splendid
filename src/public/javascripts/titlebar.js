// Extend application menu for Mac OS
if (process.platform == "darwin") {
  let menu = new gui.Menu({type: "menubar"});
  menu.createMacBuiltin && menu.createMacBuiltin(window.document.title);
  gui.Window.get().menu = menu;
}

/**
 * helper functions
 */
function closeWindow() {
  window.close();
}

function minimizeWindow() {
	gui.Window.get().minimize();
}

function maximizeWindow() {

    addUnmaximizeButton();

    gui.Window.get().maximize();
}

function unmaximizeWindow() {

    addMaximizeButton();

    gui.Window.get().unmaximize();
}

function updateImageUrl(image_id, new_image_url) {
  let image = document.getElementById(image_id);
  if (image)
    image.src = new_image_url;
}

function createImage(image_id, image_url) {
  let image = document.createElement("img");
  image.setAttribute("id", image_id);
  image.src = image_url;
  return image;
}

function createButton(button_id, button_name, normal_image_url,
                       hover_image_url, click_func) {
  let button = document.createElement("div");
  button.setAttribute("class", button_name);
  let button_img = createImage(button_id, normal_image_url);
  button.appendChild(button_img);
  button.onmouseover = function() {
    updateImageUrl(button_id, hover_image_url);
  };
  button.onmouseout = function() {
    updateImageUrl(button_id, normal_image_url);
  };
  button.onclick = click_func;
  return button;
}

function focusTitlebars(focus) {
  let bg_color = focus ? "#3a3d3d" : "#3a3d3d";

  let titlebar = document.getElementById("top-titlebar");
  if (titlebar)
    titlebar.style.backgroundColor = bg_color;
}

function addTitlebar(titlebar_name, titlebar_icon_url, titlebar_text) {
  let titlebar = document.createElement("div");
  titlebar.setAttribute("id", titlebar_name);
  titlebar.setAttribute("class", titlebar_name);

  // disable icon feature
  // let icon = document.createElement("div");
  // icon.setAttribute("class", titlebar_name + "-icon");
  // icon.appendChild(createImage(titlebar_name + "icon", titlebar_icon_url));
  // titlebar.appendChild(icon);

  let title = document.createElement("div");
  title.setAttribute("class", titlebar_name + "-text");
  title.innerText = titlebar_text;
  titlebar.appendChild(title);

  let closeButton = createButton(titlebar_name + "-close-button",
                                 titlebar_name + "-close-button",
                                 "../public/images/button_close.png",
                                 "../public/images/button_close_hover.png",
                                 closeWindow);
  titlebar.appendChild(closeButton);

  let minButton = createButton(titlebar_name + "-min-button",
      titlebar_name + "-min-button",
      "../public/images/button_min.png",
      "../public/images/button_min_hover.png",
      minimizeWindow);
  titlebar.appendChild(minButton);

  let maxButton = createButton(titlebar_name + "-max-button",
      titlebar_name + "-max-button",
      "../public/images/button_max.png",
      "../public/images/button_max_hover.png",
      maximizeWindow);
  titlebar.appendChild(maxButton);

  let restoreButton = createButton( titlebar_name + "-restore-button",
      titlebar_name + "-restore-button",
      "../public/images/button_restore.png",
      "../public/images/button_restore_hover.png",
      unmaximizeWindow);
  titlebar.appendChild(restoreButton);

    let divider = document.createElement("div");
  divider.setAttribute("class", titlebar_name + "-divider");
  titlebar.appendChild(divider);
  
  document.body.appendChild(titlebar);


    // Get the current window
    let win = nw.Window.get();

    // Listen to the maximize event
    win.on('maximize', function() {
      addUnmaximizeButton();
    });

    // Listen to the restore event
    win.on('restore', function() {
      addMaximizeButton();
    });
}

function removeTitlebar(titlebar_name) {
  let titlebar = document.getElementById(titlebar_name);
  if (titlebar)
    document.body.removeChild(titlebar);
}

function updateContentStyle() {
  let content = document.getElementById("content");
  if (!content)
    return;

  let left = 0;
  let top = 0;
  let width = window.outerWidth;
  let height = window.outerHeight;

  let titlebar = document.getElementById("top-titlebar");
  if (titlebar) {
    height -= titlebar.offsetHeight;
    top += titlebar.offsetHeight;
  }

  let contentStyle = "position: absolute; ";
  contentStyle += "left: " + left + "px; ";
  contentStyle += "top: " + top + "px; ";
  contentStyle += "width: " + width + "px; ";
  contentStyle += "height: " + height + "px; ";
  content.setAttribute("style", contentStyle);
}


function addMaximizeButton() {
    let titlebar_name = 'top-titlebar';
    let titlebar = document.getElementById(titlebar_name);
    let restoreButton = titlebar.querySelector('.' + titlebar_name + '-restore-button');
    restoreButton.style.zIndex = "-1";

    let maxButton = titlebar.querySelector('.' + titlebar_name + '-max-button');
    maxButton.style.zIndex = "1";
}

function addUnmaximizeButton() {
    let titlebar_name = 'top-titlebar';
    let titlebar = document.getElementById(titlebar_name);
    let maxButton = titlebar.querySelector('.' + titlebar_name + '-max-button');
    maxButton.style.zIndex = "-1";

    let restoreButton = titlebar.querySelector('.' + titlebar_name + '-restore-button');
    restoreButton.style.zIndex = "1";

}