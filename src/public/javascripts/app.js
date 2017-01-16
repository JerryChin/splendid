/*
 The MIT License (MIT)

 Copyright (c) 2016 Jerry Chin

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
*/

// Import dependencies.
const Unsplash = require('unsplash-js');
const gui = require("nw.gui");
const wallpaper = require('wallpaper');
const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
const request = require('request');
const unsplash = new Unsplash.default(
    UNSPLASH_TOKEN
);

// Init must be called once during startup, before any function to nw.Screen can be called.
nw.Screen.Init();
const screens = nw.Screen.screens;

// Make sure the application window dimension is consistent with the display.
const titleBarHeight = 30;
const initialScreenWidth = Math.round(screens[0].bounds.width/1.875);
const initialScreenHeight = Math.round(screens[0].bounds.height/1.875 + titleBarHeight);

gui.Window.get().resizeTo(initialScreenWidth, initialScreenHeight);

let isFullScreenToast = true;
let croppie = null;
let page = 1;

const PER_PAGE = 30;

// Fire when the browser has loaded the page.
$(() => {
    let $photos = $("#photos");
    $photos.on("scroll", () => {

        let $preloader =  $("#preloader");

        if(Math.ceil($photos.height() + $photos.offset().top - $preloader.offset().top - $preloader.outerHeight()) >= 1) {
            let promiseOfLovelyPhotos = new Promise((resolve) => {
                fetchCuratedPhotos(page++, PER_PAGE, resolve);
            });

            promiseOfLovelyPhotos.then((json) => {
                if(json.errors) {
                    throw json.errors;
                }

                let photos = json;

                photos.forEach((photo, index) => {
                    addPhotoToPhotosArea(photo, index);
                    if (index === photos.length-1) {
                        bindClickingOnAllPhotos();
                    }
                });
            }).catch((err) => {
                console.error(err);
                let $toastContent = $('<span><i class="fa fa-frown-o fa-lg" aria-hidden="true"></i>&nbsp;' + "Oops! something bad happened." +'</span>');
                Materialize.toast($toastContent, 5000);
            });
        }
    });

    window.document.onkeydown = ((event) => {
        if(event.key === 'F11') {
            toggleFullscreen();
        }
    });

    // Calling bind() on croppie if available. when the window size is changed.
    nw.Window.get().on("resize", () => {
        if(croppie && isInFullview()) {
            croppie.bind();
        }
    });

    $photos.trigger("scroll");
});

/**
 * view: adds photos to the grid view.
 * @param photo
 * @param index
 */
function addPhotoToPhotosArea(photo, index) {
    let photosArea = document.getElementById('photos');

    let columns = photosArea.querySelectorAll(".col");

    let template = document.querySelector('#photo-template');
    template.content.querySelector('img').src = photo.urls.small;
    template.content.querySelector('img').setAttribute('full-url', photo.urls.full);
    template.content.querySelector('img').setAttribute('raw-url', photo.urls.raw);
    template.content.querySelector('img').setAttribute('data-name', photo.id);
    template.content.querySelector('a[data-name="author-profile"]').href = photo.user.links.html;
    template.content.querySelector('img[data-name="profile-image"]').src=photo.user.profile_image.small;
    template.content.querySelector('span[data-name="author-name"]').innerText = photo.user.name;

    let clone = window.document.importNode(template.content, true);
    neutralizeEternalUrl(clone, 'a[name="author-profile"]');

    columns[ index % 3].appendChild(clone);
}

/**
 * view: displays photo in full-view.
 * @param photo
 */
function displayPhotoInFullView (photo) {
    let fullPhotoUrl = photo.querySelector('img').attributes['full-url'].value;
    let rawPhotoUrl = photo.querySelector('img').attributes['raw-url'].value;
    let dataName = photo.querySelector('img').attributes['data-name'].value;

    document.querySelector('#cropper').setAttribute('data-name', dataName);
    document.querySelector('#cropper').setAttribute('raw-url', rawPhotoUrl);
    document.querySelector('#cropper').setAttribute('full-url', fullPhotoUrl);

    document.querySelector('#fullViewPhoto').style.display = 'block';

    let el = document.getElementById('cropper');
    croppie = new Croppie(el, {
        viewport: { type: 'square'},
        showZoomer: false,
        enforceBoundary: true,
    });

    croppie.bind({
        url: fullPhotoUrl,
        orientation: 1, //unchanged
        zoom: 0
    });
}

