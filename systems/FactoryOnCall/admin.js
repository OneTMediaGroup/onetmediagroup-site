// -------------------------------------------------------------
// FACTORY ON CALL — ADMIN PANEL
// Full Admin: Stations + Call Buttons + Roles + Users
// -------------------------------------------------------------

const COMPANY_ID = "demo-company";
const COMPANY_NAME = "Demo Company";

(async function () {
  // ---------- LOAD FIREBASE COMPAT IF NEEDED ----------
  async function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => {
        s.dataset.loaded = "true";
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  if (!window.firebase) {
    await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
    await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js");
  }

  // ---------- FIREBASE INIT ----------
  const firebaseConfig = {
    apiKey: "AIzaSyD5n-Ykf5LoYE_2u0pbRKfektav75GZIZE",
    authDomain: "factoryoncall.firebaseapp.com",
    projectId: "factoryoncall",
    storageBucket: "factoryoncall.firebasestorage.app",
    messagingSenderId: "586355508568",
    appId: "1:586355508568:web:40c4803ef1fd749811512d"
  };

  const app = firebase.apps.length
    ? firebase.app()
    : firebase.initializeApp(firebaseConfig);

  const db = app.firestore();

  const companyRef = db.collection("companies").doc(COMPANY_ID);
  const stationsRef = companyRef.collection("stations");
  const rolesRef = companyRef.collection("roles");
  const usersRef = companyRef.collection("users");

  // ---------- CONNECTION STATUS ----------
  const connDot = document.getElementById("firebaseStatusDot");
  const connLabel = document.getElementById("firebaseStatusText");

  function setConn(ok) {
    if (connDot) connDot.style.background = ok ? "#22c55e" : "#ef4444";
    if (connLabel) connLabel.textContent = ok ? "Online" : "Offline";
  }

  // ---------- SIDEBAR / TABS ----------
  const navItems = document.querySelectorAll(".nav-item");
  const tabs = document.querySelectorAll(".tab");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");

  function tabTitle(tabName) {
    const map = {
      dashboard: "Dashboard",
      callbuttons: "Call Buttons",
      logs: "Call Logs",
      users: "Users",
      stations: "Stations",
      roles: "Roles & Permissions",
      branding: "Branding",
      settings: "System Settings",
      analytics: "Analytics"
    };
    return map[tabName] || tabName;
  }

  function tabSubtitle(tabName) {
    const map = {
      dashboard: "Live overview of your factory call system.",
      callbuttons: "Generate call station URLs and static files.",
      logs: "Review and export call history.",
      users: "Manage users and login credentials.",
      stations: "Manage factory call stations.",
      roles: "Configure role-based permissions.",
      branding: "Customize branding and color system.",
      settings: "Adjust system-wide behavior.",
      analytics: "Analyze performance and usage trends."
    };
    return map[tabName] || "";
  }

  function activateTab(tabName) {
    tabs.forEach(tab => tab.classList.remove("active"));
    navItems.forEach(btn => btn.classList.remove("active"));

    const tab = document.getElementById(`tab-${tabName}`);
    const btn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);

    if (tab) tab.classList.add("active");
    if (btn) btn.classList.add("active");
    if (pageTitle) pageTitle.textContent = tabTitle(tabName);
    if (pageSubtitle) pageSubtitle.textContent = tabSubtitle(tabName);
  }

  function initTabs() {
    navItems.forEach(btn => {
      btn.addEventListener("click", () => {
        const tabName = btn.dataset.tab;
        if (tabName) activateTab(tabName);
      });
    });

    activateTab("dashboard");
  }

  // ---------- HELPERS ----------
  function buildCallUrl(stationName, cells) {
    const base = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "call.html")}`;
    const params = new URLSearchParams({
      station: stationName || "",
      cells: Array.isArray(cells) ? cells.join(",") : "",
      companyName: COMPANY_NAME
    });
    return `${base}?${params.toString()}`;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied.");
    } catch (err) {
      console.error(err);
      alert("Could not copy.");
    }
  }

  // ---------- DOM ----------
  const stationsTableBody = document.getElementById("stationsTableBody");
  const stationSearch = document.getElementById("stationSearch");
  const stationForm = document.getElementById("stationForm");
  const stationId = document.getElementById("stationId");
  const stationName = document.getElementById("stationName");
  const stationDescription = document.getElementById("stationDescription");
  const stationCells = document.getElementById("stationCells");
  const stationActive = document.getElementById("stationActive");
  const stationFormTitle = document.getElementById("stationFormTitle");
  const stationFormReset = document.getElementById("stationFormReset");

  const cbStation = document.getElementById("cbStation");
  const cbCells = document.getElementById("cbCells");
  const cbDepartment = document.getElementById("cbDepartment");
  const cbOutput = document.getElementById("cbOutput");
  const btnGenerateDynamic = document.getElementById("btnGenerateDynamic");
  const btnCopyOutput = document.getElementById("btnCopyOutput");

  const cbAutoStation = document.getElementById("cbAutoStation");
  const cbAutoOutput = document.getElementById("cbAutoOutput");
  const btnGenerateAllDynamic = document.getElementById("btnGenerateAllDynamic");

  const rolesTableBody = document.getElementById("rolesTableBody");
  const roleForm = document.getElementById("roleForm");
  const roleId = document.getElementById("roleId");
  const roleName = document.getElementById("roleName");
  const roleFormTitle = document.getElementById("roleFormTitle");
  const roleFormReset = document.getElementById("roleFormReset");

  const usersTableBody = document.getElementById("usersTableBody");
  const userSearch = document.getElementById("userSearch");
  const userForm = document.getElementById("userForm");
  const userId = document.getElementById("userId");
  const userFirstName = document.getElementById("userFirstName");
  const userLastName = document.getElementById("userLastName");
  const userDept = document.getElementById("userDept");
  const userRole = document.getElementById("userRole");
  const userUID = document.getElementById("userUID");
  const userPin = document.getElementById("userPin");
  const userActive = document.getElementById("userActive");
  const userFormTitle = document.getElementById("userFormTitle");
  const userFormReset = document.getElementById("userFormReset");

  const statTotalCalls = document.getElementById("statTotalCalls");
  const statActiveCalls = document.getElementById("statActiveCalls");
  const statClosedCalls = document.getElementById("statClosedCalls");
  const dashQuickList = document.getElementById("dashQuickList");

  const permissionCheckboxes = document.querySelectorAll("input[data-permission]");

  let cachedStations = [];
  let cachedRoles = [];
  let cachedUsers = [];

  // ---------- STATIONS ----------
  function renderStations(rows) {
    if (!stationsTableBody) return;

    stationsTableBody.innerHTML = "";

    rows.forEach(row => {
      const s = row.data;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.name || ""}</td>
        <td>${s.description || ""}</td>
        <td>${Array.isArray(s.cells) ? s.cells.join(", ") : ""}</td>
        <td>${s.active ? "Yes" : "No"}</td>
        <td>
          <button class="btn small secondary edit-station-btn" data-id="${row.id}">Edit</button>
          <button class="btn small copy-station-link-btn" data-url="${buildCallUrl(s.name || "", s.cells || [])}">Copy Link</button>
          <button class="btn small secondary open-station-link-btn" data-url="${buildCallUrl(s.name || "", s.cells || [])}">Open</button>
        </td>
      `;
      stationsTableBody.appendChild(tr);
    });

    wireStationTableButtons();
  }

  function wireStationTableButtons() {
    document.querySelectorAll(".edit-station-btn").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const found = cachedStations.find(x => x.id === id);
        if (!found) return;

        const s = found.data;
        if (stationId) stationId.value = found.id;
        if (stationName) stationName.value = s.name || "";
        if (stationDescription) stationDescription.value = s.description || "";
        if (stationCells) stationCells.value = Array.isArray(s.cells) ? s.cells.join(",") : "";
        if (stationActive) stationActive.checked = !!s.active;
        if (stationFormTitle) stationFormTitle.textContent = "Edit Station";
        activateTab("stations");
      };
    });

    document.querySelectorAll(".copy-station-link-btn").forEach(btn => {
      btn.onclick = async () => {
        const url = btn.dataset.url;
        if (!url) return;
        await copyText(url);
      };
    });

    document.querySelectorAll(".open-station-link-btn").forEach(btn => {
      btn.onclick = () => {
        const url = btn.dataset.url;
        if (!url) return;
        window.open(url, "_blank");
      };
    });
  }

  function resetStationForm() {
    if (stationForm) stationForm.reset();
    if (stationId) stationId.value = "";
    if (stationFormTitle) stationFormTitle.textContent = "Add Station";
    if (stationActive) stationActive.checked = true;
  }

  // ---------- CALL BUTTONS ----------
  function populateCallButtonStations(rows) {
    if (cbStation) cbStation.innerHTML = "";
    if (cbAutoStation) cbAutoStation.innerHTML = "";
    if (cbDepartment) cbDepartment.innerHTML = `<option value="">None</option>`;

    rows.forEach(row => {
      const s = row.data;

      const opt1 = document.createElement("option");
      opt1.value = row.id;
      opt1.textContent = s.name || row.id;
      cbStation?.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = row.id;
      opt2.textContent = s.name || row.id;
      cbAutoStation?.appendChild(opt2);
    });

    populateCellsForSelectedStation();
  }

  function populateCellsForSelectedStation() {
    if (!cbStation || !cbCells) return;

    const id = cbStation.value;
    const found = cachedStations.find(x => x.id === id);

    cbCells.innerHTML = "";
    if (!found) return;

    (found.data.cells || []).forEach(cell => {
      const opt = document.createElement("option");
      opt.value = cell;
      opt.textContent = cell;
      cbCells.appendChild(opt);
    });
  }

  // ---------- ROLES ----------
  function renderRoles(rows) {
    if (!rolesTableBody) return;

    rolesTableBody.innerHTML = "";

    rows.forEach(row => {
      const r = row.data;
      const permissions = Object.entries(r.permissions || {})
        .filter(([, value]) => !!value)
        .map(([key]) => key)
        .join(", ");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.name || ""}${r.isCallable ? " (Callable)" : ""}</td>
        <td>${permissions || "—"}</td>
        <td>
          <button class="btn small secondary edit-role-btn" data-id="${row.id}">Edit</button>
        </td>
      `;
      rolesTableBody.appendChild(tr);
    });

    wireRoleTableButtons();
    populateRoleOptions();
  }

  function wireRoleTableButtons() {
    document.querySelectorAll(".edit-role-btn").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const found = cachedRoles.find(x => x.id === id);
        if (!found) return;

        const r = found.data;
        if (roleId) roleId.value = found.id;
        if (roleName) roleName.value = r.name || "";
        if (roleFormTitle) roleFormTitle.textContent = "Edit Role";

        permissionCheckboxes.forEach(cb => {
          const perm = cb.getAttribute("data-permission");
          cb.checked = !!(r.permissions && r.permissions[perm]);
        });

        activateTab("roles");
      };
    });
  }

  function resetRoleForm() {
    if (roleForm) roleForm.reset();
    if (roleId) roleId.value = "";
    if (roleFormTitle) roleFormTitle.textContent = "Add Role";
    permissionCheckboxes.forEach(cb => {
      cb.checked = false;
    });
  }

  function populateRoleOptions() {
    if (!userRole) return;

    const currentValue = userRole.value;
    userRole.innerHTML = "";

    cachedRoles
      .slice()
      .sort((a, b) => (a.data.name || "").localeCompare(b.data.name || ""))
      .forEach(row => {
        const opt = document.createElement("option");
        opt.value = row.data.name || "";
        opt.textContent = row.data.name || "";
        userRole.appendChild(opt);
      });

    if (currentValue) userRole.value = currentValue;
  }

  // ---------- USERS ----------
  function populateDeptOptions() {
    if (!userDept) return;

    const currentValue = userDept.value;
    const deptSet = new Set();

    cachedStations.forEach(row => {
      const desc = row.data.description || "";
      if (desc) deptSet.add(desc);
    });

    userDept.innerHTML = "";

    Array.from(deptSet)
      .sort((a, b) => a.localeCompare(b))
      .forEach(dept => {
        const opt = document.createElement("option");
        opt.value = dept;
        opt.textContent = dept;
        userDept.appendChild(opt);
      });

    if (currentValue) userDept.value = currentValue;
  }

  function renderUsers(rows) {
    if (!usersTableBody) return;

    usersTableBody.innerHTML = "";

    rows.forEach(row => {
      const u = row.data;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.firstName || ""}</td>
        <td>${u.lastName || ""}</td>
        <td>${u.email || ""}</td>
        <td>${u.dept || ""}</td>
        <td>${u.role || ""}</td>
        <td>${u.active ? "Yes" : "No"}</td>
        <td>
          <button class="btn small secondary edit-user-btn" data-id="${row.id}">Edit</button>
        </td>
      `;
      usersTableBody.appendChild(tr);
    });

    wireUserTableButtons();
  }

  function wireUserTableButtons() {
    document.querySelectorAll(".edit-user-btn").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const found = cachedUsers.find(x => x.id === id);
        if (!found) return;

        const u = found.data;
        if (userId) userId.value = found.id;
        if (userFirstName) userFirstName.value = u.firstName || "";
        if (userLastName) userLastName.value = u.lastName || "";
        if (userDept) userDept.value = u.dept || "";
        if (userRole) userRole.value = u.role || "";
        if (userUID) userUID.value = u.uid || "";
        if (userPin) userPin.value = u.pin || "";
        if (userActive) userActive.checked = !!u.active;
        if (userFormTitle) userFormTitle.textContent = "Edit User";
        activateTab("users");
      };
    });
  }

  function resetUserForm() {
    if (userForm) userForm.reset();
    if (userId) userId.value = "";
    if (userFormTitle) userFormTitle.textContent = "Add User";
    if (userActive) userActive.checked = true;
  }

  // ---------- EVENT WIRING ----------
  function wireEvents() {
    // Stations
    stationForm?.addEventListener("submit", async e => {
      e.preventDefault();

      const payload = {
        companyId: COMPANY_ID,
        name: stationName?.value.trim() || "",
        description: stationDescription?.value.trim() || "",
        cells: (stationCells?.value || "")
          .split(",")
          .map(x => x.trim())
          .filter(Boolean),
        active: !!stationActive?.checked,
        updatedAt: Date.now()
      };

      if (!payload.name) {
        alert("Station name is required.");
        return;
      }

      try {
        if (stationId?.value) {
          await stationsRef.doc(stationId.value).update(payload);
        } else {
          payload.createdAt = Date.now();
          await stationsRef.add(payload);
        }

        resetStationForm();
      } catch (err) {
        console.error(err);
        alert("Could not save station.");
      }
    });

    stationFormReset?.addEventListener("click", resetStationForm);

    stationSearch?.addEventListener("input", () => {
      const q = stationSearch.value.trim().toLowerCase();
      if (!q) {
        renderStations(cachedStations);
        return;
      }

      const filtered = cachedStations.filter(x => {
        const s = x.data;
        return [
          s.name || "",
          s.description || "",
          Array.isArray(s.cells) ? s.cells.join(" ") : ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });

      renderStations(filtered);
    });

    // Call Buttons
    cbStation?.addEventListener("change", populateCellsForSelectedStation);

    btnGenerateDynamic?.addEventListener("click", () => {
      const stationIdValue = cbStation?.value;
      const found = cachedStations.find(x => x.id === stationIdValue);
      if (!found) {
        alert("Select a station.");
        return;
      }

      const selectedCells = Array.from(cbCells.selectedOptions).map(o => o.value);
      const url = buildCallUrl(found.data.name || "", selectedCells);

      if (cbOutput) cbOutput.value = url;
    });

    btnCopyOutput?.addEventListener("click", async () => {
      if (!cbOutput?.value) return;
      await copyText(cbOutput.value);
    });

    btnGenerateAllDynamic?.addEventListener("click", () => {
      const stationIdValue = cbAutoStation?.value;
      const found = cachedStations.find(x => x.id === stationIdValue);
      if (!found) {
        alert("Select a station.");
        return;
      }

      const cells = found.data.cells || [];
      const lines = cells.map(cell => buildCallUrl(found.data.name || "", [cell]));
      if (cbAutoOutput) cbAutoOutput.value = lines.join("\n");
    });

    // Roles
    roleForm?.addEventListener("submit", async e => {
      e.preventDefault();

      const permissions = {};
      permissionCheckboxes.forEach(cb => {
        const perm = cb.getAttribute("data-permission");
        if (!perm) return;
        permissions[perm] = cb.checked;
      });

      const payload = {
        companyId: COMPANY_ID,
        name: roleName?.value.trim() || "",
        permissions,
        isCallable: !!permissions.makeCall,
        active: true,
        updatedAt: Date.now()
      };

      if (!payload.name) {
        alert("Role name is required.");
        return;
      }

      try {
        if (roleId?.value) {
          await rolesRef.doc(roleId.value).update(payload);
        } else {
          payload.createdAt = Date.now();
          await rolesRef.add(payload);
        }

        resetRoleForm();
      } catch (err) {
        console.error(err);
        alert("Could not save role.");
      }
    });

    roleFormReset?.addEventListener("click", resetRoleForm);

    // Users
    userForm?.addEventListener("submit", async e => {
      e.preventDefault();

      const payload = {
        companyId: COMPANY_ID,
        firstName: userFirstName?.value.trim() || "",
        lastName: userLastName?.value.trim() || "",
        email: "",
        dept: userDept?.value || "",
        role: userRole?.value || "",
        uid: userUID?.value.trim() || "",
        pin: userPin?.value.trim() || "",
        active: !!userActive?.checked,
        updatedAt: Date.now()
      };

      if (!payload.firstName || !payload.lastName) {
        alert("First and last name are required.");
        return;
      }

      if (!payload.uid) {
        alert("User ID is required.");
        return;
      }

      if (!payload.pin) {
        alert("PIN is required.");
        return;
      }

      try {
        if (userId?.value) {
          await usersRef.doc(userId.value).update(payload);
        } else {
          payload.createdAt = Date.now();
          await usersRef.add(payload);
        }

        resetUserForm();
      } catch (err) {
        console.error(err);
        alert("Could not save user.");
      }
    });

    userFormReset?.addEventListener("click", resetUserForm);

    userSearch?.addEventListener("input", () => {
      const q = userSearch.value.trim().toLowerCase();
      if (!q) {
        renderUsers(cachedUsers);
        return;
      }

      const filtered = cachedUsers.filter(x => {
        const u = x.data;
        return [
          u.firstName || "",
          u.lastName || "",
          u.email || "",
          u.dept || "",
          u.role || "",
          u.uid || ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });

      renderUsers(filtered);
    });
  }

  // ---------- DASHBOARD PLACEHOLDERS ----------
  function initPlaceholders() {
    if (statTotalCalls) statTotalCalls.textContent = "0";
    if (statActiveCalls) statActiveCalls.textContent = "0";
    if (statClosedCalls) statClosedCalls.textContent = "0";
    if (dashQuickList) {
      dashQuickList.innerHTML = `
        <li>Stations loaded from company structure.</li>
        <li>Roles and users are now company-scoped.</li>
        <li>Call buttons generate live URLs.</li>
      `;
    }
  }

  // ---------- FIRESTORE LISTENERS ----------
  function initListeners() {
    try {
      stationsRef.orderBy("name").onSnapshot(
        snapshot => {
          setConn(true);

          cachedStations = snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }));

          renderStations(cachedStations);
          populateCallButtonStations(cachedStations);
          populateDeptOptions();
        },
        err => {
          console.error("Stations listener error:", err);
          setConn(false);
        }
      );

      rolesRef.orderBy("name").onSnapshot(
        snapshot => {
          cachedRoles = snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }));

          renderRoles(cachedRoles);
        },
        err => {
          console.error("Roles listener error:", err);
        }
      );

      usersRef.orderBy("firstName").onSnapshot(
        snapshot => {
          cachedUsers = snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }));

          renderUsers(cachedUsers);
        },
        err => {
          console.error("Users listener error:", err);
        }
      );
    } catch (err) {
      console.error("Listener setup failed:", err);
      setConn(false);
    }
  }

  // ---------- BOOT ----------
  function boot() {
    setConn(false);
    initTabs();
    initPlaceholders();
    wireEvents();
    initListeners();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
