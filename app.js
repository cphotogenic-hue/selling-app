const state = {
  listings: loadListings(),
  activeId: null,
  photos: [],
  approved: false
};

const DEFAULT_ZIP = "98271";
const IS_LOCAL_PHONE_SERVER = location.hostname.startsWith("192.168.") || location.hostname === "localhost";
const MAX_PHOTOS = IS_LOCAL_PHONE_SERVER ? 1 : 4;

const $ = (selector) => document.querySelector(selector);
const elements = {
  aiStatus: $("#aiStatus"),
  installBtn: $("#installBtn"),
  googleKeyBtn: $("#googleKeyBtn"),
  pageTitle: $("#pageTitle"),
  listingList: $("#listingList"),
  newListingBtn: $("#newListingBtn"),
  freshStartBtn: $("#freshStartBtn"),
  cameraPreview: $("#cameraPreview"),
  snapshotCanvas: $("#snapshotCanvas"),
  startCameraBtn: $("#startCameraBtn"),
  takePhotoBtn: $("#takePhotoBtn"),
  photoInput: $("#photoInput"),
  clearPhotosBtn: $("#clearPhotosBtn"),
  photoStrip: $("#photoStrip"),
  manualName: $("#manualName"),
  location: $("#location"),
  condition: $("#condition"),
  category: $("#category"),
  notes: $("#notes"),
  analyzeBtn: $("#analyzeBtn"),
  saveDraftBtn: $("#saveDraftBtn"),
  priceLow: $("#priceLow"),
  priceHigh: $("#priceHigh"),
  recommendedPrice: $("#recommendedPrice"),
  askingPrice: $("#askingPrice"),
  confidenceText: $("#confidenceText"),
  title: $("#title"),
  description: $("#description"),
  copyAllBtn: $("#copyAllBtn"),
  marketSearchBtn: $("#marketSearchBtn"),
  craigslistSearchBtn: $("#craigslistSearchBtn"),
  imageSearchBtn: $("#imageSearchBtn"),
  photoCheck: $("#photoCheck"),
  priceCheck: $("#priceCheck"),
  textCheck: $("#textCheck"),
  platformChoice: $("#platformChoice"),
  approveBtn: $("#approveBtn"),
  facebookBtn: $("#facebookBtn"),
  craigslistBtn: $("#craigslistBtn"),
  downloadBtn: $("#downloadBtn")
};

let installPrompt = null;
let autosaveTimer = null;

function loadListings() {
  try {
    return JSON.parse(localStorage.getItem("mla:listings") || "[]");
  } catch {
    return [];
  }
}

function persistListings() {
  localStorage.setItem("mla:listings", JSON.stringify(state.listings));
}

function getGoogleKey() {
  return localStorage.getItem("mla:googleKey") || "";
}

function setGoogleKey(key) {
  if (key) localStorage.setItem("mla:googleKey", key);
}

function saveCurrentWork() {
  try {
    const draft = currentDraft();
    localStorage.setItem("mla:current", JSON.stringify({ ...draft, photos: [] }));
  } catch {
    setStatus("Storage full");
  }
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveCurrentWork, 250);
}

function loadCurrentWork() {
  try {
    const draft = JSON.parse(localStorage.getItem("mla:current") || "null");
    if (draft) loadDraft(draft);
  } catch {
    localStorage.removeItem("mla:current");
  }
}

function dollars(value) {
  const number = Number(value || 0);
  return `$${Math.max(0, Math.round(number)).toLocaleString()}`;
}

function currentDraft() {
  return {
    id: state.activeId || crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
    photos: state.photos,
    manualName: elements.manualName.value.trim(),
    location: elements.location.value.trim() || DEFAULT_ZIP,
    condition: elements.condition.value,
    category: elements.category.value.trim(),
    notes: elements.notes.value.trim(),
    priceLow: Number(elements.priceLow.dataset.value || 0),
    priceHigh: Number(elements.priceHigh.dataset.value || 0),
    recommendedPrice: Number(elements.recommendedPrice.dataset.value || 0),
    askingPrice: Number(elements.askingPrice.value || 0),
    title: elements.title.value.trim(),
    description: elements.description.value.trim(),
    confidence: elements.confidenceText.textContent,
    approved: state.approved
  };
}

