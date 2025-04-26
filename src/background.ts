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
  "scrollDirection",
  "amountOfPlaysToSkip",
  "scrollOnComments",
  "shortCutKeys",
  "shortCutInteractKeys",
  "filteredAuthors",
  "filteredTags",
  "whitelistedAuthors",
  "scrollOnNoTags",
];

browser.runtime.onInstalled.addListener((details) => {
  // Show install page on install
  if (details.reason === "install") {
    browser.tabs.create({ url: "popup/install.html" });
  }

  // Declare default values
  browser.storage.local.get("applicationIsOn").then((result) => {
    if (result.applicationIsOn == undefined) {
      browser.storage.local.set({ applicationIsOn: true });
    }
  });

  browser.storage.local.get(allStorageKeys).then((resultSync) => {
    if (resultSync.filterByMaxLength == undefined) {
      browser.storage.local.set({ filterByMaxLength: "none" });
    }
    if (resultSync.filterByMinLength == undefined) {
      browser.storage.local.set({ filterByMinLength: "none" });
    }
    browser.storage.local.set({
      filterByMinViews: resultSync.filterByMinViews?.toString() || "none",
      filterByMaxViews: resultSync.filterByMaxViews?.toString() || "none",
      filterByMinLikes: resultSync.filterByMinLikes?.toString() || "none",
      filterByMaxLikes: resultSync.filterByMaxLikes?.toString() || "none",
      filterByMinComments: resultSync.filterByMinComments?.toString() || "none",
      filterByMaxComments: resultSync.filterByMaxComments?.toString() || "none",
    });
    if (resultSync.scrollDirection == undefined) {
      browser.storage.local.set({ scrollDirection: "down" });
    }
    if (resultSync.amountOfPlaysToSkip == undefined) {
      browser.storage.local.set({ amountOfPlaysToSkip: 1 });
    }
    if (resultSync.scrollOnComments == undefined) {
      browser.storage.local.set({ scrollOnComments: false });
    }
    if (resultSync.shortCutKeys == undefined) {
      browser.storage.local.set({ shortCutKeys: ["shift", "d"] });
    }
    if (resultSync.shortCutInteractKeys == undefined) {
      browser.storage.local.set({ shortCutInteractKeys: ["shift", "g"] });
    }
    if (resultSync.filteredAuthors == undefined) {
      browser.storage.local.set({
        filteredAuthors: ["Tyson3101"],
      });
    }
    if (resultSync.filteredTags == undefined) {
      browser.storage.local.set({
        filteredTags: ["#nsfw", "#leagueoflegends"],
      });
    }
    if (resultSync.whitelistedAuthors == undefined) {
      browser.storage.local.set({
        whitelistedAuthors: ["Tyson3101"],
      });
    }
    if (resultSync.scrollOnNoTags == undefined) {
      browser.storage.local.set({ scrollOnNoTags: false });
    }
  });
});

browser.runtime.onUpdateAvailable.addListener(() => {
  browser.runtime.reload();
});
