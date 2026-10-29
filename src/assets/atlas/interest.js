'use strict';
window.AtlasInterest = (() => {
  const draftKey = 'skagit-interest-draft';
  const values = {
    'Care': ['Care for people', 'Care for the Earth', 'Wellbeing', 'Belonging', 'Accessibility'],
    'Relationship': ['Reciprocity', 'Trust', 'Mutual support', 'Cooperation', 'Conflict and repair'],
    'Learning': ['Curiosity', 'Experimentation', 'Shared learning', 'Knowledge sharing', 'Skill building'],
    'Self-direction': ['Autonomy', 'Initiative', 'Self-leadership', 'Freedom', 'Responsibility'],
    'Ecological': ['Regeneration', 'Resilience', 'Biodiversity', 'Stewardship', 'Living within limits'],
    'Ways of working': ['Transparency', 'Participation', 'Emergence', 'Practicality', 'Creativity']
  };
  const tags = {
    'Land and ecology': ['Soil', 'Forests', 'Habitat', 'Biodiversity', 'Restoration'],
    'Food': ['Farming', 'Gardening', 'Food access', 'Preservation', 'Distribution'],
    'Water': ['Watersheds', 'Drinking water', 'Rainwater', 'Aquatic ecosystems'],
    'Community': ['Relationships', 'Mutual aid', 'Local networks', 'Gathering'],
    'Making and building': ['Construction', 'Repair', 'Tools', 'Fabrication'],
    'Knowledge and skills': ['Research', 'Education', 'Documentation', 'Traditional knowledge'],
    'Systems and resources': ['Energy', 'Transport', 'Economics', 'Infrastructure'],
    'Creative expression': ['Writing', 'Art', 'Storytelling', 'Design'],
    'Place': ['Neighborhood', 'Farm', 'Watershed', 'Skagit']
  };
  const areas = ['Across the Skagit watershed', 'Anacortes', 'Bay View', 'Big Lake', 'Bow / Edison', 'Burlington', 'Clear Lake', 'Concrete', 'Conway', 'Guemes Island', 'Hamilton', 'La Conner', 'Lyman', 'Marblemount', 'Mount Vernon', 'Rockport', 'Samish Island', 'Sedro-Woolley', 'Upper Skagit / North Cascades', 'Other / not sure yet'];
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  function choices(groups, name) {
    return Object.entries(groups).map(([group, options]) => `<fieldset class="interest-options"><legend>${group}</legend>${options.map(option => `<label class="interest-check"><input type="checkbox" name="${name}" value="${escape(option)}"><span>${option}</span></label>`).join('')}</fieldset>`).join('');
  }
  function page() {
    return `<section class="page-head interest-head"><div class="eyebrow">An invitation begins with an interest</div><h1>Share interest:<br>initiate invitation.</h1><p>An idea, a question, a curiosity. Give it a little shape, and name the place and values that matter to you.</p></section>
    <div class="interest-layout"><form id="interest-form" class="interest-form">
      <section class="interest-section" aria-labelledby="interest-heading"><div class="interest-number">01</div><div><h2 id="interest-heading">The interest</h2><label for="interest-description">What are you interested in?</label><p id="interest-description-help" class="field-help">Describe the idea, question, curiosity, need, or possibility in your own words.</p><textarea id="interest-description" name="interest" rows="5" maxlength="6000" required aria-describedby="interest-description-help" placeholder="I’m curious about…"></textarea></div></section>
      <section class="interest-section" aria-labelledby="interest-name-heading"><div class="interest-number">02</div><div><h2 id="interest-name-heading">Your name</h2><p class="field-question">Who is initiating this interest?</p><div class="interest-identity" aria-live="polite"><span class="avatar" aria-hidden="true">Me</span><div><span id="interest-profile-name">Checking your sign-in…</span><small id="interest-profile-status">Your name comes from your profile.</small></div></div></div></section>
      <section class="interest-section" aria-labelledby="interest-location-heading"><div class="interest-number">03</div><div><h2 id="interest-location-heading">Location</h2><p class="field-question">Where is this interest situated?</p><label for="interest-area">Town / region</label><select id="interest-area" name="area" required><option value="">Choose a Skagit area</option>${areas.map(area => `<option>${escape(area)}</option>`).join('')}</select><label for="interest-place">Specific place <span class="optional">(optional)</span></label><input id="interest-place" name="place" maxlength="240" aria-describedby="interest-place-help" placeholder="A gathering place, venue, or meeting location"><p class="field-help" id="interest-place-help">A place name is enough. Add a street address only if it is useful to this interest.</p></div></section>
      <section class="interest-section" aria-labelledby="interest-values-heading"><div class="interest-number">04</div><div><h2 id="interest-values-heading">Values</h2><p class="field-question">What values are important to this interest?</p><p class="field-help">Select any that fit. Add others if needed.</p><div class="interest-choice-grid">${choices(values, 'values')}</div><label for="interest-other-values">Other values <span class="optional">(optional)</span></label><input id="interest-other-values" name="otherValues" maxlength="500" placeholder="Add values, separated by commas"></div></section>
      <section class="interest-section" aria-labelledby="interest-tags-heading"><div class="interest-number">05</div><div><h2 id="interest-tags-heading">Key tags</h2><p class="field-question">What is this interest about?</p><p class="field-help">Select any that fit. Add more specific tags as needed.</p><div class="interest-choice-grid">${choices(tags, 'tags')}</div><label for="interest-other-tags">Other tags <span class="optional">(optional)</span></label><input id="interest-other-tags" name="otherTags" maxlength="500" placeholder="Add topics, separated by commas"></div></section>
      <div class="interest-actions"><button type="submit" class="button">Save interest draft</button><a href="#atlas">Return to the watershed ↗</a><p id="interest-save-status" role="status">This draft stays in this browser. Saving does not send or publish an invitation.</p></div>
    </form><aside class="interest-aside"><div class="eyebrow">Room for a beginning</div><h3>It doesn’t have to<br>be a plan yet.</h3><p>An interest can begin with something you notice, something you need, or something you would like to explore with others.</p><div class="interest-aside-note"><span class="eyebrow">What matters to you</span><p>Values describe how you want to approach the interest. Tags help name what it is about.</p></div><div class="interest-aside-note"><span class="eyebrow">For now, a draft</span><p>Keep it here and return when you’re ready. This form is part of the Atlas preview.</p></div></aside></div>`;
  }
  function mount() {
    const form = document.getElementById('interest-form');
    if (!form) return;
    const status = document.getElementById('interest-save-status');
    let draft;
    try { draft = JSON.parse(localStorage.getItem(draftKey)); } catch { /* No usable saved draft. */ }
    if (draft && draft.version === 1) {
      for (const name of ['interest', 'area', 'place', 'otherValues', 'otherTags']) {
        if (typeof draft[name] === 'string') form.elements.namedItem(name).value = draft[name];
      }
      for (const name of ['values', 'tags']) {
        const selected = Array.isArray(draft[name]) ? draft[name] : [];
        form.querySelectorAll(`input[name="${name}"]`).forEach(input => { input.checked = selected.includes(input.value); });
      }
      status.textContent = 'Your saved draft is restored. Nothing has been sent or published.';
    }
    form.addEventListener('input', () => { status.textContent = 'Changes not yet saved. Save the draft before leaving this page.'; });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const description = form.elements.namedItem('interest');
      if (!description.value.trim()) {
        description.setCustomValidity('Describe the interest in your own words.');
        description.reportValidity();
        description.addEventListener('input', () => description.setCustomValidity(''), {once: true});
        return;
      }
      const payload = {version: 1, savedAt: new Date().toISOString()};
      for (const name of ['interest', 'area', 'place', 'otherValues', 'otherTags']) payload[name] = String(data.get(name) || '').trim();
      for (const name of ['values', 'tags']) payload[name] = data.getAll(name);
      // Profile identity is displayed from the session, never copied into a shared browser draft.
      try {
        localStorage.setItem(draftKey, JSON.stringify(payload));
        status.textContent = 'Interest draft saved in this browser. No invitation has been sent or published.';
      } catch {
        status.textContent = 'This browser could not save the draft. Your entries are still here; copy them before leaving.';
      }
    });
    const name = document.getElementById('interest-profile-name');
    const identityStatus = document.getElementById('interest-profile-status');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    fetch('/api/profile', {credentials: 'same-origin', headers: {Accept: 'application/json'}, signal: controller.signal})
      .then(response => { if (!response.ok) throw new Error('Profile unavailable'); return response.json(); })
      .then(profile => {
        if (!name.isConnected) return;
        if (profile.authenticated === true && profile.user) {
          name.textContent = profile.user.display_name || 'You';
          identityStatus.textContent = 'You · signed in';
        } else {
          name.textContent = 'You · not signed in';
          identityStatus.innerHTML = '<a href="/login/">Sign in to use your profile name ↗</a>. You can still save a draft.';
        }
      }).catch(() => {
        if (!name.isConnected) return;
        name.textContent = 'You';
        identityStatus.textContent = 'Sign-in is unavailable in this preview. Your profile name will appear when connected.';
      }).finally(() => clearTimeout(timeout));
  }
  return {page, mount};
})();
