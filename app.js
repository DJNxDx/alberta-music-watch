(function () {
  const data = window.AMW_DATA;
  const sourceMap = new Map(data.sources.map((source) => [source.id, source]));

  const state = {
    promiseStatus: "All",
    promiseSearch: "",
    entityType: "All",
    sourceType: "All",
    sourceSearch: "",
    briefPage: 0
  };

  const statusClass = (status) => status.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const moneyMax = Math.max(...data.funding.map((item) => item.amount));
  const briefPageSize = 6;

  function sourceLinks(ids) {
    if (!ids || ids.length === 0) {
      return '<span class="source-pill muted">No public source yet</span>';
    }

    return ids
      .map((id) => {
        const source = sourceMap.get(id);
        if (!source) return "";
        return `<a class="source-pill" href="${source.url}" target="_blank" rel="noreferrer">${source.title}</a>`;
      })
      .join("");
  }

  function renderBrief() {
    const briefGrid = document.getElementById("briefGrid");
    const briefCount = document.getElementById("briefCount");
    const briefPagination = document.getElementById("briefPagination");
    const lastUpdated = document.getElementById("lastUpdated");
    lastUpdated.textContent = data.meta.lastUpdated;

    const items = data.briefItems || [];
    const totalPages = Math.max(1, Math.ceil(items.length / briefPageSize));
    state.briefPage = Math.min(state.briefPage, totalPages - 1);

    const start = state.briefPage * briefPageSize;
    const pageItems = items.slice(start, start + briefPageSize);
    const end = start + pageItems.length;
    briefCount.textContent = items.length === 0 ? "No brief records yet" : `Showing ${start + 1}-${end} of ${items.length}`;

    briefGrid.innerHTML = pageItems
      .map(
        (item) => `
          <article class="brief-card">
            <div class="card-topline">
              <span>${item.label}</span>
              <time>${item.date}</time>
            </div>
            <h3>${item.title}</h3>
            <p>${item.summary}</p>
            <strong>${item.finding}</strong>
            <div class="source-row">${sourceLinks(item.sourceIds)}</div>
          </article>
        `
      )
      .join("");

    if (pageItems.length === 0) {
      briefGrid.innerHTML = '<p class="empty-state">No brief records are available yet.</p>';
    }

    if (totalPages <= 1) {
      briefPagination.innerHTML = "";
      return;
    }

    const pageButtons = Array.from({ length: totalPages }, (_, index) => {
      const label = index + 1;
      return `<button type="button" class="${index === state.briefPage ? "active" : ""}" data-page="${index}" aria-label="Brief page ${label}">${label}</button>`;
    }).join("");

    briefPagination.innerHTML = `
      <button type="button" data-page="${state.briefPage - 1}" ${state.briefPage === 0 ? "disabled" : ""}>Newer</button>
      ${pageButtons}
      <button type="button" data-page="${state.briefPage + 1}" ${state.briefPage >= totalPages - 1 ? "disabled" : ""}>Older</button>
    `;

    briefPagination.querySelectorAll("button:not([disabled])").forEach((button) => {
      button.addEventListener("click", () => {
        state.briefPage = Number(button.dataset.page);
        renderBrief();
        document.getElementById("brief").scrollIntoView({ block: "start" });
      });
    });
  }

  function renderRatings() {
    const ratings = document.getElementById("ratings");
    ratings.innerHTML = data.ratings
      .map(
        (item) => `
          <article class="rating-card">
            <div class="rating-heading">
              <h3>${item.label}</h3>
              <span>${item.status}</span>
            </div>
            <div class="bar-track" aria-label="${item.score} percent">
              <span style="width: ${item.score}%"></span>
            </div>
            <p>${item.rationale}</p>
          </article>
        `
      )
      .join("");
  }

  function renderPromiseFilters() {
    const statuses = ["All", ...Array.from(new Set(data.promises.map((promise) => promise.status)))];
    const filters = document.getElementById("promiseFilters");
    filters.innerHTML = statuses
      .map(
        (status) => `
          <button type="button" class="${state.promiseStatus === status ? "active" : ""}" data-status="${status}">
            ${status}
          </button>
        `
      )
      .join("");

    filters.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.promiseStatus = button.dataset.status;
        renderPromiseFilters();
        renderPromises();
      });
    });
  }

  function renderPromises() {
    const grid = document.getElementById("promiseGrid");
    const query = state.promiseSearch.trim().toLowerCase();
    const filtered = data.promises.filter((promise) => {
      const statusMatch = state.promiseStatus === "All" || promise.status === state.promiseStatus;
      const haystack = `${promise.id} ${promise.priority} ${promise.title} ${promise.officialAction} ${promise.auditQuestion}`.toLowerCase();
      return statusMatch && (!query || haystack.includes(query));
    });

    grid.innerHTML = filtered
      .map(
        (promise) => `
          <article class="promise-card">
            <div class="promise-meta">
              <span>${promise.priority} / Action ${promise.id}</span>
              <span class="tag ${statusClass(promise.status)}">${promise.status}</span>
            </div>
            <h3>${promise.title}</h3>
            <p class="timing">${promise.timing}</p>
            <p>${promise.officialAction}</p>
            <details>
              <summary>Evidence and audit question</summary>
              <div class="detail-content">
                <p><strong>Evidence:</strong> ${promise.evidence}</p>
                <p><strong>Audit question:</strong> ${promise.auditQuestion}</p>
                <p><strong>Risk:</strong> ${promise.risk}</p>
                <div class="source-row">${sourceLinks(promise.sourceIds)}</div>
              </div>
            </details>
          </article>
        `
      )
      .join("");

    if (filtered.length === 0) {
      grid.innerHTML = '<p class="empty-state">No actions match the current filters.</p>';
    }
  }

  function renderFunding() {
    const bars = document.getElementById("fundingBars");
    bars.innerHTML = data.funding
      .map((item) => {
        const width = item.amount === 0 ? 4 : Math.max(8, Math.round((item.amount / moneyMax) * 100));
        return `
          <article class="funding-row">
            <div class="funding-copy">
              <span class="tag ${statusClass(item.status)}">${item.status}</span>
              <h3>${item.label}</h3>
              <p>${item.detail}</p>
              <div class="source-row">${sourceLinks(item.sourceIds)}</div>
            </div>
            <div class="funding-visual">
              <strong>${item.display}</strong>
              <div class="bar-track money" aria-label="${item.display}">
                <span style="width: ${width}%"></span>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    document.getElementById("fundingQuestions").innerHTML = data.fundingQuestions
      .map((question) => `<li>${question}</li>`)
      .join("");
  }

  function renderTimeline() {
    document.getElementById("commissionTimeline").innerHTML = data.timeline
      .map(
        (item) => `
          <article class="timeline-item">
            <time>${item.date}</time>
            <h3>${item.title}</h3>
            <p>${item.summary}</p>
          </article>
        `
      )
      .join("");
  }

  function renderEntityFilters() {
    const types = ["All", ...Array.from(new Set(data.entities.map((entity) => entity.type)))];
    const filters = document.getElementById("entityFilters");
    filters.innerHTML = types
      .map(
        (type) => `
          <button type="button" class="${state.entityType === type ? "active" : ""}" data-type="${type}">
            ${type}
          </button>
        `
      )
      .join("");

    filters.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.entityType = button.dataset.type;
        renderEntityFilters();
        renderEntities();
      });
    });
  }

  function renderEntities() {
    const board = document.getElementById("relationshipBoard");
    const entities = data.entities.filter((entity) => state.entityType === "All" || entity.type === state.entityType);
    board.innerHTML = entities
      .map(
        (entity) => `
          <button class="entity-node" type="button" data-id="${entity.id}">
            <span>${entity.type}</span>
            <strong>${entity.name}</strong>
          </button>
        `
      )
      .join("");

    board.querySelectorAll(".entity-node").forEach((node) => {
      node.addEventListener("click", () => {
        const entity = data.entities.find((item) => item.id === node.dataset.id);
        renderEntityDetail(entity);
      });
    });
  }

  function renderEntityDetail(entity) {
    const detail = document.getElementById("entityDetail");
    if (!entity) return;

    const linkedNames = entity.links
      .map((id) => data.entities.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => `<span>${item.name}</span>`)
      .join("");

    detail.innerHTML = `
      <span class="tag">${entity.type}</span>
      <h3>${entity.name}</h3>
      <p>${entity.role}</p>
      <div class="accountability-box">
        <strong>Accountability question</strong>
        <span>${entity.accountability}</span>
      </div>
      <div class="linked-entities">${linkedNames}</div>
    `;
  }

  function renderReactions() {
    document.getElementById("reactionGrid").innerHTML = data.reactions
      .map(
        (item) => `
          <article class="reaction-card">
            <span class="metric-label">${item.label}</span>
            <h3>${item.title}</h3>
            <p>${item.summary}</p>
            <div class="source-row">${sourceLinks(item.sourceIds)}</div>
          </article>
        `
      )
      .join("");
  }

  function renderSourceFilters() {
    const types = ["All", ...Array.from(new Set(data.sources.map((source) => source.type)))];
    const filters = document.getElementById("sourceFilters");
    filters.innerHTML = types
      .map(
        (type) => `
          <button type="button" class="${state.sourceType === type ? "active" : ""}" data-type="${type}">
            ${type}
          </button>
        `
      )
      .join("");

    filters.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.sourceType = button.dataset.type;
        renderSourceFilters();
        renderSources();
      });
    });
  }

  function renderSources() {
    const grid = document.getElementById("sourceGrid");
    const query = state.sourceSearch.trim().toLowerCase();
    const filtered = data.sources.filter((source) => {
      const typeMatch = state.sourceType === "All" || source.type === state.sourceType;
      const haystack = `${source.title} ${source.publisher} ${source.type} ${source.note}`.toLowerCase();
      return typeMatch && (!query || haystack.includes(query));
    });

    grid.innerHTML = filtered
      .map(
        (source) => `
          <article class="source-card">
            <span class="tag">${source.type}</span>
            <h3>${source.title}</h3>
            <p>${source.note}</p>
            <dl>
              <div>
                <dt>Publisher</dt>
                <dd>${source.publisher}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>${source.date}</dd>
              </div>
            </dl>
            <a class="button secondary" href="${source.url}" target="_blank" rel="noreferrer">Open source</a>
          </article>
        `
      )
      .join("");

    if (filtered.length === 0) {
      grid.innerHTML = '<p class="empty-state">No sources match the current filters.</p>';
    }
  }

  function renderDeadline() {
    const deadlineEl = document.querySelector("[data-deadline]");
    const numberEl = document.getElementById("deadlineNumber");
    const labelEl = document.getElementById("deadlineLabel");
    const deadline = new Date(deadlineEl.dataset.deadline);
    const now = new Date();
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    if (Number.isNaN(diffDays)) {
      numberEl.textContent = "--";
      return;
    }

    if (diffDays > 0) {
      numberEl.textContent = diffDays;
      labelEl.textContent = diffDays === 1 ? "day until posting closes" : "days until posting closes";
    } else {
      numberEl.textContent = "Closed";
      labelEl.textContent = "posting closed on June 8, 2026";
      deadlineEl.classList.add("closed");
    }
  }

  function bindControls() {
    document.getElementById("promiseSearch").addEventListener("input", (event) => {
      state.promiseSearch = event.target.value;
      renderPromises();
    });

    document.getElementById("sourceSearch").addEventListener("input", (event) => {
      state.sourceSearch = event.target.value;
      renderSources();
    });

    document.getElementById("downloadData").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "alberta-music-watch-data.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    });

    document.getElementById("evidenceForm").addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      const formData = new FormData(form);
      const title = document.getElementById("evidenceTitle").value.trim();
      const links = document.getElementById("evidenceLinks").value.trim();
      const claim = document.getElementById("evidenceClaim").value.trim();
      const relevance = document.getElementById("evidenceRelevance").value;
      const weight = document.getElementById("evidenceWeight").value;
      const submitter = document.getElementById("evidenceSubmitter").value.trim() || "Not provided";
      const publicRecord = document.getElementById("evidencePublic").checked ? "Yes" : "No";
      const note = document.getElementById("evidenceFormNote");
      const endpoint = data.meta.evidenceEndpoint;
      const files = Array.from(document.getElementById("evidenceDocuments").files || []);

      if (links === "" && files.length === 0) {
        note.textContent = "Add at least one public source link or source document.";
        return;
      }

      const issueTitle = `[Evidence] ${title}`;
      const body = [
        "## Evidence submission",
        "",
        `**Source or organization:** ${title}`,
        `**Relevance:** ${relevance}`,
        `**Suggested weight:** ${weight}`,
        `**Submitter context:** ${submitter}`,
        `**Public/shareable material:** ${publicRecord}`,
        "",
        "## Source links",
        links
          .split(/\n+/)
          .map((link) => `- ${link.trim()}`)
          .join("\n"),
        "",
        "## What the audit should understand",
        claim,
        "",
        "## Daily audit handling",
        "- Verify source authenticity and publication date.",
        "- Decide whether the source should be added to data.js, a local source archive, an entity profile, a funding question, or the daily brief.",
        "- Keep claims separate from verified evidence.",
        "",
        `Submitted from Alberta Music Watch on ${new Date().toISOString()}`
      ].join("\n");

      const issueUrl = new URL("https://github.com/DJNxDx/alberta-music-watch/issues/new");
      issueUrl.searchParams.set("title", issueTitle);
      issueUrl.searchParams.set("body", body);

      if (endpoint) {
        note.textContent = "Submitting evidence to the intake queue.";
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            body: formData
          });
          const result = await response.json();

          if (!response.ok || !result.ok) {
            throw new Error(result.error || "Submission failed.");
          }

          const issueText = result.issueUrl ? ` GitHub queue item: ${result.issueUrl}` : "";
          note.textContent = `Evidence received. Reference: ${result.submissionId}.${issueText}`;
          form.reset();
          return;
        } catch (error) {
          if (files.length > 0) {
            note.textContent = "The upload endpoint is not available yet. Submit public document links for now, or try again after the backend is deployed.";
            return;
          }
          note.textContent = "The intake endpoint is not available yet. Opening the GitHub evidence queue instead.";
        }
      } else {
        note.textContent = "Opening the GitHub evidence queue for review and submission.";
      }

      window.open(issueUrl.toString(), "_blank", "noopener,noreferrer");
    });
  }

  function init() {
    renderDeadline();
    renderBrief();
    renderRatings();
    renderPromiseFilters();
    renderPromises();
    renderFunding();
    renderTimeline();
    renderEntityFilters();
    renderEntities();
    renderEntityDetail(data.entities.find((entity) => entity.id === "commissioner"));
    renderReactions();
    renderSourceFilters();
    renderSources();
    bindControls();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
