let isDarkMode = false;
let isContinuous = false;
let isTOCVisible = true;

function cleanReaderElement(rendition) {
    rendition.clear();
    rendition.destroy();
    document.querySelector("#reader").innerHTML = "";
}

function defineThemes(rendition) {
    // Themes
    rendition.themes.register("my-dark", "/lib/epubjs/themes.css");
    rendition.themes.register("light", "/lib/epubjs/themes.css");

    if (isDarkMode) {
        rendition.themes.select("my-dark");
    } else {
        rendition.themes.select("light");
    }

    rendition.themes.fontSize(document.querySelector("#font-size").value);
}

function displayReaderWithDefaultReadingMode(book, chapter = null) {
    const rendition = book.renderTo("reader", {
        flow: "scrolled-doc",
        width: "100%",
        height: "100%",
        overflow: "auto",
        allowScriptedContent: true,
    });

    const removePadding = () => {
        document.querySelector(".epub-container").style.paddingBottom = "unset";
        mapKeys();
    }

    let displayed;
    if (chapter != null) {
        displayed = rendition.display(chapter).then(removePadding);
    } else {
        displayed = rendition.display().then(removePadding);
    }

    return rendition;
}

function scrollToChapterId(anchorHref) {
    const elId = anchorHref.substr(anchorHref.indexOf("#"));
    const $el = document.querySelector(elId);
    if ($el) {
        $el.scrollIntoView(false);
        window.scrollY(-56);
    } else {
        window.scrollTo(0, 0);
    }
}

function addEventToTOCEl(rendition, el) {
    const $menuList = document.querySelector(".menu-list");

    el.addEventListener("click", e => {
        e.preventDefault();

        rendition.clear();

        rendition.display(el.dataset.href).then(() => {
            scrollToChapterId(el.dataset.href);
            mapKeys();
        });

        const $el = $menuList.querySelector(".is-active");
        if ($el) {
            $el.classList.remove("is-active");
        }

        el.classList.add("is-active");

        return false;
    });
}

function createAnchorTagsForChapters(rendition, parentEl, chapters, isNested = false) {
    chapters.forEach((chapter, idx) => {
        const $listItem = document.createElement("li");

        const $anchor = document.createElement("a");
        $anchor.textContent = chapter.label;
        $anchor.dataset.href = chapter.href;

        let lastIdx = chapter.href.indexOf('#');
        if (lastIdx == -1) {
            lastIdx = chapter.href.length;
        }
        $anchor.dataset.originalHref = chapter.href.substring(0, lastIdx);

        if (!isNested && idx == 0) {
            $anchor.classList.add("is-active");
        }

        addEventToTOCEl(rendition, $anchor);

        $listItem.append($anchor);

        parentEl.append($listItem);

        if (chapter.subitems.length) {
            $ul = document.createElement("ul");
            $listItem.appendChild($ul);
            createAnchorTagsForChapters(rendition, $ul, chapter.subitems, true);
        }
    });

}

function highlightNextOrPreviousChapter(newHref) {
    const $oldEl = document.querySelector(".menu-list .is-active");
    if ($oldEl) {
        $oldEl.classList.remove("is-active");
    }

    const $el = document.querySelector(".menu-list a[data-original-href='" + newHref + "']")
    if ($el) {
        $el.classList.add("is-active");
    }
}

