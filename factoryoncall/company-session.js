const COMPANY_STORAGE_KEY = "factory_on_call_active_company_id";
const COMPANY_NAME_KEY = "factory_on_call_company_name";

export function getCompanyIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("companyId") || params.get("company") || "";
}

export function getActiveCompanyId() {
  const urlCompanyId = getCompanyIdFromUrl();

  if (urlCompanyId) {
    setActiveCompanyId(urlCompanyId);
    return urlCompanyId;
  }

  return localStorage.getItem(COMPANY_STORAGE_KEY) || "demo-company";
}

export function setActiveCompanyId(companyId) {
  if (!companyId) return;
  localStorage.setItem(COMPANY_STORAGE_KEY, companyId);
}

export function getCompanyNameFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("companyName") || "";
}

export function getActiveCompanyName(defaultName = "Factory On Call") {
  const urlName = getCompanyNameFromUrl();

  if (urlName) {
    localStorage.setItem(COMPANY_NAME_KEY, urlName);
    return urlName;
  }

  return localStorage.getItem(COMPANY_NAME_KEY) || defaultName;
}

export function buildCompanyLink(page, companyId = getActiveCompanyId()) {
  const url = new URL(page, window.location.href);
  url.searchParams.delete("company");
  if (companyId) url.searchParams.set("companyId", companyId);
  return url.toString();
}

export function buildRelativeCompanyLink(page, companyId = getActiveCompanyId()) {
  const url = new URL(page, window.location.href);
  url.searchParams.delete("company");
  if (companyId) url.searchParams.set("companyId", companyId);
  return `${url.pathname.split("/").pop()}${url.search}`;
}

export function companyAccessPages() {
  return [
    {
      label: "Admin Console",
      page: "admin.html",
      description: "Manage company setup, users, stations, roles, and branding."
    },
    {
      label: "Call Station",
      page: "call.html",
      description: "Shop-floor call button station for employees."
    },
    {
      label: "Viewer",
      page: "viewer.html",
      description: "Supervisor / support team call management view."
    },
    {
      label: "Display Board",
      page: "display.html",
      description: "TV display board for open calls and response visibility."
    }
  ];
}