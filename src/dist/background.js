// On installation show html page and set applicationIsOn to true, + settings
browser.runtime.onInstalled.addListener(async () => {
    await browser.tabs.create({url: "popup/install.html"});
    await browser.storage.local.set({AUTOYT_applicationIsOn: true});
    await browser.storage.local.set({AUTOYT_filterByMaxLength: "none"});
    await browser.storage.local.set({AUTOYT_filterByMinLength: "none"});
    await browser.storage.local.set({AUTOYT_amountOfPlaysToSkip: 1});
    await browser.storage.local.set({AUTOYT_scrollOnComments: false});
    await browser.storage.local.set({AUTOYT_shortCutKeys: ["shift", "s"]});
    await browser.storage.local.set({AUTOYT_shortCutInteractKeys: ["shift", "f"]});
    await browser.storage.local.set({
        AUTOYT_filteredAuthors: ["SoRadGaming"],
    });
});
browser.runtime.onUpdateAvailable.addListener(() => {
    browser.runtime.reload();
});
