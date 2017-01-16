
// Dependencies
const Unsplash = require('unsplash-js');
const gui = require("nw.gui");
const wallpaper = require('wallpaper');
const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
const request = require('request');
const unsplash = new Unsplash.default({
    UNSPLASH_TOKEN
});

//init must be called once during startup, before any function to nw.Screen can be called
nw.Screen.Init();
const screens = nw.Screen.screens;

// 确保应用窗口尺寸和物理分辨率一致（注意标题栏高度 30px）
const titleBarHeight = 30;
const initialScreenWidth = Math.round(screens[0].bounds.width/1.875);
const initialScreenHeight = Math.round(screens[0].bounds.height/1.875 + titleBarHeight);

gui.Window.get().resizeTo(initialScreenWidth, initialScreenHeight);

let isFullScreenToast = true;
let croppie = null;
let page = 1;

const PER_PAGE = 30;

// Runs when the browser has loaded the page
$(() => {
    let $photos = $("#photos");
    $photos.on("scroll", () => {
        let $preloader =  $("#preloader");
        if(Math.ceil($photos.height() + $photos.offset().top - $preloader.offset().top - $preloader.outerHeight()) >= 1) {
            let promiseOfLovelyPhotos = new Promise((resolve) => {
                fetchCuratedPhotos(page++, PER_PAGE, resolve);
            });

            promiseOfLovelyPhotos.then((photos) => {
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

            // let photos = dummyPhotos();
            //
            // photos.forEach((photo, index) => {
            //     addPhotoToPhotosArea(photo, index);
            //     if (index === photos.length-1) {
            //         bindClickingOnAllPhotos();
            //     }
            // });

        }

    });



    window.document.onkeydown = ((event) => {
        if(event.key === 'F11') {
            toggleFullscreen();
        }
    });

    // calling bind() on croppie if available. when the window size is changed.
    nw.Window.get().on("resize", () => {
        if(croppie && isInFullview()) {
            croppie.bind();
        }
    });

    $photos.trigger("scroll");
});

/**
 * view: 将解析的照片添加至内容区
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
    template.content.querySelector('a[name="author-profile"]').href = photo.user.links.html;
    template.content.querySelector('img[name="profile-image"]').src=photo.user.profile_image.small;
    template.content.querySelector('span[name="author-name"]').innerText = photo.user.name;

    let clone = window.document.importNode(template.content, true);
    neutralizeEternalUrl(clone, 'a[name="author-profile"]');

    columns[ index % 3].appendChild(clone);
}

/**
 * view: 以全屏显示图片
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
 * view: 返回展示栅格图片的主页
 */
function backToGridView () {
    croppie.destroy();
    document.querySelector('#fullViewPhoto').style.display = 'none';
}

/**
 * view: toggle full-screen state
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
 * helper: Unsplash 返回数据处理函数
 * @param json
 * @param cb
 */
function parseUnsplashPhotosfromJson(json, cb) {
    let photos = [];

    json.forEach((photo, index) => {
        photos.push(photo);
    });

    cb(photos);
}

/**
 * helper: 从Unsplash加载图片数据，并触发回调处理函数
 * @param cb 返回数据后调用该函数
 */
function fetchCuratedPhotos(page, perPage, cb) {
    unsplash.photos.listCuratedPhotos(page, perPage, "latest")
        .then(Unsplash.toJson)
        .then(function (json) {
            cb(json);
        });
}

/**
 * helper: 所有照片绑定全屏展示事件
 */

function bindClickingOnAllPhotos () {
    let photos = document.querySelectorAll('.photo');
    for (let i = 0; i < photos.length;i++) {
        let photo = photos[i];
        bindClickingOnAPhoto(photo);
    }
}

/**
 * helper: 绑定图片全屏展示事件
 * @param photo
 */
function bindClickingOnAPhoto (photo) {
    photo.onclick = function () {
        displayPhotoInFullView(this);
    };
}

/**
 * helper: write the image back to disk
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
 * helper: use the specified image as wallpaper
 */
function useAsWallpaper() {
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
 * helper: get the home path of current user.
 */
function getUserHome() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

function notifyHowToExitFullscreen() {
  if(isFullScreenToast) {
        let $toastContent = $('<span>Press <span class="key-text">F11</span> to exit full screen.</span>');
        Materialize.toast($toastContent, 4000);
        isFullScreenToast = false;
  }
}

function download(uri, filename, open_callback, close_callback){
    let filePath = path.join(getUserHome(),".splendid");
    mkdirp(filePath, function (err) {
        if (err) console.error(err);
        else {
            request.head(uri, function(err, res, body){
                let contentType = res.headers['content-type'];
                let contentLength = res.headers['content-length']
                let imagePath = path.join(filePath, filename + imageMimeTypes[contentType]);

                let watcher = null;
                request(uri).pipe(fs.createWriteStream(imagePath)).on('close', () => {
                    close_callback(imagePath, watcher);
                }).on('open', function () {
                    watcher = open_callback(imagePath, parseInt(contentLength));
                }).on('error', function (error) {
                    alert(error);
                });
            });
        }
    });
};

function downloadMonitor(filePath, contentLength) {
    let watcher = fs.watch(filePath, (eventType, filename) => {
        if (filename) {
            let stats = fs.statSync(filePath);
            let fileSizeInBytes = stats["size"];
            document.querySelector('.determinate').style.width = (fileSizeInBytes * 1.0 / contentLength * 100).toFixed(2) + "%";
            console.log((fileSizeInBytes * 1.0 / contentLength * 100).toFixed(2) + "%");
        }
    });

    return watcher;
}

function neutralizeEternalUrl(element, selector) {

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
            e.preventBubble();
        });
    });
}