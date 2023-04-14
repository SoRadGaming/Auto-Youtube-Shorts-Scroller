// All storage keys that are used in the application and should be migrated
const allStorageKeys = [
    "applicationIsOn",
    "filterByMaxLength",
    "filterByMinLength",
    "filterByMinViews",
    "filterByMaxViews",
    "filterByMinLikes",
    "filterByMaxLikes",
    "filterByMinComments",
    "filterByMaxComments",
    "amountOfPlaysToSkip",
    "scrollOnComments",
    "shortCutKeys",
    "shortCutInteractKeys",
    "filteredAuthors",
];
// On installation show html page and set applicationIsOn to true, + settings
// Transition from local storage to sync storage
browser.runtime.onInstalled.addListener(async (details) => {
    // Check if installation or updated
    if (details.reason === "install" || details.reason === "update") {
        // Check if data exists in local storage
        browser.storage.local.get(allStorageKeys).then(resultLocal => {
            // Migrate local storage data to sync storage
            browser.storage.sync.get(allStorageKeys).then(resultSync => {
                let syncData = {};
                for (const key of allStorageKeys) {
                    if (key !== "applicationIsOn") {
                        if (resultSync[key] === undefined &&
                            resultLocal[key] !== undefined) {
                            syncData[key] = resultLocal[key];
                        }
                    }
                }
                browser.storage.sync.set(syncData).then( () => {
                    // Clear local storage data + keep applicationIsOn
                    browser.storage.local.get(["applicationIsOn"]).then(result => {
                        browser.storage.local.clear();
                        if (result.applicationIsOn === undefined) {
                            result.applicationIsOn = true;
                        }
                        browser.storage.local.set({
                            applicationIsOn: result.applicationIsOn,
                        });
                    });
                });
            });
        });
    }
    if (details.reason === "install") {
        await browser.tabs.create({url: "popup/install.html"});
    }
    // Declare default values
    browser.storage.sync.get(allStorageKeys).then(resultSync => {
        if (resultSync.applicationIsOn === undefined) {
            browser.storage.sync.set({applicationIsOn: true});
        }
        if (resultSync.filterByMaxLength === undefined) {
            browser.storage.sync.set({filterByMaxLength: "none"});
        }
        if (resultSync.filterByMinLength === undefined) {
            browser.storage.sync.set({filterByMinLength: "none"});
        }
        if (resultSync.filterByMinViews === undefined) {
            browser.storage.sync.set({ filterByMinViews: "none" });
        }
        if (resultSync.filterByMaxViews === undefined) {
            browser.storage.sync.set({ filterByMaxViews: "none" });
        }
        if (resultSync.filterByMinLikes === undefined) {
            browser.storage.sync.set({ filterByMinLikes: "none" });
        }
        if (resultSync.filterByMaxLikes === undefined) {
            browser.storage.sync.set({ filterByMaxLikes: "none" });
        }
        if (resultSync.filterByMinComments === undefined) {
            browser.storage.sync.set({ filterByMinComments: "none" });
        }
        if (resultSync.filterByMaxComments === undefined) {
            browser.storage.sync.set({ filterByMaxComments: "none" });
        }
        if (resultSync.amountOfPlaysToSkip === undefined) {
            browser.storage.sync.set({amountOfPlaysToSkip: 1});
        }
        if (resultSync.scrollOnComments === undefined) {
            browser.storage.sync.set({scrollOnComments: false});
        }
        if (resultSync.shortCutKeys === undefined) {
            browser.storage.sync.set({shortCutKeys: ["shift", "s"]});
        }
        if (resultSync.shortCutInteractKeys === undefined) {
            browser.storage.sync.set({shortCutInteractKeys: ["shift", "f"]});
        }
        if (resultSync.filteredAuthors === undefined) {
            browser.storage.sync.set({
                filteredAuthors: ["Channel_1", "Channel_2"],
            });
        }
    });
});
browser.runtime.onUpdateAvailable.addListener(() => {
    browser.runtime.reload();
});
