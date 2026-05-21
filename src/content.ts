// ------------------------------
// CONSTANT SELECTORS VARIABLES
// ------------------------------
const VIDEOS_LIST_SELECTORS = [
  ".reel-video-in-sequence",
  ".reel-video-in-sequence-new",
];
const CURRENT_SHORT_SELECTOR = "ytd-reel-video-renderer";
const LIKE_BUTTON_SELECTOR = "#like-button button";
const DISLIKE_BUTTON_SELECTOR = "#dislike-button button";
const COMMENTS_SELECTOR =
    "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-comments-section']";
const LIKES_COUNT_SELECTOR =
    "#factoids > factoid-renderer:nth-child(1) > div > span.ytwFactoidRendererValue > span";
const VIEW_COUNT_SELECTOR =
    "#factoids > view-count-factoid-renderer > factoid-renderer > div > span.ytwFactoidRendererValue > span";
const COMMENTS_COUNT_SELECTORS = [
  "#comments-button > ytd-button-renderer > yt-button-shape > label > div > span",
  "#button-bar > reel-action-bar-view-model > button-view-model:nth-of-type(1) > label > div > span",
];
const DESCRIPTION_TAGS_SELECTOR = "#title > yt-formatted-string > a";

// Channel/author link selectors tried in priority order. The first ones are
// the modern, lenient matches that survive YouTube DOM tweaks (any handle
// link inside the short). The strict legacy paths are kept as a last-resort
// fallback. Use findCreatorLink() / isCreatorHydrated() below to query them.
const AUTHOUR_NAME_SELECTORS = [
  // Modern: channel-bar element with a handle (/@…) or channel (/channel/…) link
  "yt-reel-channel-bar-view-model a[href^='/@']",
  "yt-reel-channel-bar-view-model a[href^='/channel/']",
  "yt-reel-channel-bar-view-model a",
  // Other common channel-name containers YouTube has used
  "ytd-channel-name a",
  "#channel-info a[href^='/@']",
  // Legacy strict paths from earlier YouTube DOM revisions
  "#metapanel > yt-reel-metapanel-view-model > div:nth-child(1) > yt-reel-channel-bar-view-model > span > a",
  "#metapanel > yt-reel-metapanel-view-model > div:nth-child(2) > yt-reel-channel-bar-view-model > span > a",
  // Last resort: ANY channel-handle link inside the short container
  "a[href^='/@']",
];

// Kept for legacy callers / debug logging.
const AUTHOUR_NAME_SELECTOR = AUTHOUR_NAME_SELECTORS[0];
const AUTHOUR_NAME_SELECTOR_2 = AUTHOUR_NAME_SELECTORS[1];

function findCreatorLink(scope: Element | Document): HTMLAnchorElement | null {
  for (const sel of AUTHOUR_NAME_SELECTORS) {
    const el = scope.querySelector(sel) as HTMLAnchorElement | null;
    if (el && el.innerText && el.innerText.trim().length > 0) return el;
  }
  return null;
}

function isCreatorHydrated(scope: Element | Document): boolean {
  return findCreatorLink(scope) != null;
}

const NEXT_BUTTON_SELECTOR =
    "#navigation-button-down > ytd-button-renderer > yt-button-shape > button";
const PREVIOUS_BUTTON_SELECTOR =
    "#navigation-button-up > ytd-button-renderer > yt-button-shape > button";

// ------------------------------
// APP VARIABLES
// ------------------------------
let shortCutToggleKeys = [];
let shortCutInteractKeys = [];
let scrollOnCommentsCheck = false;
let scrollDirection = 1;
let amountOfPlays = 0;
let amountOfPlaysToSkip = 1;
let filterMinLength = "none";
let filterMaxLength = "none";
let filterMinViews = "none";
let filterMaxViews = "none";
let filterMinLikes = "none";
let filterMaxLikes = "none";
let filterMinComments = "none";
let filterMaxComments = "none";
let blockedCreators = [];
let whitelistedCreators = [];
let blockedTags = [];
let scrollOnNoTags = false;
let additionalScrollDelay = 0;

// ------------------------------
// STATE VARIABLES
// ------------------------------
let currentShortId = null;
let currentVideoElement = null;
let applicationIsOn = false;
let scrollTimeout: any;

