window.AMW_DATA_UPDATES = {
  meta: {
    version: "1.6.3",
    lastUpdated: "June 2, 2026",
    currentFinding: "Alberta has moved from announcement to hiring, reviewed public submissions and named stakeholder reactions are sharpening the policy tests, and partner deliverables plus existing funding rules remain exposed."
  },
  sources: [
    {
      id: "jinting-zhao-linkedin-may26",
      title: "The Alberta Music Action Plan is an Invitation, Not a Solution",
      publisher: "Jinting Zhao / LinkedIn",
      type: "Named stakeholder commentary",
      date: "May 26, 2026",
      url: "https://ca.linkedin.com/in/jintingzhao",
      note: "Public LinkedIn profile metadata identifies Zhao as founder of SHE-Q Audio and shows May 2026 Action Plan and Music Commissioner commentary. Use as stakeholder framing, not as official evidence of government action."
    },
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
      date: "June 2, 2026",
      label: "Stakeholder reaction",
      title: "Commissioner role is being judged as policy capacity",
      summary: "A public LinkedIn profile and activity record for Jinting Zhao, founder of SHE-Q Audio, frames the Music Commissioner role as more than a symbolic scene-ambassador job and points to investment, touring and live music, recording infrastructure, intellectual property and export, workforce pipelines, artist and industry development, cross-sector collaboration, and policy as practical tests.",
      finding: "This is named stakeholder commentary, not evidence of appointment or program delivery. It does, however, sharpen what the audit should watch after the June 8 competition closes: whether the Commissioner can translate sector realities into public policy, investment, and measurable workplan commitments.",
      sourceIds: ["jinting-zhao-linkedin-may26", "job-posting", "action-plan"]
    },
    {
      date: "June 1, 2026",
      label: "Evidence intake",
      title: "CBC segment enters the reviewed evidence workflow",
      summary: "A public evidence submission pointed to a CBC Edmonton AM segment from May 1, 2026 titled \"Alberta's new Music Action Plan aims to supercharge the local industry.\" The review verified the CBC title, date, show, and link, but not the submitted characterization of who was interviewed or what was said.",
      finding: "This is useful contextual evidence of public rollout framing. It should not be used to prove ministerial statements, funding details, partner deliverables, or industry outcomes unless the audio or a transcript is reviewed.",
      sourceIds: ["cbc-edmonton-am-may1", "action-plan"]
    }
  ],
  reactions: [
    {
      label: "Stakeholder framing",
      title: "The Commissioner is being judged as policy capacity",
      summary: "Jinting Zhao's public LinkedIn activity frames the Music Commissioner role around policy translation, investment, touring, recording infrastructure, IP/export, workforce pipelines, and sustained sector engagement. That is stakeholder expectation, not government delivery evidence.",
      sourceIds: ["jinting-zhao-linkedin-may26", "job-posting", "action-plan"]
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