function loadDraft(draft) {
  state.activeId = draft.id;
  state.photos = draft.photos || [];
  state.approved = Boolean(draft.approved);
  elements.manualName.value = draft.manualName || "";
  elements.location.value = draft.location || DEFAULT_ZIP;
  elements.condition.value = draft.condition || "Good";
  elements.category.value = draft.category || "";
  elements.notes.value = draft.notes || "";
  setPrice(draft.priceLow, draft.priceHigh, draft.recommendedPrice);
  elements.askingPrice.value = draft.askingPrice || "";
  elements.title.value = draft.title || "";
  elements.description.value = draft.description || "";
  elements.confidenceText.textContent = draft.confidence || "Add photos and details for a stronger estimate.";
  elements.pageTitle.textContent = draft.title || "Create a listing";
  elements.photoCheck.checked = state.approved;
  elements.priceCheck.checked = state.approved;
  elements.textCheck.checked = state.approved;
  renderPhotos();
  renderListings();
  updatePublishButtons();
  saveCurrentWork();
}

function saveCurrentDraft() {
  const draft = currentDraft();
  state.activeId = draft.id;
  const storedDraft = { ...draft, photos: [] };
  const index = state.listings.findIndex((listing) => listing.id === draft.id);
  if (index >= 0) state.listings[index] = storedDraft;
  else state.listings.unshift(storedDraft);
  persistListings();
  saveCurrentWork();
  renderListings();
  elements.pageTitle.textContent = draft.title || draft.manualName || "Untitled listing";
  return draft;
}

function renderListings() {
  elements.listingList.innerHTML = "";
  if (!state.listings.length) {
    const empty = document.createElement("p");
    empty.className = "helper-text";
    empty.textContent = "No saved drafts yet.";
    elements.listingList.append(empty);
    return;
  }
  for (const listing of state.listings) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "listing-card";
    button.innerHTML = `<strong></strong><span></span>`;
    button.querySelector("strong").textContent = listing.title || listing.manualName || "Untitled listing";
    button.querySelector("span").textContent = `${dollars(listing.askingPrice || listing.recommendedPrice)} · ${listing.condition || "Condition"}`;
    button.addEventListener("click", () => loadDraft(listing));
    elements.listingList.append(button);
  }
}

function renderPhotos() {
  elements.photoStrip.innerHTML = "";
  if (!state.photos.length) {
    const empty = document.createElement("p");
    empty.className = "helper-text";
    empty.textContent = "Take or add photos to start identifying the item.";
    elements.photoStrip.append(empty);
    return;
  }
  const template = $("#photoTemplate");
  state.photos.forEach((photo, index) => {
    const node = template.content.cloneNode(true);
    const figure = node.querySelector(".thumb");
    node.querySelector("img").src = photo;
    figure.dataset.label = index === 0 ? "Main" : `Photo ${index + 1}`;
    node.querySelector("button").addEventListener("click", () => {
      state.photos.splice(index, 1);
      state.approved = false;
      renderPhotos();
      updatePublishButtons();
      saveCurrentWork();
    });
    elements.photoStrip.append(node);
  });
}

function setStatus(text) {
  elements.aiStatus.textContent = text;
}

function setPrice(low = 0, high = 0, recommended = 0) {
  elements.priceLow.dataset.value = low;
  elements.priceHigh.dataset.value = high;
  elements.recommendedPrice.dataset.value = recommended;
  elements.priceLow.textContent = dollars(low);
  elements.priceHigh.textContent = dollars(high);
  elements.recommendedPrice.textContent = dollars(recommended);
  elements.askingPrice.value = recommended ? Math.round(recommended) : "";
}

async function resizeImage(file) {
  if (!IS_LOCAL_PHONE_SERVER) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return dataUrl;
  }

  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: 260,
      resizeHeight: 260,
      resizeQuality: "low"
    });
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 260 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.32);
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return compressDataUrl(dataUrl);
}

async function compressDataUrl(dataUrl) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  const maxSide = 240;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.3);
}

async function addFiles(files) {
  if (!files?.length) return;
  if (state.photos.length >= MAX_PHOTOS) {
    alert(`This version allows ${MAX_PHOTOS} photo${MAX_PHOTOS === 1 ? "" : "s"}. Tap Clear if you want to retake.`);
    return;
  }
  setStatus("Processing photos");
  const existingPhotos = [...state.photos];
  try {
    for (const file of [...files]) {
      if (state.photos.length >= MAX_PHOTOS) break;
      const resized = await resizeImage(file);
      state.photos = [...state.photos, resized].slice(0, MAX_PHOTOS);
    }
  } catch {
    state.photos = existingPhotos;
    alert("That photo did not load. Please tap Add photos and try again.");
  }
  state.approved = false;
  renderPhotos();
  updatePublishButtons();
  setStatus("AI ready");
  elements.photoInput.value = "";
  saveCurrentWork();
}

