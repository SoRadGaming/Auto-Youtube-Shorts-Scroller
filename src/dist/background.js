// On installation show html page and set applicationIsOn to true, + settings
browser.runtime.onInstalled.addListener(async () => {
    // Check if installation or updated
    browser.storage.local.get(
        [
            "applicationIsOn",
            "filterByMaxLength",
            "filterByMinLength",
            "amountOfPlaysToSkip",
            "scrollOnComments",
            "shortCutKeys",
            "shortCutInteractKeys",
            "filteredAuthors",
        ],
    ).then(result => {
        if (result.applicationIsOn === undefined) {
            browser.storage.local.set({applicationIsOn: true});
            browser.tabs.create({url: "popup/install.html"});
        }
        if (result.filterByMaxLength === undefined) {
            browser.storage.local.set({filterByMinLength: "none"});
        }
        if (result.filterByMinLength === undefined) {
            browser.storage.local.set({ filterByMinLength: "none" });
        }
        if (result.amountOfPlaysToSkip === undefined) {
            browser.storage.local.set({amountOfPlaysToSkip: 1});
        }
        if (result.scrollOnComments === undefined) {
            browser.storage.local.set({scrollOnComments: false});
        }
        if (result.shortCutKeys === undefined) {
            browser.storage.local.set({shortCutKeys: ["shift", "s"]});
        }
        if (result.shortCutInteractKeys === undefined) {
            browser.storage.local.set({shortCutInteractKeys: ["shift", "f"]});
        }
        if (result.filteredAuthors === undefined) {
            browser.storage.local.set({
                filteredAuthors: ["Channel_1", "Channel_2"],
            });
        }
    });
});
browser.runtime.onUpdateAvailable.addListener(() => {
    browser.runtime.reload();
});
