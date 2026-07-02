/*************************************************************
 * InnoPulse Full-Scale — Corporate backend extension
 * The Growth System
 *
 * Add-on for the existing "InnoPulse Backend" Apps Script project
 * (bound to the "InnoPulse Assessment Results" spreadsheet).
 *
 * It writes multi-stakeholder corporate responses to a NEW tab
 * ("Corporate 360") in the SAME spreadsheet, and serves aggregated
 * reads to the InnoPulse Full-Scale admin dashboard. The existing public
 * lead flow is left completely untouched.
 *
 * ---------------------------------------------------------------
 * INSTALL (do this yourself — deploy + permissions are owner actions)
 * ---------------------------------------------------------------
 *  1) Open the InnoPulse Backend Apps Script project.
 *  2) Add a new script file (e.g. "Corporate360.gs") and paste this in.
 *  3) In your existing Code.gs, add ONE line at the very top of doPost(e),
 *     right after the payload is parsed into "data":
 *
 *         if (data && data.event === 'innopulse360_response') {
 *           return handle360Post(data);
 *         }
 *
 *     and ONE branch at the top of doGet(e):
 *
 *         if (e && e.parameter && e.parameter.mode === 'read360') {
 *           return read360(e.parameter.campaign || '');
 *         }
 *
 *  4) Run setup360Sheet() once to create the "Corporate 360" tab.
 *  5) Re-deploy the web app (Deploy > Manage deployments > Edit > New version).
 *  6) Put the web app URL into full-scale-config.js (frontend), e.g.:
 *         window.INNOPULSE_CONFIG = { endpoint: "PASTE_WEB_APP_URL" };
 *************************************************************/

var CORP_SHEET = 'Corporate 360';

/* The five ISO 56001-aligned pillars, in the order used by the frontend. */
var CORP_PILLARS = ['sii','iem','oic','ipm','roi'];

/* Column order for the Corporate 360 tab. One row per stakeholder response. */
function corp360Headers_() {
  var h = [
    'Timestamp','Record ID','Company','Campaign ID','Stakeholder Group','Stakeholder Label',
    'Respondent Name','Department / Role','Overall Score','Band'
  ];
  // pillar scores
  CORP_PILLARS.forEach(function(p){ h.push('Pillar: ' + p); });
  // per-pillar comments
  CORP_PILLARS.forEach(function(p){ h.push('Comment: ' + p); });
  // raw indicators (JSON blob — keeps the row compact, full detail preserved)
  h.push('Indicators (JSON)');
  return h;
}

function setup360Sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CORP_SHEET);
  if (!sh) sh = ss.insertSheet(CORP_SHEET);
  var headers = corp360Headers_();
  sh.getRange(1,1,1,headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#1c2400').setFontColor('#a8e617');
  sh.setFrozenRows(1);
  return 'Corporate 360 tab ready with ' + headers.length + ' columns.';
}

/* Append one corporate stakeholder response. Mirrors the public doPost style. */
function handle360Post(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(CORP_SHEET);
    if (!sh) { sh = ss.insertSheet(CORP_SHEET); setup360Sheet(); sh = ss.getSheetByName(CORP_SHEET); }

    var profile = data.profile || {};
    var ps = data.pillarScores || {};
    var comments = data.comments || {};

    var row = [
      new Date(),
      data.recordId || '',
      data.company || '',
      data.campaign || '',
      data.stakeholder || '',
      data.stakeholderLabel || '',
      profile.name || '',
      profile.dept || '',
      (data.overallScore == null ? '' : data.overallScore),
      data.band || ''
    ];
    CORP_PILLARS.forEach(function(p){ row.push(ps[p] == null ? '' : ps[p]); });
    CORP_PILLARS.forEach(function(p){ row.push(comments[p] || ''); });
    row.push(JSON.stringify(data.indicators || {}));

    sh.appendRow(row);
    try { logEvent('INFO','handle360Post','360 response: '+(data.campaign||'')+' / '+(data.stakeholder||'')); } catch(e) {}
    return jsonOut({ ok:true, recordId: data.recordId || '' });
  } catch (err) {
    try { logEvent('ERROR','handle360Post', String(err)); } catch(e) {}
    return jsonOut({ ok:false, error: String(err) });
  }
}

/* Return all responses for a campaign as the dashboard expects: { ok, records: [...] }. */
function read360(campaignId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(CORP_SHEET);
    if (!sh || sh.getLastRow() < 2) return jsonOut({ ok:true, records: [] });

    var values = sh.getDataRange().getValues();
    var header = values.shift();
    var idx = {};
    header.forEach(function(name, i){ idx[name] = i; });

    var records = [];
    values.forEach(function(r){
      var camp = r[idx['Campaign ID']];
      if (campaignId && String(camp) !== String(campaignId)) return;

      var pillarScores = {};
      CORP_PILLARS.forEach(function(p){
        var v = r[idx['Pillar: ' + p]];
        pillarScores[p] = (v === '' || v == null) ? null : Number(v);
      });
      var comments = {};
      CORP_PILLARS.forEach(function(p){ comments[p] = r[idx['Comment: ' + p]] || ''; });

      var indicators = {};
      try { indicators = JSON.parse(r[idx['Indicators (JSON)']] || '{}'); } catch (e) {}

      records.push({
        recordId: r[idx['Record ID']],
        sentAt: (r[idx['Timestamp']] instanceof Date) ? r[idx['Timestamp']].toISOString() : String(r[idx['Timestamp']]),
        company: r[idx['Company']],
        campaign: camp,
        stakeholder: r[idx['Stakeholder Group']],
        stakeholderLabel: r[idx['Stakeholder Label']],
        profile: { name: r[idx['Respondent Name']] || '', dept: r[idx['Department / Role']] || '' },
        overallScore: (r[idx['Overall Score']] === '' ? null : Number(r[idx['Overall Score']])),
        band: r[idx['Band']],
        pillarScores: pillarScores,
        comments: comments,
        indicators: indicators
      });
    });
    return jsonOut({ ok:true, records: records });
  } catch (err) {
    return jsonOut({ ok:false, error: String(err), records: [] });
  }
}
