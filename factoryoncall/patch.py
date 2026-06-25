from pathlib import Path
root=Path('/mnt/data/foc')
# Strong emergency headers CSS append
admin_css=root/'admin.css'
admin_css.write_text(admin_css.read_text()+r'''

/* PATCH 159 — high-visibility plant emergency header */
@keyframes focEmergencyHeaderFlashStrong {
  0%, 100% { background: #b91c1c; box-shadow: 0 0 0 2px rgba(255,255,255,.55), 0 0 26px rgba(239,68,68,.70); }
  50% { background: #ef4444; box-shadow: 0 0 0 3px rgba(255,255,255,.95), 0 0 56px rgba(239,68,68,1); }
}
body.emergency-active .topbar {
  position: relative !important;
  min-height: 76px !important;
  background: #dc2626 !important;
  animation: focEmergencyHeaderFlashStrong .9s ease-in-out infinite !important;
  border-bottom: 4px solid #fff !important;
  outline: 3px solid #991b1b !important;
  z-index: 2000 !important;
}
body.emergency-active .topbar::before {
  content: "🚨  PLANT EMERGENCY ACTIVE";
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: #fff;
  -webkit-text-fill-color: #fff;
  font-weight: 1000;
  font-size: clamp(20px, 2.1vw, 34px);
  letter-spacing: .12em;
  text-transform: uppercase;
  text-shadow: 0 2px 0 rgba(0,0,0,.45), 0 0 14px rgba(255,255,255,.75);
  z-index: 3;
}
body.emergency-active .topbar-left,
body.emergency-active .topbar-right {
  opacity: .18 !important;
  filter: grayscale(1) contrast(1.4) !important;
}
body.emergency-active .admin-emergency-header-badge {
  display: none !important;
}
body.emergency-active .company-logo {
  background: transparent !important;
  border-radius: 0 !important;
}
@media (max-width: 760px) {
  body.emergency-active .topbar { min-height: 86px !important; }
  body.emergency-active .topbar::before { font-size: 17px; letter-spacing: .07em; padding: 0 68px; text-align: center; }
}

/* PATCH 159 — Emergency History analytics */
.analytics-emergency-grid { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-bottom: 14px; }
.analytics-emergency-card { border: 1px solid rgba(239,68,68,.45) !important; box-shadow: 0 12px 32px rgba(239,68,68,.12) !important; }
.analytics-emergency-card .analytics-summary-label { color: #991b1b !important; }
@media (max-width: 900px) { .analytics-emergency-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
@media (max-width: 520px) { .analytics-emergency-grid { grid-template-columns: 1fr; } }
''')

call_css=root/'call.css'
call_css.write_text(call_css.read_text()+r'''

/* PATCH 159 — high-visibility station emergency header */
@keyframes focStationHeaderFlashStrong159 {
  0%, 100% { background: #b91c1c; box-shadow: 0 0 0 2px rgba(255,255,255,.55), 0 0 28px rgba(239,68,68,.75); }
  50% { background: #ef4444; box-shadow: 0 0 0 3px rgba(255,255,255,.95), 0 0 58px rgba(239,68,68,1); }
}
body.emergency-active .app-header,
.app-header.station-emergency-header-active {
  position: relative !important;
  min-height: 78px !important;
  background: #dc2626 !important;
  animation: focStationHeaderFlashStrong159 .9s ease-in-out infinite !important;
  border-bottom: 4px solid #fff !important;
  outline: 3px solid #991b1b !important;
  z-index: 2000 !important;
}
body.emergency-active .app-header::after,
.app-header.station-emergency-header-active::after {
  content: "🚨  PLANT EMERGENCY ACTIVE";
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: #fff;
  -webkit-text-fill-color: #fff;
  font-weight: 1000;
  font-size: clamp(18px, 2.2vw, 32px);
  letter-spacing: .11em;
  text-transform: uppercase;
  text-shadow: 0 2px 0 rgba(0,0,0,.45), 0 0 14px rgba(255,255,255,.75);
  z-index: 5;
}
body.emergency-active .app-header > *,
.app-header.station-emergency-header-active > * {
  opacity: .20 !important;
  filter: grayscale(1) contrast(1.4) !important;
}
body.emergency-active .station-emergency-banner {
  display: block !important;
  background: #7f1d1d !important;
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
  border-top: 2px solid #fff !important;
  border-bottom: 2px solid #fff !important;
  box-shadow: 0 0 28px rgba(239,68,68,.8) !important;
  animation: focStationHeaderFlashStrong159 .9s ease-in-out infinite !important;
}
body.emergency-active .station-emergency-banner.hidden { display: none !important; }
@media (max-width: 760px) {
  body.emergency-active .app-header,
  .app-header.station-emergency-header-active { min-height: 86px !important; }
  body.emergency-active .app-header::after,
  .app-header.station-emergency-header-active::after { font-size: 16px; letter-spacing: .06em; padding: 0 66px; text-align: center; }
}
''')

# Patch admin.html analytics emergency section after summary grid
admin_html=root/'admin.html'
s=admin_html.read_text()
insert='''

                <div class="analytics-card analytics-emergency-card">
                    <h2>Emergency History</h2>
                    <p class="analytics-note">Plant emergency alerts in the selected range.</p>
                    <div class="analytics-emergency-grid">
                        <div class="analytics-summary-card"><span class="analytics-summary-label">Emergency Events</span><strong id="analyticsEmergencyCount">0</strong></div>
                        <div class="analytics-summary-card"><span class="analytics-summary-label">Average Duration</span><strong id="analyticsEmergencyAvgDuration">—</strong></div>
                        <div class="analytics-summary-card"><span class="analytics-summary-label">Longest Emergency</span><strong id="analyticsEmergencyLongest">—</strong></div>
                        <div class="analytics-summary-card"><span class="analytics-summary-label">Top Station</span><strong id="analyticsEmergencyTopStation">—</strong></div>
                    </div>
                    <div id="analyticsEmergencyHistoryList" class="analytics-detail-list"></div>
                </div>
'''
if 'analyticsEmergencyHistoryList' not in s:
    s=s.replace('''                <div class="analytics-grid-two">
                    <div class="analytics-card">''', insert+'''                <div class="analytics-grid-two">
                    <div class="analytics-card">''')
admin_html.write_text(s)
