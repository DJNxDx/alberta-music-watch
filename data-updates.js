window.AMW_DATA_UPDATES = {
  meta: {
    version: "1.6.2",
    lastUpdated: "June 1, 2026",
    currentFinding: "Alberta has moved from announcement to hiring, reviewed public submissions are entering the evidence workflow, and partner deliverables plus existing funding rules remain exposed."
  },
  sources: [
    {
      id: "cbc-edmonton-am-may1",
      title: "Alberta's new Music Action Plan aims to supercharge the local industry",
      publisher: "CBC Edmonton AM",
      type: "Radio segment",
      date: "May 1, 2026",
      url: "https://www.cbc.ca/listen/live-radio/1-17-edmonton-am/clip/16212190-albertas-music-action-plan-aims-supercharge-local-industry",
      note: "CBC Listen metadata confirms a public Edmonton AM segment about the Action Plan. Speaker-level claims should be treated as unverified unless the audio or a transcript confirms them."
    }
  ],
  briefItems: [
    {
      date: "June 1, 2026",
      label: "Evidence intake",
      title: "CBC segment enters the reviewed evidence workflow",
      summary: "A public evidence submission pointed to a CBC Edmonton AM segment from May 1, 2026 titled \"Alberta's new Music Action Plan aims to supercharge the local industry.\" The review verified the CBC title, date, show, and link, but not the submitted characterization of who was interviewed or what was said.",
      finding: "This is useful contextual evidence of public rollout framing. It should not be used to prove ministerial statements, funding details, partner deliverables, or industry outcomes unless the audio or a transcript is reviewed.",
      sourceIds: ["cbc-edmonton-am-may1", "action-plan"]
    }
  ]
};

(function applyAmwDataUpdates() {
  const data = window.AMW_DATA;
  const updates = window.AMW_DATA_UPDATES;
  if (!data || !updates) return;

  if (updates.meta) {
    data.meta = { ...data.meta, ...updates.meta };
  }

  appendUnique(data.sources, updates.sources, (source) => source.id);
  prependUnique(data.briefItems, updates.briefItems, (item) => `${item.date}|${item.title}`);
  prependUnique(data.reactions, updates.reactions, (item) => `${item.label}|${item.title}`);
  appendUnique(data.funding, updates.funding, (item) => item.label);
  appendUnique(data.promises, updates.promises, (item) => item.id);
  appendUnique(data.timeline, updates.timeline, (item) => `${item.date}|${item.title}`);
  appendUnique(data.entities, updates.entities, (item) => item.id);
})();

function appendUnique(target = [], additions = [], keyFor) {
  if (!Array.isArray(additions) || additions.length === 0) return;
  const existing = new Set(target.map(keyFor).filter(Boolean));
  for (const item of additions) {
    const key = keyFor(item);
    if (key && !existing.has(key)) {
      target.push(item);
      existing.add(key);
    }
  }
}

function prependUnique(target = [], additions = [], keyFor) {
  if (!Array.isArray(additions) || additions.length === 0) return;
  const existing = new Set(target.map(keyFor).filter(Boolean));
  for (const item of additions.slice().reverse()) {
    const key = keyFor(item);
    if (key && !existing.has(key)) {
      target.unshift(item);
      existing.add(key);
    }
  }
}
