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
];

browser.runtime.onInstalled.addListener((details) => {
  // For this update, transition from local storage to sync storage
  // CHAT GPT :
  if (details.reason === "install" || details.reason === "update") {
    // Check if data exists in local storage
    browser.storage.local.get(allStorageKeys).then((resultLocal) => {
      // Migrate local storage data to sync storage
      browser.storage.sync.get(allStorageKeys).then((resultSync) => {
        let syncData = {};
        for (const key of allStorageKeys) {
          if (key !== "applicationIsOn") {
            if (resultSync[key] === undefined && resultLocal[key] !== undefined) {
              syncData[key] = resultLocal[key];
            }
          }
        }
        browser.storage.sync.set(syncData).then(() => {
          // Clear local storage data + keep applicationIsOn
          browser.storage.local.get(["applicationIsOn"]).then((result) => {
            browser.storage.local.clear();
            if (result.applicationIsOn == undefined) {
              result.applicationIsOn = true;
            }
            browser.storage.local.set({
              applicationIsOn: result.applicationIsOn,
            });
          });
        });
        // Get all filters, then turn it into a string
      });
    });
  }
  // END CHAT GPT

  // Show install page on install
  if (details.reason === "install") {
    browser.tabs.create({ url: "popup/install.html" });
  }

  // Declare default values
  browser.storage.sync.get(allStorageKeys).then(resultSync => {
    if (resultSync.filterByMaxLength == undefined) {
      browser.storage.sync.set({filterByMaxLength: "none"});
    }
    if (resultSync.filterByMinLength == undefined) {
      browser.storage.sync.set({filterByMinLength: "none"});
    }
    browser.storage.sync.set({
      filterByMinViews: resultSync.filterByMinViews?.toString() || "none",
      filterByMaxViews: resultSync.filterByMaxViews?.toString() || "none",
      filterByMinLikes: resultSync.filterByMinLikes?.toString() || "none",
      filterByMaxLikes: resultSync.filterByMaxLikes?.toString() || "none",
      filterByMinComments: resultSync.filterByMinComments?.toString() || "none",
      filterByMaxComments: resultSync.filterByMaxComments?.toString() || "none",
    });
    if (resultSync.scrollDirection == undefined) {
      browser.storage.sync.set({scrollDirection: "down"});
    }
    if (resultSync.amountOfPlaysToSkip == undefined) {
      browser.storage.sync.set({amountOfPlaysToSkip: 1});
    }
    if (resultSync.scrollOnComments == undefined) {
      browser.storage.sync.set({scrollOnComments: false});
    }
    if (resultSync.shortCutKeys == undefined) {
      browser.storage.sync.set({shortCutKeys: ["shift", "d"]});
    }
    if (resultSync.shortCutInteractKeys == undefined) {
      browser.storage.sync.set({shortCutInteractKeys: ["shift", "f"]});
    }
    if (resultSync.filteredAuthors == undefined) {
      browser.storage.sync.set({
        filteredAuthors: ["Tyson3101"],
      });
    }
    if (resultSync.filteredTags == undefined) {
      browser.storage.sync.set({
        filteredTags: ["#nsfw", "#leagueoflegends"],
      });
    }
  });
});

browser.runtime.onUpdateAvailable.addListener(() => {
  browser.runtime.reload();
});