async function startCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Tap Add photos instead. Your phone can take a picture from there.");
      setStatus("Use Add photos");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    elements.cameraPreview.srcObject = stream;
    setStatus("Camera on");
  } catch (error) {
    setStatus("Camera blocked");
    alert("Tap Add photos instead. Your phone can take a picture from there.");
  }
}

async function takePhoto() {
  const video = elements.cameraPreview;
  if (!video.srcObject) {
    await startCamera();
    return;
  }
  if (!video.videoWidth || !video.videoHeight) {
    alert("Tap Add photos instead. Your phone can take a picture from there.");
    return;
  }
  const canvas = elements.snapshotCanvas;
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 960;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  state.photos.push(await compressDataUrl(canvas.toDataURL("image/jpeg", 0.9)));
  state.approved = false;
  renderPhotos();
  updatePublishButtons();
  saveCurrentWork();
}

function fallbackDraft() {
  const name = elements.manualName.value.trim() || "Used item";
  const condition = elements.condition.value.toLowerCase();
  return {
    itemName: name,
    category: elements.category.value.trim() || "General",
    confidence: "Local fallback draft",
    conditionNotes: `${elements.condition.value}. ${elements.notes.value.trim()}`.trim(),
    priceLow: 20,
    priceHigh: 60,
    recommendedPrice: 35,
    title: `${name} - ${condition}`,
    description: `${name} in ${condition} condition.\n\n${elements.notes.value.trim()}\n\nPickup in ${elements.location.value.trim() || DEFAULT_ZIP}. Cash or agreed payment at pickup.`,
    searchTerms: [name, elements.location.value.trim() || DEFAULT_ZIP].filter(Boolean),
    safetyNotes: "Review the title, exact model, condition, and price before posting."
  };
}

async function analyzePhotos() {
  if (!state.photos.length && !elements.manualName.value.trim()) {
    alert("Add at least one photo or type an item name first.");
    return;
  }
  setStatus("AI analyzing");
  elements.analyzeBtn.disabled = true;
  try {
    if (location.protocol === "file:") {
      throw new Error("Open through the local server to connect Google AI. Using local draft mode for now.");
    }
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        images: state.photos.slice(0, MAX_PHOTOS),
        manualName: elements.manualName.value.trim(),
        condition: elements.condition.value,
        notes: elements.notes.value.trim(),
        location: elements.location.value.trim() || DEFAULT_ZIP,
        googleApiKey: getGoogleKey()
      })
    });
    if (!response.ok) {
      let message = "Google AI endpoint is not running. Local draft mode was used.";
      try {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          message = (await response.json()).error || message;
        }
      } catch {
        message = "Google AI endpoint is not running. Local draft mode was used.";
      }
      throw new Error(message);
    }
    applyAnalysis(await response.json());
  } catch (error) {
    applyAnalysis(fallbackDraft());
    elements.confidenceText.textContent = `Fallback draft used: ${error.message}`;
  } finally {
    elements.analyzeBtn.disabled = false;
    setStatus("AI ready");
    saveCurrentDraft();
  }
}

function applyAnalysis(result) {
  if (result.needsKey) {
    alert("Google AI is not connected yet. Tap Connect Google AI, paste your key, then analyze again.");
  }
  elements.manualName.value = result.itemName || elements.manualName.value;
  elements.category.value = result.category || elements.category.value;
  setPrice(result.priceLow, result.priceHigh, result.recommendedPrice);
  elements.title.value = result.title || "";
  elements.description.value = result.description || "";
  elements.confidenceText.textContent = `${result.confidence || "AI estimate"} · ${result.conditionNotes || ""} ${result.safetyNotes || ""}`.trim();
  state.approved = false;
  elements.photoCheck.checked = false;
  elements.priceCheck.checked = false;
  elements.textCheck.checked = false;
  updatePublishButtons();
  saveCurrentWork();
}

function getSearchQuery() {
  const terms = [elements.manualName.value, elements.category.value, elements.location.value].filter(Boolean).join(" ");
  return encodeURIComponent(terms || elements.title.value || "used item");
}

async function copyAd() {
  const draft = currentDraft();
  const text = `${draft.title}\n\nPrice: ${dollars(draft.askingPrice || draft.recommendedPrice)}\nCondition: ${draft.condition}\nCategory: ${draft.category}\nLocation: ${draft.location}\n\n${draft.description}`;
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Ad copied");
  } catch {
    setStatus("Ad ready");
  }
}

function approveListing() {
  if (!elements.photoCheck.checked || !elements.priceCheck.checked || !elements.textCheck.checked) {
    alert("Please check all approval boxes before enabling posting actions.");
    return;
  }
  state.approved = true;
  const draft = saveCurrentDraft();
  updatePublishButtons();
  setStatus(`Approved: ${draft.title || "listing"}`);
  loadChosenPlatform();
}