const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 500;

// ------------------------------
// MAIN FUNCTIONS
// ------------------------------
function startAutoScrolling() {
  if (!applicationIsOn) {
    applicationIsOn = true;
    amountOfPlays = 0;
    currentShortId = null;
    currentVideoElement = null;
  }
  checkForNewShort();
}

function stopAutoScrolling() {
  applicationIsOn = false;
  amountOfPlays = 0;
  if (currentVideoElement) {
    // Adds back the loop attribute to the video element
    currentVideoElement.setAttribute("loop", "true");
    currentVideoElement.removeEventListener("ended", shortEnded);
    currentVideoElement._hasEndEvent = false;
  }
}

async function checkForNewShort() {
  if (!applicationIsOn || !isShortsPage()) return;
  const currentShort = findShortContainer();
  if (!currentShort) return;

  // Checks if the current short is the same as the last one
  if (currentShort?.id != currentShortId) {
    // Prevent scrolling from previous short ending
    if (scrollTimeout) clearTimeout(scrollTimeout);

    // Remove event listener from the previous video element
    const previousShort = currentVideoElement;
    if (previousShort) {
      previousShort.removeEventListener("ended", shortEnded);
      previousShort._hasEndEvent = false;
    }

    // Set the new current short id and video element
    currentShortId = parseInt(currentShort.id);
    currentVideoElement = currentShort.querySelector("video");

    // Looping check if the current short has a video element
    if (currentVideoElement == null) {
      let l = 0;
      while (currentVideoElement == null) {
        currentVideoElement = currentShort.querySelector("video");
        if (l > MAX_RETRIES) {
          // If the video element is not found, scroll to the next short
          let prevShortId = currentShortId;
          currentShortId = null;
          console.log(
              "[Auto Youtube Shorts Scroller] Video element not found, scrolling to next short..."
          );
          return scrollToNextShort(prevShortId);
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        l++;
      }
    }

    // Check if the current short is an ad
    if (
        currentShort.querySelector("ytd-ad-slot-renderer") ||
        currentShort.querySelector("ad-button-view-model")
    ) {
      console.log(
          "[Auto Youtube Shorts Scroller] Ad detected..., scrolling to next short..."
      );
      return scrollToNextShort(currentShortId, false);
    }

    // Log the current short id
    console.log(
        "[Auto Youtube Shorts Scroller] Current ID of Short: ",
        currentShortId
    );

    // Add event listener to the current video element

    console.log(
        "[Auto Youtube Shorts Scroller] Adding event listener to video element...",
        currentVideoElement
    );

    currentVideoElement.addEventListener("ended", shortEnded);
    currentVideoElement._hasEndEvent = true;

    // Check if the current short has metadata (channel/author link).
    // Uses the flexible selector list so transient YouTube DOM changes don't
    // break detection.
    if (!isCreatorHydrated(currentShort)) {
      let l = 0;
      // If the creator name is not found, wait for it to load (A long with other data)
      while (!isCreatorHydrated(currentShort)) {
        if (l > MAX_RETRIES) {
          // Metadata never appeared (the AUTHOUR_NAME_SELECTOR CSS path is
          // likely stale for the current YouTube DOM). Previously this set
          // currentShortId = null and called scrollToNextShort(), which
          // raced against setInterval(checkForNewShort, 500): if the next
          // tick re-set currentShortId to the same id *before* the scroll
          // timeout's `prevShortId != currentShortId` guard fired, the
          // page would actually scroll away mid-video. Just continue here
          // instead — author/tag filters that depend on metadata will
          // simply no-op (their selectors return null), and the rest of
          // the validity checks (length, views, likes, comments) still
          // work normally.
          console.warn(
              "[Auto Youtube Shorts Scroller] metadata not hydrated within timeout — continuing without author/tag filters",
              { shortId: currentShortId }
          );
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        l++;
      }
    }

    // Check if short meets the filter settings
    const isValidShort = await checkShortValidity(currentShort);

    if (!isValidShort) {
      console.log(
          "[Auto Youtube Shorts Scroller] Short doesn't meet the filter settings, scrolling to next short..."
      );
      return scrollToNextShort(currentShortId, true);
    }
  }

  // Force removal of the loop attribute if it exists
  if (currentVideoElement?.hasAttribute("loop") && applicationIsOn) {
    currentVideoElement.removeAttribute("loop");
  }
}

function shortEnded(e: Event) {
  e.preventDefault();
  if (!applicationIsOn) return stopAutoScrolling();
  console.log(
      "[Auto Youtube Shorts Scroller] Short ended, scrolling to next short..."
  );
  amountOfPlays++;

  // Checks amount of plays to skip the short
  if (amountOfPlays >= amountOfPlaysToSkip) {
    // If its same or exceeded the amount of plays, scroll to the next short
    amountOfPlays = 0;
    scrollToNextShort(currentShortId);
  } else {
    // Otherwise, play the video again
    currentVideoElement.play();
  }
}

async function scrollToNextShort(
    prevShortId: number = null,
    useDelayAndCheckComments = true
) {
  if (!applicationIsOn) return stopAutoScrolling();

  const comments = document.querySelector(COMMENTS_SELECTOR);
  const isCommentsOpen = () => {
    const visibilityOfComments = comments?.attributes["VISIBILITY"]?.value;
    return visibilityOfComments === "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED";
  };

  // Check if comments is open, and settings are set to scroll on comments
  if (comments && useDelayAndCheckComments) {
    if (isCommentsOpen() && !scrollOnCommentsCheck) {
      useDelayAndCheckComments = false; // If the comments are open, don't wait for the additional scroll delay when scrolling
      // If the comments are open, wait till they are closed (if the setting is set to scroll on comments)
      while (
          isCommentsOpen() && // Waits till the comments are closed
          !scrollOnCommentsCheck && // Stops if the setting is changed
          prevShortId == currentShortId // Stops if the short changes
          ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  if (scrollTimeout) clearTimeout(scrollTimeout);
  if (additionalScrollDelay > 0 && useDelayAndCheckComments)
      // If the additional scroll delay is set, wait for it, and allow loop while delaying
    currentVideoElement.play();
  scrollTimeout = setTimeout(
      async () => {
        if (prevShortId != null && currentShortId != prevShortId) return; // If the short changed, don't scroll

        const nextShortContainer = await waitForNextShort();
        if (nextShortContainer == null && isShortsPage())
          return window.location.reload(); // If no next short is found, reload the page (Last resort)

        // If next short container is found, remove the current video element end event listener
        if (currentVideoElement) {
          currentVideoElement.removeEventListener("ended", shortEnded);
          currentVideoElement._hasEndEvent = false;
        }

        // Scroll to the next short container
        nextShortContainer.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "start",
        });
        // Then check the new short
        checkForNewShort();
      },
      // Sets the additional scroll delay from settings
      useDelayAndCheckComments ? additionalScrollDelay : 0
  );
}

function findShortContainer(id = null) {
  let shorts = [] as HTMLDivElement[];

  // Finds the short container by the selector (Incase of updates)
  for (let i = 0; i < VIDEOS_LIST_SELECTORS.length; i++) {
    const shortList = [
      ...document.querySelectorAll(VIDEOS_LIST_SELECTORS[i]),
    ] as HTMLDivElement[];
    if (shortList.length > 0) {
      shorts = [...shortList];
      break;
    }
  }

  // If an id is provided, find the short with that id. Return null if not found
  // so callers can retry / fall back instead of receiving the wrong element.
  if (id != null) {
    if (shorts.length === 0)
      return document.getElementById(id.toString()) as HTMLDivElement;
    const short = shorts.find((short) => short.id == id.toString());
    return (short || null) as HTMLDivElement;
  }

  // No id provided: return the currently active short.
  if (shorts.length === 0)
    return document.getElementById((currentShortId ?? 0).toString()) as HTMLDivElement;

  // Primary: explicit is-active attribute (set by YouTube on the visible reel).
  const activeByAttr = shorts.find(
      (short) =>
          short.hasAttribute("is-active") ||
          short.querySelector("[is-active]")
  );
  if (activeByAttr) return activeByAttr as HTMLDivElement;

  // Fallback: the short whose center is closest to the viewport center.
  // (Previously this used `querySelector(CURRENT_SHORT_SELECTOR)`, which
  // matched every hydrated short and made shorts[0] win — the root cause of
  // the "scrolls back to the first short" bug.)
  const viewportCenter = window.innerHeight / 2;
  let bestShort: HTMLDivElement = shorts[0];
  let bestDistance = Infinity;
  for (const short of shorts) {
    const rect = short.getBoundingClientRect();
    if (rect.height === 0) continue;
    const distance = Math.abs((rect.top + rect.bottom) / 2 - viewportCenter);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestShort = short;
    }
  }
  return bestShort;
}

async function waitForNextShort(retries = 5, delay = 500) {
  if (!isShortsPage()) return null;
  for (let i = 0; i < retries; i++) {
    // Primary strategy: navigate via DOM siblings of the *currently playing*
    // short. This is robust to YouTube changing the `id` numbering scheme
    // (which previously caused the script to scroll back to shorts[0]).
    let currentShortEl: HTMLDivElement | null = null;
    if (currentVideoElement) {
      currentShortEl = (currentVideoElement as HTMLElement).closest(
          VIDEOS_LIST_SELECTORS.join(",")
      ) as HTMLDivElement;
    }
    if (!currentShortEl) {
      currentShortEl = findShortContainer() as HTMLDivElement;
    }

    if (currentShortEl) {
      const allShorts = [
        ...document.querySelectorAll(VIDEOS_LIST_SELECTORS.join(",")),
      ] as HTMLDivElement[];
      const currentIndex = allShorts.indexOf(currentShortEl);
      if (currentIndex !== -1) {
        const nextIndex = currentIndex + scrollDirection;
        if (nextIndex >= 0 && nextIndex < allShorts.length) {
          return allShorts[nextIndex];
        }
      }
    }

    // Secondary: strict id-based lookup (must actually match the expected id).
    const expectedId = (currentShortId + scrollDirection).toString();
    const nextById = findShortContainer(currentShortId + scrollDirection);
    if (nextById && nextById.id === expectedId) return nextById;

    // If none found, little slight screen shake to trigger hydration of new shorts
    window.scrollBy(0, 100);
    await new Promise((r) => setTimeout(r, delay));
    window.scrollBy(0, -100);
    await new Promise((r) => setTimeout(r, delay));
  }

  console.log(
      "[Auto Youtube Shorts Scroller] The next short has not loaded in, reloading page..."
  );
  return null;
}

async function checkShortValidity(currentShort: HTMLDivElement) {
  const videoLength = currentVideoElement?.duration;
  const viewCount = document.querySelector(
      VIEW_COUNT_SELECTOR
  ) as HTMLSpanElement;
  const likeCount = document.querySelector(
      LIKES_COUNT_SELECTOR
  ) as HTMLSpanElement;
  const commentCount =
      currentShort &&
      (currentShort.querySelector(
          COMMENTS_COUNT_SELECTORS.join(",")
      ) as HTMLSpanElement);
  const tags = document.querySelectorAll(
      DESCRIPTION_TAGS_SELECTOR
  ) as NodeListOf<HTMLAnchorElement>;
  const creatorName = currentShort ? findCreatorLink(currentShort) : null;

  console.log("[Auto Youtube Shorts Scroller]", {
    filters: [
      { videoLength, filterMinLength, filterMaxLength },
      { viewCount: viewCount?.innerText, filterMinViews, filterMaxViews },
      { likeCount: likeCount?.innerText, filterMinLikes, filterMaxLikes },
      {
        commentCount: commentCount?.innerText,
        filterMinComments,
        filterMaxComments,
      },
      { tags: [...tags].map((tag) => tag.innerText) },
      { creatorName: creatorName?.innerText },
      { blockedTags },
      { blockedCreators },
      { whitelistedCreators },
    ],
  });

  // Ignores all checks if whitelisted creator
  if (!!creatorName && whitelistedCreators.length > 0) {
    const creator = creatorName.innerText.trim().toLowerCase();
    if (
        whitelistedCreators.map((cr) => cr.toLowerCase()).includes(creator) ||
        whitelistedCreators
            .map((cr) => cr.toLowerCase())
            .includes(creator.replace("@", ""))
    ) {
      return true;
    }
  }

  if (!checkValidVideoLength(videoLength)) return false;
  if (viewCount && !checkValidViewCount(viewCount)) return false;
  if (likeCount && !checkValidLikeCount(likeCount)) return false;
  if (!!commentCount && !checkValidCommentCount(commentCount)) return false;
  if (!checkValidTags(tags)) return false;
  if (!!creatorName && !checkValidCreator(creatorName)) return false;

  function checkValidVideoLength(videoLength: number) {
    if (filterMinLength !== "none" && videoLength < parseInt(filterMinLength))
      return false;
    return !(filterMaxLength !== "none" && videoLength > parseInt(filterMaxLength));

  }

  function checkValidViewCount(viewCount: HTMLSpanElement) {
    const viewCountText = viewCount.innerText
        .trim()
        .toLowerCase()
        .replaceAll(",", "");
    const filterMinViewsParsed = parseTextToNumber(filterMinViews);
    const filterMaxViewsParsed = parseTextToNumber(filterMaxViews);
    if (
        filterMinViews !== "none" &&
        parseInt(viewCountText) < filterMinViewsParsed
    )
      return false;
    return !(filterMaxViews !== "none" &&
        parseInt(viewCountText) > filterMaxViewsParsed);

  }

  function checkValidLikeCount(likeCount: HTMLSpanElement) {
    const likeNum = parseTextToNumber(likeCount.innerText);
    const filterMinLikesParsed = parseTextToNumber(filterMinLikes);
    const filterMaxLikesParsed = parseTextToNumber(filterMaxLikes);
    if (filterMinLikes !== "none" && likeNum < filterMinLikesParsed)
      return false;
    return !(filterMaxLikes !== "none" && likeNum > filterMaxLikesParsed);

  }

  function checkValidCommentCount(commentCount: HTMLSpanElement) {
    const commentNum = parseTextToNumber(commentCount.innerText);
    const filterMinCommentsParsed = parseTextToNumber(filterMinComments);
    const filterMaxCommentsParsed = parseTextToNumber(filterMaxComments);

    if (filterMinComments !== "none" && commentNum < filterMinCommentsParsed)
      return false;
    return !(filterMaxComments !== "none" && commentNum > filterMaxCommentsParsed);

  }

  function checkValidTags(tags: NodeListOf<HTMLAnchorElement>) {
    if (tags.length === 0 && scrollOnNoTags) return false;
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i].innerText.toLowerCase();
      if (
          blockedTags.map((bTag) => bTag.toLowerCase()).includes(tag) ||
          blockedTags
              .map((bTag) => bTag.toLowerCase())
              .includes(tag.replace("#", ""))
      )
        return false;
    }
    return true;
  }

  function checkValidCreator(creatorName: HTMLAnchorElement) {
    const creator = creatorName.innerText.trim().toLowerCase();
    return !(blockedCreators.map((cr) => cr.toLowerCase()).includes(creator) ||
        blockedCreators
            .map((cr) => cr.toLowerCase())
            .includes(creator.replace("@", "")));

  }

  // If all checks pass, return true
  return true;
}

