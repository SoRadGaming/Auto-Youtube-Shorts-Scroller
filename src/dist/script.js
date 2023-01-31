// VARIABLES
const YOUTUBE_LINK = "youtube.com";
const errMsg = document.querySelector("#error");
const toggleBtn = document.querySelector(".toggleBtn");
const validUrls = [`${YOUTUBE_LINK}/shorts`, `${YOUTUBE_LINK}/hashtag/shorts`];
const filteredAuthors = document.querySelector("#filterAuthors");
const shortCutInput = document.querySelector("#shortCutInput");
const shortCutInteractInput = document.querySelector("#shortCutInteractInput");
const filterByMaxLength = document.querySelector("#filterByMaxLength");
const filterByMinLength = document.querySelector("#filterByMinLength");
const amountOfPlaysInput = document.querySelector("#amountOfPlaysInput");
const scrollOnCommentsInput = document.querySelector("#scrollOnComments");
const nextSettings = document.querySelector("#nextSettings");
const backSettings = document.querySelector("#backSettings");
const pageNumber = document.querySelector("#pageNumber");
getAllSettingsForPopup();
// Listens to toggle button click
document.onclick = (e) => {
    if (e.target.classList.contains("toggleBtn"))
        browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
            if (validUrls.some((url) => tabs[0]?.url?.includes(url))) {
                try {
                    await browser.tabs.sendMessage(tabs[0].id, {toggle: true}, (response) => {
                        if (!response?.success)
                            errMsg.innerText = "Please refresh the page and try again!";
                    });
                }
                catch { }
            }
            else
                errMsg.innerText = "Only works for Youtube!";
        });
};
function changeToggleButton(result) {
    toggleBtn.innerText = result ? "Stop" : "Start";
    toggleBtn.classList.remove(result ? "start" : "stop");
    toggleBtn.classList.add(result ? "stop" : "start");
}
// Settings Page and functions for back and forward buttons
nextSettings.onclick = () => {
    const settingPage = document.querySelectorAll(".settingsPage");
    const active = [...settingPage].find((page) => page.classList.contains("active"));
    const next = (() => {
        const nextIndex = parseInt(active.dataset["setting-index"]) + 1;
        if (nextIndex >= settingPage.length)
            return settingPage[0];
        return settingPage[nextIndex];
    })();
    pageNumber.innerText = `${parseInt(next.dataset["setting-index"]) + 1}/${settingPage.length}`;
    active.classList.remove("active");
    next.classList.add("active");
};
backSettings.onclick = () => {
    const settingPage = document.querySelectorAll(".settingsPage");
    const active = [...settingPage].find((page) => page.classList.contains("active"));
    const last = (() => {
        const lastIndex = parseInt(active.dataset["setting-index"]) - 1;
        console.log({ lastIndex });
        if (lastIndex < 0) {
            pageNumber.innerText = `5/${settingPage.length}`;
            return settingPage[settingPage.length - 1];
        }
        else {
            pageNumber.innerText = `${parseInt(active.dataset["setting-index"])}/${settingPage.length}`;
            return settingPage[lastIndex];
        }
    })();
    active.classList.remove("active");
    last.classList.add("active");
};
function getAllSettingsForPopup() {
    // Get Settings and show them on the popup (and check for updates and reflect them)
    browser.storage.local.get(["AUTOYT_shortCutKeys", "AUTOYT_shortCutInteractKeys"]).then(async ({ AUTOYT_shortCutKeys, AUTOYT_shortCutInteractKeys }) => {
        console.log({ AUTOYT_shortCutKeys, AUTOYT_shortCutInteractKeys });
        if (AUTOYT_shortCutKeys === undefined) {
            await browser.storage.local.set({
                AUTOYT_shortCutKeys: ["shift", "s"],
            });
            shortCutInput.value = "shift+s";
        }
        else {
            console.log({ AUTOYT_shortCutKeys });
            shortCutInput.value = AUTOYT_shortCutKeys.join("+");
        }
        shortCutInput.addEventListener("change", () => {
            const value = shortCutInput.value.trim().split("+");
            if (!value.length)
                return;
            browser.storage.local.set({
                AUTOYT_shortCutKeys: value,
            });
            shortCutInput.value = value.join("+");
        });
        if (AUTOYT_shortCutInteractKeys === undefined) {
            await browser.storage.local.set({
                AUTOYT_shortCutInteractKeys: ["shift", "f"],
            });
            shortCutInteractInput.value = "shift+f";
        }
        else {
            shortCutInteractInput.value = AUTOYT_shortCutInteractKeys.join("+");
        }
        shortCutInteractInput.addEventListener("change", (e) => {
            const value = e.target.value.trim().split("+");
            if (!value.length)
                return;
            browser.storage.local.set({
                AUTOYT_shortCutInteractKeys: value,
            });
            shortCutInteractInput.value = value.join("+");
        });
    });
    browser.storage.local.get("AUTOYT_filteredAuthors").then(async (result) => {
        let value = result["AUTOYT_filteredAuthors"];
        if (value === undefined) {
            await browser.storage.local.set({
                AUTOYT_filteredAuthors: ["SoRadGaming"],
            });
            value = ["SoRadGaming"];
        }
        filteredAuthors.value = value.join(",");
    });
    filteredAuthors.addEventListener("input", async () => {
        const value = filteredAuthors.value.split(",").filter((v) => v);
        await browser.storage.local.set({
            AUTOYT_filteredAuthors: value,
        });
    });
    browser.storage.local.get(["AUTOYT_filterByMaxLength"]).then(async (result) => {
        let value = result["AUTOYT_filterByMaxLength"];
        if (value === undefined) {
            await browser.storage.local.set({ AUTOYT_filterByMaxLength: "none" });
            return (filterByMaxLength.value = "none");
        }
        filterByMaxLength.value = value;
    });
    browser.storage.local.get(["AUTOYT_filterByMinLength"]).then(async (result) => {
        let value = result["AUTOYT_filterByMinLength"];
        if (value === undefined) {
            await browser.storage.local.set({ AUTOYT_filterByMinLength: "none" });
            return (filterByMinLength.value = "none");
        }
        filterByMinLength.value = value;
    });
    filterByMaxLength.addEventListener("change", async (e) => {
        await browser.storage.local.set({
            AUTOYT_filterByMaxLength: e.target.value,
        });
    });
    filterByMinLength.addEventListener("change", async (e) => {
        await browser.storage.local.set({
            AUTOYT_filterByMinLength: e.target.value,
        });
    });
    browser.storage.local.get(["AUTOYT_amountOfPlaysToSkip"]).then(async (result) => {
        let value = result["AUTOYT_amountOfPlaysToSkip"];
        if (value === undefined) {
            await browser.storage.local.set({ AUTOYT_amountOfPlaysToSkip: 1 });
            amountOfPlaysInput.value = "1";
        }
        amountOfPlaysInput.value = value;
    });
    amountOfPlaysInput.addEventListener("change", async (e) => {
        await browser.storage.local.set({
            AUTOYT_amountOfPlaysToSkip: parseInt(e.target.value),
        });
    });
    browser.storage.local.get(["AUTOYT_scrollOnComments"]).then(async (result) => {
        let value = result["AUTOYT_scrollOnComments"];
        if (value === undefined) {
            await browser.storage.local.set({ AUTOYT_crollOnComments: false });
            scrollOnCommentsInput.checked = true;
        }
        scrollOnCommentsInput.checked = value;
    });
    scrollOnCommentsInput.addEventListener("change", async (e) => {
        await browser.storage.local.set({
            AUTOYT_scrollOnComments: e.target.checked,
        });
    });
    browser.storage.onChanged.addListener((result) => {
        if (result["AUTOYT_applicationIsOn"]?.newValue !== undefined)
            changeToggleButton(result["AUTOYT_applicationIsOn"].newValue);
    });
    browser.storage.local.get(["AUTOYT_applicationIsOn"]).then((result) => {
        if (result["AUTOYT_applicationIsOn"] == null) {
            changeToggleButton(true);
        }
        else
            changeToggleButton(result["AUTOYT_applicationIsOn"]);
    });
}