function updatePublishButtons() {
  const enabled = state.approved;
  elements.facebookBtn.disabled = !enabled;
  elements.craigslistBtn.disabled = !enabled;
  elements.downloadBtn.disabled = !enabled;
}

function downloadListing() {
  const draft = saveCurrentDraft();
  const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(draft.title || "listing").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function loadChosenPlatform() {
  const url = elements.platformChoice.value === "craigslist"
    ? "https://www.craigslist.org/about/sites"
    : "https://www.facebook.com/marketplace/create/item";
  const opened = window.open(url, "_blank", "noopener");
  await copyAd();
  if (elements.platformChoice.value === "craigslist") {
    if (!opened) window.location.href = url;
    return;
  }
  if (!opened) window.location.href = url;
}

function resetForm() {
  state.activeId = null;
  state.photos = [];
  state.approved = false;
  elements.manualName.value = "";
  elements.location.value = DEFAULT_ZIP;
  elements.condition.value = "Good";
  elements.category.value = "";
  elements.notes.value = "";
  setPrice(0, 0, 0);
  elements.title.value = "";
  elements.description.value = "";
  elements.confidenceText.textContent = "Add photos and details for a stronger estimate.";
  elements.pageTitle.textContent = "Create a listing";
  elements.photoCheck.checked = false;
  elements.priceCheck.checked = false;
  elements.textCheck.checked = false;
  renderPhotos();
  updatePublishButtons();
  saveCurrentWork();
}

elements.newListingBtn.addEventListener("click", resetForm);
elements.freshStartBtn.addEventListener("click", resetForm);
elements.googleKeyBtn.addEventListener("click", () => {
  const existing = getGoogleKey();
  const key = prompt("Paste your Google AI key here. It stays on this phone.", existing ? "saved" : "");
  if (!key || key === "saved") return;
  setGoogleKey(key.trim());
  setStatus("Google AI connected");
  alert("Google AI saved. Now tap Analyze photos again.");
});
elements.installBtn.addEventListener("click", async () => {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    setStatus("Install ready");
    return;
  }
  alert("On phone: open this page in Safari or Chrome, tap Share or menu, then tap Add to Home Screen.");
});
elements.startCameraBtn.addEventListener("click", startCamera);
elements.takePhotoBtn.addEventListener("click", takePhoto);
elements.photoInput.addEventListener("change", (event) => addFiles(event.target.files));
elements.clearPhotosBtn.addEventListener("click", () => {
  state.photos = [];
  state.approved = false;
  renderPhotos();
  updatePublishButtons();
  saveCurrentWork();
});
elements.analyzeBtn.addEventListener("click", analyzePhotos);
elements.saveDraftBtn.addEventListener("click", () => {
  saveCurrentDraft();
  setStatus("Draft saved");
});
elements.copyAllBtn.addEventListener("click", copyAd);
elements.marketSearchBtn.addEventListener("click", () => {
  window.open(`https://www.facebook.com/marketplace/search/?query=${getSearchQuery()}`, "_blank", "noopener");
});
elements.craigslistSearchBtn.addEventListener("click", () => {
  window.open(`https://www.craigslist.org/search/sss?query=${getSearchQuery()}`, "_blank", "noopener");
});
elements.imageSearchBtn.addEventListener("click", () => {
  window.open(`https://www.google.com/search?tbm=isch&q=${getSearchQuery()}`, "_blank", "noopener");
});
elements.approveBtn.addEventListener("click", approveListing);
elements.facebookBtn.addEventListener("click", async () => {
  elements.platformChoice.value = "facebook";
  await loadChosenPlatform();
});
elements.craigslistBtn.addEventListener("click", async () => {
  elements.platformChoice.value = "craigslist";
  await loadChosenPlatform();
});
elements.downloadBtn.addEventListener("click", downloadListing);
[elements.title, elements.description, elements.askingPrice].forEach((element) => {
  element.addEventListener("input", () => {
    state.approved = false;
    updatePublishButtons();
    scheduleAutosave();
  });
});

[
  elements.manualName,
  elements.location,
  elements.condition,
  elements.category,
  elements.notes,
  elements.platformChoice
].forEach((element) => {
  element.addEventListener("input", scheduleAutosave);
  element.addEventListener("change", scheduleAutosave);
});

renderListings();
renderPhotos();
updatePublishButtons();
if (!elements.location.value) elements.location.value = DEFAULT_ZIP;
loadCurrentWork();

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  elements.installBtn.textContent = "Install app";
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("/service-worker.js").catch(() => {});
}