// ------------------------------
// INITIATION AND SETTINGS FETCH
// ------------------------------
(function initiate() {
  browser.storage.local.get(["applicationIsOn"]).then((result) => {
    if (result["applicationIsOn"] == null) return startAutoScrolling();
    if (result["applicationIsOn"]) startAutoScrolling();
  });

  checkForNewShort();
  checkApplicationState();

  setInterval(checkForNewShort, RETRY_DELAY_MS);

  function checkApplicationState() {
    browser.storage.local.get(["applicationIsOn"]).then((result) => {
      if (applicationIsOn && result["applicationIsOn"] === false) {
        stopAutoScrolling();
      } else if (result["applicationIsOn"] === true) {
        startAutoScrolling();
      }
    });
  }

  (function onApplicationChange() {
    browser.storage.onChanged.addListener((changes) => {
      if (changes["applicationIsOn"]?.newValue) {
        startAutoScrolling();
      } else if (changes["applicationIsOn"]?.newValue === false) {
        stopAutoScrolling();
      }
    });
  })();

  (function getAllSettings() {
    browser.storage.local.get(
        [
          "shortCutKeys",
          "shortCutInteractKeys",
          "scrollDirection",
          "amountOfPlaysToSkip",
          "filterByMinLength",
          "filterByMaxLength",
          "filterByMinViews",
          "filterByMaxViews",
          "filterByMinLikes",
          "filterByMaxLikes",
          "filterByMinComments",
          "filterByMaxComments",
          "filteredAuthors",
          "filteredTags",
          "scrollOnComments",
          "scrollOnNoTags",
          "whitelistedAuthors",
          "additionalScrollDelay",
        ]
    ).then((result) => {
          console.log("[Auto Youtube Shorts Scroller]", {
            AutoYTScrollerSettings: result,
          });
          if (result["shortCutKeys"])
            shortCutToggleKeys = [...result["shortCutKeys"]];
          if (result["shortCutInteractKeys"])
            shortCutInteractKeys = [...result["shortCutInteractKeys"]];
          if (result["scrollDirection"]) {
            if (result["scrollDirection"] === "up") scrollDirection = -1;
            else scrollDirection = 1;
          }
          if (result["amountOfPlaysToSkip"])
            amountOfPlaysToSkip = result["amountOfPlaysToSkip"];
          if (result["scrollOnComments"])
            scrollOnCommentsCheck = result["scrollOnComments"];
          if (result["filterByMinLength"])
            filterMinLength = result["filterByMinLength"];
          if (result["filterByMaxLength"])
            filterMaxLength = result["filterByMaxLength"];
          if (result["filterByMinViews"])
            filterMinViews = result["filterByMinViews"];
          if (result["filterByMaxViews"])
            filterMaxViews = result["filterByMaxViews"];
          if (result["filterByMinLikes"])
            filterMinLikes = result["filterByMinLikes"];
          if (result["filterByMaxLikes"])
            filterMaxLikes = result["filterByMaxLikes"];
          if (result["filterByMinComments"])
            filterMinComments = result["filterByMinComments"];
          if (result["filterByMaxComments"])
            filterMaxComments = result["filterByMaxComments"];
          if (result["filteredAuthors"])
            blockedCreators = [...result["filteredAuthors"]];
          if (result["filteredTags"]) blockedTags = [...result["filteredTags"]];
          if (result["whitelistedAuthors"])
            whitelistedCreators = [...result["whitelistedAuthors"]];
          if (result["scrollOnNoTags"]) scrollOnNoTags = result["scrollOnNoTags"];
          if (result["additionalScrollDelay"])
            additionalScrollDelay = result["additionalScrollDelay"];

          shortCutListener();
        }
    );
    browser.storage.onChanged.addListener(async (result) => {
      let newShortCutKeys = result["shortCutKeys"]?.newValue;
      if (newShortCutKeys != undefined) {
        shortCutToggleKeys = [...newShortCutKeys];
      }
      let newShortCutInteractKeys = result["shortCutInteractKeys"]?.newValue;
      if (newShortCutInteractKeys != undefined) {
        shortCutInteractKeys = [...newShortCutInteractKeys];
      }
      let newScrollDirection = result["scrollDirection"]?.newValue;
      if (newScrollDirection != undefined) {
        if (newScrollDirection === "up") scrollDirection = -1;
        else scrollDirection = 1;
      }
      let newAmountOfPlaysToSkip = result["amountOfPlaysToSkip"]?.newValue;
      if (newAmountOfPlaysToSkip) {
        amountOfPlaysToSkip = newAmountOfPlaysToSkip;
      }
      let newScrollOnComments = result["scrollOnComments"]?.newValue;
      if (newScrollOnComments !== undefined) {
        scrollOnCommentsCheck = newScrollOnComments;
      }
      let newFilterMinLength = result["filterByMinLength"]?.newValue;
      if (newFilterMinLength != undefined) {
        filterMinLength = newFilterMinLength;
      }
      let newFilterMaxLength = result["filterByMaxLength"]?.newValue;
      if (newFilterMaxLength != undefined) {
        filterMaxLength = newFilterMaxLength;
      }
      let newFilterMinViews = result["filterByMinViews"]?.newValue;
      if (newFilterMinViews != undefined) {
        filterMinViews = newFilterMinViews;
      }
      let newFilterMaxViews = result["filterByMaxViews"]?.newValue;
      if (newFilterMaxViews != undefined) {
        filterMaxViews = newFilterMaxViews;
      }
      let newFilterMinLikes = result["filterByMinLikes"]?.newValue;
      if (newFilterMinLikes != undefined) {
        filterMinLikes = newFilterMinLikes;
      }
      let newFilterMaxLikes = result["filterByMaxLikes"]?.newValue;
      if (newFilterMaxLikes != undefined) {
        filterMaxLikes = newFilterMaxLikes;
      }
      let newFilterMinComments = result["filterByMinComments"]?.newValue;
      if (newFilterMinComments != undefined) {
        filterMinComments = newFilterMinComments;
      }
      let newFilterMaxComments = result["filterByMaxComments"]?.newValue;
      if (newFilterMaxComments != undefined) {
        filterMaxComments = newFilterMaxComments;
      }
      let newBlockedCreators = result["filteredAuthors"]?.newValue;
      if (newBlockedCreators != undefined) {
        blockedCreators = [...newBlockedCreators];
      }
      let newBlockedTags = result["filteredTags"]?.newValue;
      if (newBlockedTags != undefined) {
        blockedTags = [...result["filteredTags"]?.newValue];
      }
      let newWhiteListedCreators = result["whitelistedAuthors"]?.newValue;
      if (newWhiteListedCreators != undefined) {
        whitelistedCreators = [...newWhiteListedCreators];
      }
      let newScrollOnNoTags = result["scrollOnNoTags"]?.newValue;
      if (newScrollOnNoTags !== undefined) {
        scrollOnNoTags = newScrollOnNoTags;
      }
      let newAdditionalScrollDelay = result["additionalScrollDelay"]?.newValue;
      if (newAdditionalScrollDelay !== undefined) {
        additionalScrollDelay = newAdditionalScrollDelay;
      }
      if (!(await checkShortValidity(findShortContainer(currentShortId)))) {
        await scrollToNextShort(currentShortId);
      }
    });
  })();
})();