/**
 * view: returns to the grid view.
 */
function backToGridView () {
    croppie.destroy();
    document.querySelector('#fullViewPhoto').style.display = 'none';
}

/**
 * view: toggles full-screen state
 */
function toggleFullscreen() {
    if(gui.Window.get().isFullscreen) {
        document.querySelector('#top-titlebar').style.display = 'block';
        document.body.style.paddingTop = "31px";
    } else {
        notifyHowToExitFullscreen();
        document.querySelector('#top-titlebar').style.display = 'none';
        document.body.style.paddingTop = "0px";
    }

    gui.Window.get().toggleFullscreen();
}

function isInFullview() {
   return document.querySelector('#fullViewPhoto').style.display == 'block';
}

/**
 * helper:
 * @param cb
 */
function fetchCuratedPhotos (page, perPage, cb) {
    unsplash.photos.listCuratedPhotos(page, perPage, "latest")
        .then(Unsplash.toJson)
        .then(function (json) {
            cb(json);
        });
}

/**
 * helper: binds full-view event.
 */

function bindClickingOnAllPhotos () {
    let photos = document.querySelectorAll('.photo');
    for (let i = 0; i < photos.length;i++) {
        let photo = photos[i];
        bindClickingOnAPhoto(photo);
    }
}

/**
 * helper: binds full-view event.
 * @param photo
 */
function bindClickingOnAPhoto (photo) {
    photo.onclick = function () {
        displayPhotoInFullView(this);
    };
}

/**
 * helper: writes the image back to disk.
 */
function bindSavingToDisk (photoData, imageName, cb) {
    let filePath = path.join(getUserHome(),".splendid");
    mkdirp(filePath, function (err) {
        if (err) console.error(err);
        else {
            let imagePath = path.join(filePath, imageName);
            fs.writeFile(imagePath, photoData, 'base64', function (err) {
                if (err) { alert('There was an error saving the photo:',err.message); }
                photoData = null;
                cb(imagePath);
            });
        }
    });

}

/**
 * helper: uses the specified image as wallpaper
 */
function useAsWallpaper () {
    croppie.result('base64', {
            width: screens[0].bounds.width,
            height: screens[0].bounds.height
        },
        'png').then(function (base64) {
        let photoData = base64.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
        let imageName = document.querySelector("#cropper").attributes['data-name'].value;
        bindSavingToDisk(photoData, imageName + ".png", (imagePath) => {
            console.log("image path: " + imagePath);
            wallpaper.set(imagePath).then(() => {
                minimizeWindow();
            });
        })
    });
}

/**
 * helper: gets the home path of current user.
 */
function getUserHome () {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

/**
 * helper: instructs the user how to exit full-view.
 */
function notifyHowToExitFullscreen () {
  if(isFullScreenToast) {
        let $toastContent = $('<span>Press <span class="key-text">F11</span> to exit full screen.</span>');
        Materialize.toast($toastContent, 4000);
        isFullScreenToast = false;
  }
}

/**
 * helper: hacks links, so that we can open them in a new window.
 */
function neutralizeEternalUrl (element, selector) {

    let matcher = element.querySelectorAll(selector);

    matcher.forEach((element) => {
        let href = element.getAttribute("href");
        element.href = "#";
        element.setAttribute("target", href);
        element.addEventListener("click", (e) => {
            gui.Window.open(e.currentTarget.getAttribute('target'), {
                position: 'center',
                width: initialScreenWidth,
                height: initialScreenHeight
            });
            e.preventDefault();
            e.stopPropagation();
        });
    });
}