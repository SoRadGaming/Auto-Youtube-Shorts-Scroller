// On installation show html page and set applicationIsOn to true, + settings
browser.runtime.onInstalled.addListener(async () => {
    await browser.tabs.create({url: "popup/install.html"});
    await browser.storage.local.set({applicationIsOn: true});
    await browser.storage.local.set({filterByMaxLength: "none"});
    await browser.storage.local.set({filterByMinLength: "none"});
    await browser.storage.local.set({amountOfPlaysToSkip: 1});
    await browser.storage.local.set({scrollOnComments: false});
    await browser.storage.local.set({shortCutKeys: ["shift", "s"]});
    await browser.storage.local.set({shortCutInteractKeys: ["shift", "f"]});
    await browser.storage.local.set({
        filteredAuthors: ["SoRadGaming"],
    });
});
browser.runtime.onUpdateAvailable.addListener(() => {
    browser.runtime.reload();
});
