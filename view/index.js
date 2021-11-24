let isDarkMode = false;
let isContinuous = false;

function cleanReaderElement() {
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
    const rendition = book.renderTo("reader", { flow: "scrolled-doc", width: "100%", height: "100%" });
    if (chapter != null) {
        const displayed = rendition.display(chapter);
    } else {
        const displayed = rendition.display();
    }

    return rendition;
}

function initEpubjs(file) {
    const book = ePub(file);
    let rendition = displayReaderWithDefaultReadingMode(book);
    defineThemes(rendition);

    book.loaded.navigation.then((toc) => {

        // TOC
        $menuList = document.querySelector(".menu-list");

        toc.forEach((chapter, idx) => {
            const $listItem = document.createElement("li");

            const $anchor = document.createElement("a");
            $anchor.textContent = chapter.label;
            $anchor.dataset.href = chapter.href;

            if (idx == 0) {
                $anchor.classList.add("is-active");
            }

            $anchor.addEventListener("click", e => {
                e.preventDefault();

                rendition.display($anchor.dataset.href);

                $menuList.querySelector(".is-active").classList.remove("is-active");

                $anchor.classList.add("is-active");

                return false;
            });

            $listItem.append($anchor);

            $menuList.append($listItem);
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
            return false;
        });

        // Font Size
        document.querySelector("#font-size").addEventListener("blur", (e) => {
            rendition.themes.fontSize(e.target.value);
        });

        // Continuous Toggle
        document.querySelector("#continuous").addEventListener("click", (e) => {
            const currentChapter = document.querySelector(".is-active").dataset.href;

            if (isContinuous) {
                cleanReaderElement();
                rendition = displayReaderWithDefaultReadingMode(book, currentChapter);

                e.target.innerText = "Continuous";
            } else {
                cleanReaderElement();

                rendition = book.renderTo("reader", {
                    manager: "continuous",
                    flow: "scrolled",
                    width: "100%",
                    height: "100%",
                });

                const display = rendition.display(currentChapter);

                e.target.innerText = "By Chapter";
            }

            defineThemes(rendition);

            isContinuous = ! isContinuous;

            return false;
        });
    });

}

function renderReader() {
    document.querySelector("#main").innerHTML = `
        <nav class="navbar is-fixed-top" role="navigation" aria-label="main navigation">
            <div class="navbar-brand">
                <a class="navbar-item" href="https://bulma.io">
                    <img src="https://bulma.io/images/bulma-logo.png" width="112" height="28">
                </a>
            </div>
            <div id="navbarBasicExample" class="navbar-menu">
                <div class="navbar-start">
                    <a id="continuous" class="navbar-item">
                        Continuous
                    </a>

                    <input class="input" id="font-size" type="text" placeholder="Font Size" value="100%">
                </div>
            </div>

            <div class="navbar-end">
                <div class="navbar-item">
                    <div class="buttons">
                        <a id="dark-mode-toggle" class="button is-primary">
                            <strong>🌙</strong>
                        </a>
                    </div>
                </div>
            </div>
        </nav>
    
        <div class="columns">
            <div class="column">
                <aside class="menu">
                    <ul class="menu-list"></ul>
                </aside>
            </div>

            <div class="column is-three-quarters">
                <div id="reader"></div>
            </div>
        </div>
    `;
    document.documentElement.classList.add("has-navbar-fixed-top");
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