function initEpubjs(file) {
    const book = ePub(file);
    let rendition = displayReaderWithDefaultReadingMode(book);
    defineThemes(rendition);

    book.loaded.navigation.then((toc) => {
        // TOC
        const $menuList = document.querySelector(".menu-list");
        createAnchorTagsForChapters(rendition, $menuList, toc);

        // Toggle TOC
        document.querySelector("#toggle-toc").addEventListener("click", (e) => {
            e.preventDefault();

            if (isTOCVisible) {
                document.querySelector("#toc-menu").classList.add("is-0");
                document.querySelector("#reader-column").classList.remove("is-three-quarters");
            } else {
                document.querySelector("#toc-menu").classList.remove("is-0");
                document.querySelector("#reader-column").classList.add("is-three-quarters");
            }

            rendition.clear();
            let currentChapter = document.querySelector(".is-active");
            if (currentChapter) {
                currentChapter = currentChapter.dataset.href;
                rendition.display(currentChapter).then(mapKeys);
            } else {
                rendition.display().then(mapKeys);
            }


            isTOCVisible = ! isTOCVisible;

            return false;
        });

        // Dark Mode
        document.querySelector("#dark-mode-toggle").addEventListener("click", () => {
            if (isDarkMode) {
                rendition.themes.select("light");
                document.querySelector("#bulma-dark").remove();
            } else {
                rendition.themes.select("my-dark");

                const $bulmaDark = document.createElement("link");
                $bulmaDark.id = "bulma-dark";
                $bulmaDark.rel = "stylesheet";
                $bulmaDark.href = "/lib/bulma/css/bulma-prefers-dark.css";

                const $bulma = document.querySelector("#bulma");

                $bulma.parentNode.insertBefore($bulmaDark, $bulma.nextSibling);
            }

            isDarkMode = ! isDarkMode;

            document.querySelector("iframe").focus();

            return false;
        });

        // Font Size
        document.querySelector("#font-size").addEventListener("blur", (e) => {
            rendition.themes.fontSize(e.target.value);
        });

        // Continuous Toggle
        document.querySelector("#continuous").addEventListener("click", (e) => {
            let currentChapter = document.querySelector(".is-active");
            if (currentChapter) {
                currentChapter = currentChapter.dataset.href;
            }

            if (isContinuous) {
                cleanReaderElement(rendition);
                rendition = displayReaderWithDefaultReadingMode(book, currentChapter);

                e.target.innerText = "Continuous";
            } else {
                cleanReaderElement(rendition);

                rendition = book.renderTo("reader", {
                    manager: "continuous",
                    flow: "scrolled",
                    width: "100%",
                    height: "100%",
                    overflow: "scroll",
                    allowScriptedContent: true,
                });

                rendition.display().then(() => {
                    document.querySelector(".epub-container").style.paddingBottom = "50vh";
                    mapKeys();
                });

                e.target.innerText = "By Chapter";
            }

            defineThemes(rendition);

            isContinuous = ! isContinuous;

            return false;
        });

    });

    rendition.on("rendered", section => {

        // Next and Previous Buttons
        document.querySelector("#next-chapter").addEventListener("click", (e) => {
            e.preventDefault();

            const nextSection = section.next();

            if (nextSection) {
                rendition.display(nextSection.href).then(() => {
                    mapKeys();
                });

                highlightNextOrPreviousChapter(nextSection.href);
            }
            
            return false;
        });

        document.querySelector("#previous-chapter").addEventListener("click", (e) => {
            e.preventDefault();

            const prevSection = section.prev();

            if (prevSection) {
                rendition.display(prevSection.href).then(() => {
                    mapKeys();
                });

                highlightNextOrPreviousChapter(prevSection.href);
            }
            
            return false;
        });

        mapKeys();

    });

    rendition.hooks.render.register(() => mapKeys());
}

function renderReader() {
    document.querySelector("#main").innerHTML = `
        <nav class="navbar" role="navigation" aria-label="main navigation">
            <div class="navbar-brand">
                <a class="navbar-item" href="https://bulma.io">
                    <img src="https://bulma.io/images/bulma-logo.png" width="112" height="28">
                </a>
            </div>
            <div id="navbarBasicExample" class="navbar-menu">
                <div class="navbar-start">
                    <a id="toggle-toc" class="navbar-item">
                        Toggle
                    </a>

                    <a id="continuous" class="navbar-item">
                        Continuous
                    </a>

                    <input class="input" id="font-size" type="text" placeholder="Font Size" value="100%">
                </div>
            </div>

            <div class="navbar-end">
                <div class="navbar-item">
                    <div class="buttons">
                        <a id="previous-chapter" class="button is-secondary">
                            <strong>◀</strong>
                        </a>
                    </div>
                </div>
                <div class="navbar-item">
                    <div class="buttons">
                        <a id="next-chapter" class="button is-secondary">
                            <strong>▶</strong>
                        </a>
                    </div>
                </div>
                <div class="navbar-item">
                    <div class="buttons">
                        <a id="dark-mode-toggle" class="button is-primary">
                            <strong>🌙</strong>
                        </a>
                    </div>
                </div>
            </div>
        </nav>
    
        <div id="content" class="columns">
            <div id="toc-menu" class="column">
                <aside class="menu">
                    <ul class="menu-list"></ul>
                </aside>
            </div>

            <div id="reader-column" class="column is-three-quarters">
                <div id="reader"></div>
            </div>
        </div>
    `;
}

let gFlag = 0;
function mapKeys() {
    const $container = document.querySelector(".epub-container");

    document.querySelectorAll(".epub-view").forEach($epubView => {
        $epubView.addEventListener("DOMSubtreeModified", e => {
            mapKeys();
        });
    });

    document.querySelectorAll("iframe").forEach($iframe => {
        $iframe.contentDocument.onkeydown = e => {
            if (e.key == 'j') {
                $container.scrollBy(0, 100);
            } else if (e.key == 'k') {
                $container.scrollBy(0, -100);
            } else if (e.key == 'G') {
                $container.scrollTo(0, $container.scrollHeight);
            } else if (e.key == 'g') {
                gFlag++;
                if (gFlag == 2) {
                    gFlag = 0;
                    $container.scrollTo(0, 0);
                }
            }
        };

        $iframe.focus();
    });

}

document.querySelector("#epub_file").addEventListener("change", (e) => {
    const fileEl = document.querySelector(".file-name");
    if (e.target.files[0]) {
        const name = e.target.files[0].name;

        fileEl.textContent = name;

        renderReader();
        initEpubjs(e.target.files[0]);

    } else {
        fileEl.textContent = "Please select a file!";
    }
});