function shortCutListener() {
  let pressedKeys = [];
  // Web Dev Simplifed Debounce
  function debounce(cb: Function, delay: number) {
    let timeout: number;

    return (...args: any) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        cb(...args);
      }, delay);
    };
  }

  const checkKeys = (
      keysToCheck: string[],
      waitDebounce: boolean = true,
      delay: number = 700
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      function debounceCB() {
        if (pressedKeys.length == keysToCheck.length) {
          let match = true;
          for (let i = 0; i < pressedKeys.length; i++) {
            if (pressedKeys[i] != keysToCheck[i]) {
              match = false;
              break;
            }
          }
          resolve(match);
        } else resolve(false);
      }
      if (waitDebounce) debounce(debounceCB, delay)();
      else debounceCB();
    });
  };

  document.addEventListener("keydown", async (e) => {
    if (!e.key) return;
    pressedKeys.push(e.key.toLowerCase());
    // Shortcut for toggle application on/off
    if (await checkKeys(shortCutToggleKeys)) {
      if (applicationIsOn) {
        stopAutoScrolling();
        await browser.storage.local.set({
          applicationIsOn: false,
        });
      } else {
        startAutoScrolling();
        await browser.storage.local.set({
          applicationIsOn: true,
        });
      }
    } else if (await checkKeys(shortCutInteractKeys, false)) {
      // Shortcut for like/dislike
      const likeBtn = document.querySelector(
          LIKE_BUTTON_SELECTOR
      ) as HTMLButtonElement;
      const dislikeBtn = document.querySelector(
          DISLIKE_BUTTON_SELECTOR
      ) as HTMLButtonElement;

      if (
          likeBtn?.getAttribute("aria-pressed") === "true" ||
          dislikeBtn?.getAttribute("aria-pressed") === "true"
      ) {
        dislikeBtn.click();
      } else {
        likeBtn.click();
      }
    }
    pressedKeys = [];
  });
}

function isShortsPage() {
  let containsShortElements = false;

  const doesPageHaveAShort = document.querySelector(
      VIDEOS_LIST_SELECTORS.join(",")
  ) as HTMLDivElement;
  if (doesPageHaveAShort) containsShortElements = true;

  return containsShortElements;
}

function parseTextToNumber(text: string): number {
  text = text.trim().toLowerCase();

  if (text.endsWith("k")) {
    return parseFloat(text) * 1_000;
  }
  if (text.endsWith("m")) {
    return parseFloat(text) * 1_000_000;
  }

  return parseInt(text.replace(/,/g, "")) || 0; // Handle normal numbers like "933"
}
